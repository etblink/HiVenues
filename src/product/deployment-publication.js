'use strict';

const net = require('node:net');

const DOMAIN_STATES = Object.freeze([
  'domain-unconfigured',
  'dns-instructions-ready',
  'dns-pending',
  'dns-confirmed',
  'dns-mismatch',
]);

const TLS_STATES = Object.freeze([
  'unconfigured',
  'awaiting-dns',
  'ready-for-request',
  'requesting',
  'verified',
  'degraded',
]);

const PUBLIC_READBACK_STATES = Object.freeze([
  'unverified',
  'verified',
  'mismatch',
  'unreachable',
]);

const DNS_TYPES = new Set(['A', 'AAAA', 'CNAME']);
const SHA1_PATTERN = /^[a-f0-9]{40}$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;

function publicationError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeHostname(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/\.$/, '');
  if (!raw || raw.length > 253 || raw.includes('://') || /[\s/:?#@]/.test(raw)) {
    throw publicationError('DEPLOYMENT_DOMAIN_HOSTNAME_INVALID', 'Domain hostname is invalid.');
  }
  const labels = raw.split('.');
  if (labels.length < 2 || labels.some((label) => (
    !label
    || label.length > 63
    || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
  ))) {
    throw publicationError('DEPLOYMENT_DOMAIN_HOSTNAME_INVALID', 'Domain hostname is invalid.');
  }
  return raw;
}

function normalizeDnsValue(type, value) {
  const raw = String(value || '').trim();
  if (type === 'A') {
    if (net.isIP(raw) !== 4) {
      throw publicationError('DEPLOYMENT_DNS_RECORD_INVALID', 'A record value must be an IPv4 address.');
    }
    return raw;
  }
  if (type === 'AAAA') {
    if (net.isIP(raw) !== 6) {
      throw publicationError('DEPLOYMENT_DNS_RECORD_INVALID', 'AAAA record value must be an IPv6 address.');
    }
    return raw.toLowerCase();
  }
  if (type === 'CNAME') return normalizeHostname(raw);
  throw publicationError('DEPLOYMENT_DNS_RECORD_INVALID', 'DNS record type is not supported.');
}

function normalizeDnsRecord(record) {
  const type = String(record?.type || '').trim().toUpperCase();
  if (!DNS_TYPES.has(type)) {
    throw publicationError('DEPLOYMENT_DNS_RECORD_INVALID', 'DNS record type is not supported.');
  }
  const name = normalizeHostname(record?.name);
  const values = [...new Set((record?.values || []).map((value) => normalizeDnsValue(type, value)))].sort();
  if (!values.length) {
    throw publicationError('DEPLOYMENT_DNS_RECORD_INVALID', 'DNS record requires at least one value.');
  }
  if (type === 'CNAME' && values.length !== 1) {
    throw publicationError('DEPLOYMENT_DNS_RECORD_INVALID', 'CNAME record requires exactly one value.');
  }
  return Object.freeze({ type, name, values: Object.freeze(values) });
}

function mergeDnsRecords(records) {
  const merged = new Map();
  for (const item of records || []) {
    const record = normalizeDnsRecord(item);
    const key = record.type + ':' + record.name;
    if (merged.has(key)) {
      merged.set(key, normalizeDnsRecord({
        type: record.type,
        name: record.name,
        values: [...merged.get(key).values, ...record.values],
      }));
    } else {
      merged.set(key, record);
    }
  }
  return [...merged.values()].sort((left, right) => (
    (left.type + ':' + left.name).localeCompare(right.type + ':' + right.name)
  ));
}

function destinationRecord(hostname, destination) {
  const kind = String(destination?.kind || '').trim().toLowerCase();
  const value = String(destination?.value || '').trim();
  if (kind === 'ipv4') return normalizeDnsRecord({ type: 'A', name: hostname, values: [value] });
  if (kind === 'ipv6') return normalizeDnsRecord({ type: 'AAAA', name: hostname, values: [value] });
  if (kind === 'hostname') return normalizeDnsRecord({ type: 'CNAME', name: hostname, values: [value] });
  throw publicationError('DEPLOYMENT_DOMAIN_DESTINATION_INVALID', 'Domain destination is invalid.');
}

function createDomainPreflight({ hostname, destinations } = {}) {
  const normalizedHostname = normalizeHostname(hostname);
  const list = Array.isArray(destinations) ? destinations : [];
  if (!list.length) {
    throw publicationError('DEPLOYMENT_DOMAIN_DESTINATION_INVALID', 'At least one domain destination is required.');
  }
  const requirements = mergeDnsRecords(list.map((item) => destinationRecord(normalizedHostname, item)));
  const hasCname = requirements.some((record) => record.type === 'CNAME');
  if (hasCname && requirements.length !== 1) {
    throw publicationError('DEPLOYMENT_DNS_RECORD_INVALID', 'CNAME cannot be combined with A or AAAA requirements.');
  }
  return Object.freeze({
    version: 1,
    hostname: normalizedHostname,
    domainState: 'dns-instructions-ready',
    dns: Object.freeze({
      mode: 'guided-handoff',
      requirements: Object.freeze(requirements),
      observation: null,
    }),
    tls: Object.freeze({ state: 'awaiting-dns', observation: null }),
    publicReadBack: Object.freeze({
      state: 'unverified',
      observation: null,
      mismatchFields: Object.freeze([]),
    }),
  });
}

function relevantObservedRecords(preflight, records) {
  const keys = new Set(preflight.dns.requirements.map((record) => record.type + ':' + record.name));
  return mergeDnsRecords(records).filter((record) => keys.has(record.type + ':' + record.name));
}

function recordKey(record) {
  return record.type + ':' + record.name + ':' + record.values.join(',');
}

function dnsMatches(requirements, observed) {
  const left = requirements.map(recordKey).sort();
  const right = observed.map(recordKey).sort();
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function requireIsoTime(value, code, label) {
  const text = String(value || '').trim();
  const timestamp = Date.parse(text);
  if (!text || !Number.isFinite(timestamp)) {
    throw publicationError(code, label + ' timestamp is invalid.');
  }
  return { text, timestamp };
}

function recordDnsObservation(preflight, { records, checkedAt, resolver = '' } = {}) {
  requirePreflight(preflight);
  const checked = requireIsoTime(checkedAt, 'DEPLOYMENT_DNS_OBSERVATION_INVALID', 'DNS observation');
  const observed = relevantObservedRecords(preflight, records);
  const matches = dnsMatches(preflight.dns.requirements, observed);
  const domainState = matches ? 'dns-confirmed' : 'dns-mismatch';
  return Object.freeze({
    ...preflight,
    domainState,
    dns: Object.freeze({
      ...preflight.dns,
      observation: Object.freeze({
        checkedAt: checked.text,
        resolver: String(resolver || '').trim(),
        records: Object.freeze(observed),
        matches,
      }),
    }),
    tls: Object.freeze({
      state: matches ? 'ready-for-request' : 'awaiting-dns',
      observation: null,
    }),
    publicReadBack: Object.freeze({
      state: 'unverified',
      observation: null,
      mismatchFields: Object.freeze([]),
    }),
  });
}

function certificateNameMatches(hostname, names) {
  const host = normalizeHostname(hostname);
  return (names || []).some((value) => {
    const name = String(value || '').trim().toLowerCase().replace(/\.$/, '');
    if (name === host) return true;
    if (!name.startsWith('*.')) return false;
    const suffix = name.slice(2);
    if (!suffix || !host.endsWith('.' + suffix)) return false;
    return host.split('.').length === suffix.split('.').length + 1;
  });
}

function recordTlsObservation(preflight, observation = {}) {
  requirePreflight(preflight);
  if (preflight.domainState !== 'dns-confirmed') {
    throw publicationError('DEPLOYMENT_TLS_DNS_REQUIRED', 'TLS cannot be verified before DNS is confirmed.');
  }
  const checked = requireIsoTime(
    observation.checkedAt,
    'DEPLOYMENT_TLS_OBSERVATION_INVALID',
    'TLS observation',
  );
  const validFrom = requireIsoTime(
    observation.validFrom,
    'DEPLOYMENT_TLS_OBSERVATION_INVALID',
    'TLS certificate start',
  );
  const validTo = requireIsoTime(
    observation.validTo,
    'DEPLOYMENT_TLS_OBSERVATION_INVALID',
    'TLS certificate end',
  );
  const hostname = normalizeHostname(observation.hostname);
  const protocol = String(observation.protocol || '').trim();
  const authorized = observation.authorized === true;
  const exactHost = hostname === preflight.hostname;
  const validWindow = validFrom.timestamp <= checked.timestamp && checked.timestamp <= validTo.timestamp;
  const nameMatches = certificateNameMatches(preflight.hostname, observation.subjectAltNames);
  const protocolOk = /^TLSv1\.[23]$/.test(protocol);
  const verified = authorized && exactHost && validWindow && nameMatches && protocolOk;
  return Object.freeze({
    ...preflight,
    tls: Object.freeze({
      state: verified ? 'verified' : 'degraded',
      observation: Object.freeze({
        hostname,
        authorized,
        protocol,
        subjectAltNames: Object.freeze(
          [...(observation.subjectAltNames || [])].map((item) => String(item)),
        ),
        validFrom: validFrom.text,
        validTo: validTo.text,
        checkedAt: checked.text,
        verified,
      }),
    }),
    publicReadBack: Object.freeze({
      state: 'unverified',
      observation: null,
      mismatchFields: Object.freeze([]),
    }),
  });
}

function requireRuntimeProfile(value) {
  const record = value && typeof value === 'object' ? value : {};
  if (
    !SHA1_PATTERN.test(String(record.sourceSha || ''))
    || !SHA1_PATTERN.test(String(record.sourceTree || ''))
    || !String(record.packageVersion || '').trim()
    || !/^v\d+\.\d+\.\d+$/.test(String(record.nodeVersion || ''))
    || !DIGEST_PATTERN.test(String(record.bundleDigest || ''))
  ) {
    throw publicationError(
      'DEPLOYMENT_PUBLIC_READBACK_EXPECTED_INVALID',
      'Expected runtime profile is invalid.',
    );
  }
  return record;
}

function requireRelease(value) {
  const record = value && typeof value === 'object' ? value : {};
  if (
    !String(record.hostSlug || '').trim()
    || !String(record.releaseId || '').trim()
    || !DIGEST_PATTERN.test(String(record.releaseDigest || ''))
    || !DIGEST_PATTERN.test(String(record.packageDigest || ''))
  ) {
    throw publicationError(
      'DEPLOYMENT_PUBLIC_READBACK_EXPECTED_INVALID',
      'Expected Release identity is invalid.',
    );
  }
  return record;
}

function publicReadBackMismatchFields(actual, expectedRuntime, expectedRelease) {
  const fields = [];
  if (actual?.status !== 'healthy') fields.push('status');
  const checks = [
    ['runtime.sourceSha', actual?.runtime?.sourceSha, expectedRuntime.sourceSha],
    ['runtime.sourceTree', actual?.runtime?.sourceTree, expectedRuntime.sourceTree],
    ['runtime.packageVersion', actual?.runtime?.packageVersion, expectedRuntime.packageVersion],
    ['runtime.nodeVersion', actual?.runtime?.nodeVersion, expectedRuntime.nodeVersion],
    ['runtime.bundleDigest', actual?.runtime?.bundleDigest, expectedRuntime.bundleDigest],
    ['deployment.hostSlug', actual?.deployment?.hostSlug, expectedRelease.hostSlug],
    ['deployment.releaseId', actual?.deployment?.releaseId, expectedRelease.releaseId],
    ['deployment.releaseDigest', actual?.deployment?.releaseDigest, expectedRelease.releaseDigest],
    ['deployment.packageDigest', actual?.deployment?.packageDigest, expectedRelease.packageDigest],
  ];
  for (const [field, actualValue, expectedValue] of checks) {
    if (actualValue !== expectedValue) fields.push(field);
  }
  return fields;
}

function recordPublicReadBack(preflight, observation = {}, expected = {}) {
  requirePreflight(preflight);
  if (preflight.tls?.state !== 'verified') {
    throw publicationError(
      'DEPLOYMENT_PUBLIC_READBACK_TLS_REQUIRED',
      'Public HTTPS read-back requires verified TLS.',
    );
  }
  const checked = requireIsoTime(
    observation.checkedAt,
    'DEPLOYMENT_PUBLIC_READBACK_INVALID',
    'Public read-back',
  );
  let url;
  try {
    url = new URL(String(observation.url || ''));
  } catch {
    throw publicationError(
      'DEPLOYMENT_PUBLIC_READBACK_INVALID',
      'Public read-back URL is invalid.',
    );
  }
  const expectedRuntime = requireRuntimeProfile(expected.runtime);
  const expectedRelease = requireRelease(expected.release);
  const urlMatches = (
    url.protocol === 'https:'
    && url.hostname.toLowerCase() === preflight.hostname
    && (!url.port || url.port === '443')
    && url.pathname === '/__hivenues/health'
    && !url.username
    && !url.password
    && !url.search
    && !url.hash
  );
  const statusMatches = Number(observation.statusCode) === 200;
  const mismatchFields = publicReadBackMismatchFields(
    observation.body,
    expectedRuntime,
    expectedRelease,
  );
  if (!urlMatches) mismatchFields.unshift('url');
  if (!statusMatches) mismatchFields.unshift('http-status');
  const verified = mismatchFields.length === 0;
  return Object.freeze({
    ...preflight,
    publicReadBack: Object.freeze({
      state: verified ? 'verified' : 'mismatch',
      observation: Object.freeze({
        url: url.toString(),
        statusCode: Number(observation.statusCode),
        checkedAt: checked.text,
      }),
      mismatchFields: Object.freeze(mismatchFields),
    }),
  });
}

function prepareStage4LiveReview({ preflight, deployment } = {}) {
  requirePreflight(preflight);
  const state = String(deployment?.state || '');
  if (!['healthy', 'rollback-available'].includes(state) || !deployment?.activeRelease) {
    throw publicationError(
      'DEPLOYMENT_DOMAIN_HEALTHY_REQUIRED',
      'A healthy exact deployment is required before live domain review.',
    );
  }
  return Object.freeze({
    version: 1,
    hostname: preflight.hostname,
    deploymentId: String(deployment.id || ''),
    activeRelease: Object.freeze({ ...deployment.activeRelease }),
    dnsRequirements: preflight.dns.requirements,
    consequences: Object.freeze([
      'publish-or-enter-exact-reviewed-dns-records',
      'verify-dns-observation-before-host-routing',
      'configure-only-the-reviewed-hivenues-hostname-routing',
      'request-and-verify-tls-only-after-dns-confirmation',
      'verify-public-https-exact-runtime-release-readback',
    ]),
    held: Object.freeze([
      'provider-payment',
      'unrelated-dns-records',
      'unrelated-server-configuration',
      'hive-writes',
      'value-movement',
      'customer-host-content-mutation',
    ]),
  });
}

function requirePreflight(value) {
  if (
    !value
    || value.version !== 1
    || normalizeHostname(value.hostname) !== value.hostname
    || !DOMAIN_STATES.includes(value.domainState)
    || !value.dns
    || !Array.isArray(value.dns.requirements)
    || !value.tls
    || !TLS_STATES.includes(value.tls.state)
    || !value.publicReadBack
    || !PUBLIC_READBACK_STATES.includes(value.publicReadBack.state)
  ) {
    throw publicationError(
      'DEPLOYMENT_DOMAIN_PREFLIGHT_INVALID',
      'Domain publication preflight is invalid.',
    );
  }
  mergeDnsRecords(value.dns.requirements);
  return value;
}

module.exports = {
  DOMAIN_STATES,
  TLS_STATES,
  PUBLIC_READBACK_STATES,
  createDomainPreflight,
  normalizeHostname,
  normalizeDnsRecord,
  prepareStage4LiveReview,
  recordDnsObservation,
  recordPublicReadBack,
  recordTlsObservation,
  requirePreflight,
};
