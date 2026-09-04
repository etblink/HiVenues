'use strict';

const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

const AUDIT_ARGS = Object.freeze([
  'audit',
  '--omit=dev',
  '--audit-level=high',
  '--json',
]);

const DEFAULT_POLICY = Object.freeze({
  maxAttempts: 3,
  attemptTimeoutMs: 60_000,
  retryDelaysMs: Object.freeze([5_000, 10_000]),
});

const EXIT_CODES = Object.freeze({
  success: 0,
  vulnerability: 1,
  retryExhausted: 2,
  commandError: 3,
});

const TRANSIENT_NETWORK_CODES = new Set([
  'E408',
  'E425',
  'E429',
  'E500',
  'E502',
  'E503',
  'E504',
  'EAI_AGAIN',
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETDOWN',
  'ENETUNREACH',
  'EPIPE',
  'ERR_SOCKET_TIMEOUT',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_SOCKET',
]);

function parseJson(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch (_nestedError) {
      return null;
    }
  }
}

function parseAuditReport(stdout, stderr) {
  return parseJson(stdout) || parseJson(stderr);
}

function thresholdVulnerabilityCount(report) {
  const counts = report?.metadata?.vulnerabilities;
  if (!counts || !Number.isFinite(counts.high) || !Number.isFinite(counts.critical)) {
    return null;
  }
  return counts.high + counts.critical;
}

function compactDetail(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

function errorCode(report, error) {
  const value = report?.error?.code || error?.code;
  return typeof value === 'string' ? value.toUpperCase() : '';
}

function errorText(report, outcome) {
  return [
    report?.error?.code,
    report?.error?.summary,
    report?.error?.detail,
    outcome.error?.code,
    outcome.error?.message,
    outcome.stderr,
    outcome.stdout,
  ]
    .filter(Boolean)
    .join(' ');
}

function isTransientNetworkFailure(code, text) {
  if (TRANSIENT_NETWORK_CODES.has(code) || /^E5\d\d$/.test(code)) return true;

  const value = String(text || '');
  return /\b(?:EAI_AGAIN|ECONNABORTED|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETDOWN|ENETUNREACH|ERR_SOCKET_TIMEOUT|ETIMEDOUT|UND_ERR_[A-Z_]+)\b/i.test(value)
    || /\b(?:HTTP(?: error)?|status(?: code)?|response status)\s*[:=]?\s*(?:408|425|429|5\d\d)\b/i.test(value)
    || /\b(?:408 Request Timeout|429 Too Many Requests|500 Internal Server Error|502 Bad Gateway|503 Service Unavailable|504 Gateway Timeout)\b/i.test(value)
    || /\b(?:fetch failed|network request .* failed|socket hang up|getaddrinfo)\b/i.test(value);
}

function classifyAuditAttempt(outcome) {
  if (outcome.timedOut) {
    return {
      kind: 'timeout',
      retryable: true,
      detail: `attempt exceeded ${outcome.timeoutMs}ms`,
    };
  }

  const report = parseAuditReport(outcome.stdout, outcome.stderr);
  const thresholdCount = thresholdVulnerabilityCount(report);
  if (thresholdCount !== null && thresholdCount > 0) {
    return {
      kind: 'vulnerability',
      retryable: false,
      detail: `${thresholdCount} high-or-critical production vulnerability result(s)`,
    };
  }

  const code = errorCode(report, outcome.error);
  const combinedErrorText = errorText(report, outcome);
  if (isTransientNetworkFailure(code, combinedErrorText)) {
    return {
      kind: 'network_failure',
      retryable: true,
      detail: compactDetail(code || report?.error?.summary || combinedErrorText || 'network failure'),
    };
  }

  if (outcome.exitCode === 0 && thresholdCount === 0 && !report?.error) {
    return {
      kind: 'success',
      retryable: false,
      detail: 'no high-or-critical production vulnerabilities reported',
    };
  }

  return {
    kind: 'command_error',
    retryable: false,
    detail: compactDetail(code || outcome.error?.message || combinedErrorText || `exit ${outcome.exitCode}`),
  };
}

function validatePolicy(policy) {
  if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1) {
    throw new TypeError('maxAttempts must be a positive integer');
  }
  if (!Number.isInteger(policy.attemptTimeoutMs) || policy.attemptTimeoutMs < 1) {
    throw new TypeError('attemptTimeoutMs must be a positive integer');
  }
  if (!Array.isArray(policy.retryDelaysMs) || policy.retryDelaysMs.length < policy.maxAttempts - 1) {
    throw new TypeError('retryDelaysMs must cover every possible retry');
  }
  for (const value of policy.retryDelaysMs) {
    if (!Number.isInteger(value) || value < 0) {
      throw new TypeError('retry delays must be non-negative integers');
    }
  }
}

function policyWorstCaseMs(policy = DEFAULT_POLICY) {
  validatePolicy(policy);
  const retryDelay = policy.retryDelaysMs
    .slice(0, policy.maxAttempts - 1)
    .reduce((total, value) => total + value, 0);
  return (policy.maxAttempts * policy.attemptTimeoutMs) + retryDelay;
}

function spawnCommandAttempt({ command, args, cwd = process.cwd(), env = process.env, timeoutMs }) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, {
        cwd,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (error) {
      resolve({ exitCode: null, signal: null, timedOut: false, timeoutMs, stdout: '', stderr: '', error });
      return;
    }

    let stdout = '';
    let stderr = '';
    let spawnError = null;
    let timedOut = false;
    let settled = false;
    let forceKillTimer = null;

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      spawnError = error;
    });

    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      forceKillTimer = setTimeout(() => {
        if (!settled) child.kill('SIGKILL');
      }, 1_000);
    }, timeoutMs);

    child.on('close', (exitCode, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      resolve({ exitCode, signal, timedOut, timeoutMs, stdout, stderr, error: spawnError });
    });
  });
}

function buildAuditCommand(npmCliPath = process.env.npm_execpath) {
  if (!npmCliPath) {
    throw new Error('npm_execpath is unavailable; run this entrypoint through npm');
  }
  return {
    command: process.execPath,
    args: [npmCliPath, ...AUDIT_ARGS],
  };
}

function spawnAuditAttempt({ timeoutMs }) {
  const command = buildAuditCommand();
  return spawnCommandAttempt({ ...command, timeoutMs });
}

async function runAuditPolicy({
  runAttempt = spawnAuditAttempt,
  sleep = delay,
  policy = DEFAULT_POLICY,
  logger = () => {},
} = {}) {
  validatePolicy(policy);
  const attempts = [];

  for (let index = 0; index < policy.maxAttempts; index += 1) {
    const number = index + 1;
    logger(`[npm-audit] attempt ${number}/${policy.maxAttempts} started (timeout ${policy.attemptTimeoutMs}ms)`);

    let outcome;
    try {
      outcome = await runAttempt({ timeoutMs: policy.attemptTimeoutMs });
    } catch (error) {
      outcome = {
        exitCode: null,
        signal: null,
        timedOut: false,
        timeoutMs: policy.attemptTimeoutMs,
        stdout: '',
        stderr: '',
        error,
      };
    }

    const classification = classifyAuditAttempt(outcome);
    attempts.push({ number, classification, outcome });
    logger(`[npm-audit] attempt ${number}/${policy.maxAttempts}: ${classification.kind} — ${classification.detail}`);

    if (!classification.retryable) {
      return { kind: classification.kind, classification, attempts };
    }

    if (number < policy.maxAttempts) {
      const waitMs = policy.retryDelaysMs[index];
      logger(`[npm-audit] retrying after ${waitMs}ms; no security result has been declared`);
      await sleep(waitMs);
    }
  }

  const lastAttempt = attempts.at(-1);
  return {
    kind: 'retry_exhausted',
    classification: {
      kind: 'retry_exhausted',
      retryable: false,
      detail: `${policy.maxAttempts} bounded attempts exhausted; security result unknown`,
      lastKind: lastAttempt.classification.kind,
    },
    attempts,
  };
}

function writeCapturedFailure(result) {
  const outcome = result.attempts.at(-1)?.outcome;
  if (!outcome) return;
  if (outcome.stdout.trim()) process.stderr.write(`${outcome.stdout.trim()}\n`);
  if (outcome.stderr.trim()) process.stderr.write(`${outcome.stderr.trim()}\n`);
}

async function main() {
  const result = await runAuditPolicy({ logger: (message) => console.error(message) });

  if (result.kind === 'success') {
    console.error(`[npm-audit] PASS after ${result.attempts.length} attempt(s)`);
    return EXIT_CODES.success;
  }

  writeCapturedFailure(result);
  if (result.kind === 'vulnerability') {
    console.error('[npm-audit] FAIL: high-or-critical production vulnerability threshold met');
    return EXIT_CODES.vulnerability;
  }
  if (result.kind === 'retry_exhausted') {
    console.error('[npm-audit] UNAVAILABLE: retries exhausted; this is not a clean security result');
    return EXIT_CODES.retryExhausted;
  }

  console.error(`[npm-audit] ERROR: ${result.classification.detail}`);
  return EXIT_CODES.commandError;
}

if (require.main === module) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`[npm-audit] ERROR: ${error.stack || error.message}`);
      process.exitCode = EXIT_CODES.commandError;
    });
}

module.exports = {
  AUDIT_ARGS,
  DEFAULT_POLICY,
  EXIT_CODES,
  buildAuditCommand,
  classifyAuditAttempt,
  isTransientNetworkFailure,
  main,
  parseAuditReport,
  policyWorstCaseMs,
  runAuditPolicy,
  spawnAuditAttempt,
  spawnCommandAttempt,
  thresholdVulnerabilityCount,
  validatePolicy,
};
