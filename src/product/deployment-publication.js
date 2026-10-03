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

function invalidPreflight(message) {
  throw publicationError(
    'DEPLOYMENT_DOMAIN_PREFLIGHT_INVALID',
    message || 'Domain publication preflight is invalid.',
  );
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

function isPublicIpv4(value) {
  if (net.isIP(value) !== 4) return false;
  const [a, b, c] = value.split('.').map(Number);
  if (
    a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && c === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 192 && b === 88 && c === 99)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224
  ) return false;
  return true;
}

function isPublicIpv6(value) {
  if (net.isIP(value) !== 6) return false;
  const normalized = String(value).toLowerCase();
  const parts = normalized.split(':');
  const first = Number.parseInt(parts[0] || '0', 16);
  const second = Number.parseInt(parts[1] || '0', 16);
  if (!Number.isInteger(first) || first < 0x2000 || first > 0x3fff) return false;
  if (first === 0x2001 && second <= 0x01ff) return false;
  if (first === 0x2001 && second === 0x0db8) return false;
  if (first === 0x3fff && second <= 0x0fff) return false;
  return true;
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
  if (kind === 'ipv4') {
    if (!isPublicIpv4(value)) {
      throw publicationError(
        'DEPLOYMENT_DOMAIN_DESTINATION_NOT_PUBLIC',
        'Domain setup requires a publicly routable IPv4 destination.',
      );
    }
    return normalizeDnsRecord({ type: 'A', name: hostname, values: [value] });
  }
  if (kind === 'ipv6') {
    if (!isPublicIpv6(value)) {
      throw publicationError(
        'DEPLOYMENT_DOMAIN_DESTINATION_NOT_PUBLIC',
        'Domain setup requires a publicly routable IPv6 destination.',
      );
    }
    return normalizeDnsRecord({ type: 'AAAA', name: hostname, values: [value] });
  }
  if (kind === 'hostname') {
    return normalizeDnsRecord({ type: 'CNAME', name: hostname, values: [value] });
  }
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

function sameStringArray(left, right) {
  return (
    Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((item, index) => item === right[index])
  );
}

function exactHealthUrlMatches(hostname, rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl || ''));
  } catch {
    return false;
  }
  return (
    url.protocol === 'https:'
    && url.hostname.toLowerCase() === hostname
    && (!url.port || url.port === '443')
    && url.pathname === '/__hivenues/health'
    && !url.username
    && !url.password
    && !url.search
    && !url.hash
  );
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

function tlsObservationVerified(hostname, observation) {
  if (
    !observation
    || typeof observation !== 'object'
    || !Array.isArray(observation.subjectAltNames)
  ) return false;
  const checked = requireIsoTime(
    observation.checkedAt,
    'DEPLOYMENT_DOMAIN_PREFLIGHT_INVALID',
    'TLS observation',
  );
  const validFrom = requireIsoTime(
    observation.validFrom,
    'DEPLOYMENT_DOMAIN_PREFLIGHT_INVALID',
    'TLS certificate start',
  );
  const validTo = requireIsoTime(
    observation.validTo,
    'DEPLOYMENT_DOMAIN_PREFLIGHT_INVALID',
    'TLS certificate end',
  );
  let observedHostname;
  try {
    observedHostname = normalizeHostname(observation.hostname);
  } catch {
    return false;
  }
  const protocol = String(observation.protocol || '').trim();
  return (
    observation.authorized === true
    && observedHostname === hostname
    && validFrom.timestamp <= checked.timestamp
    && checked.timestamp <= validTo.timestamp
    && certificateNameMatches(hostname, observation.subjectAltNames)
    && /^TLSv1\.[23]$/.test(protocol)
  );
}

function recordDnsObservation(preflight, { records, checkedAt, resolver = '' } = {}) {
  requirePreflight(preflight);
  const checked = requireIsoTime(checkedAt, 'DEPLOYMENT_DNS_OBSERVATION_INVALID', 'DNS observation');
  const observed = relevantObservedRecords(preflight, records);
  const matches = dnsMatches(preflight.dns.requirements, observed);
  const preserveDownstream = matches && preflight.domainState === 'dns-confirmed';
  return Object.freeze({
    ...preflight,
    domainState: matches ? 'dns-confirmed' : 'dns-mismatch',
    dns: Object.freeze({
      ...preflight.dns,
      observation: Object.freeze({
        checkedAt: checked.text,
        resolver: String(resolver || '').trim(),
        records: Object.freeze(observed),
        matches,
      }),
    }),
    tls: matches
      ? (
          preserveDownstream
            ? preflight.tls
            : Object.freeze({ state: 'ready-for-request', observation: null })
        )
      : Object.freeze({ state: 'awaiting-dns', observation: null }),
    publicReadBack: preserveDownstream && preflight.tls.state === 'verified'
      ? preflight.publicReadBack
      : Object.freeze({
          state: 'unverified',
          observation: null,
          mismatchFields: Object.freeze([]),
        }),
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
  if (!Array.isArray(observation.subjectAltNames)) {
    throw publicationError(
      'DEPLOYMENT_TLS_OBSERVATION_INVALID',
      'TLS certificate names are invalid.',
    );
  }
  const normalized = Object.freeze({
    hostname,
    authorized: observation.authorized === true,
    protocol: String(observation.protocol || '').trim(),
    subjectAltNames: Object.freeze(
      [...(observation.subjectAltNames || [])].map((item) => String(item)),
    ),
    validFrom: validFrom.text,
    validTo: validTo.text,
    checkedAt: checked.text,
  });
  const verified = tlsObservationVerified(preflight.hostname, normalized);
  return Object.freeze({
    ...preflight,
    tls: Object.freeze({
      state: verified ? 'verified' : 'degraded',
      observation: Object.freeze({ ...normalized, verified }),
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
  return Object.freeze({
    sourceSha: String(record.sourceSha),
    sourceTree: String(record.sourceTree),
    packageVersion: String(record.packageVersion),
    nodeVersion: String(record.nodeVersion),
    bundleDigest: String(record.bundleDigest),
  });
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
  return Object.freeze({
    hostSlug: String(record.hostSlug),
    releaseId: String(record.releaseId),
    releaseDigest: String(record.releaseDigest),
    packageDigest: String(record.packageDigest),
  });
}

function projectObservedReadBack(body) {
  return Object.freeze({
    status: String(body?.status || ''),
    runtime: Object.freeze({
      sourceSha: String(body?.runtime?.sourceSha || ''),
      sourceTree: String(body?.runtime?.sourceTree || ''),
      packageVersion: String(body?.runtime?.packageVersion || ''),
      nodeVersion: String(body?.runtime?.nodeVersion || ''),
      bundleDigest: String(body?.runtime?.bundleDigest || ''),
    }),
    deployment: Object.freeze({
      hostSlug: String(body?.deployment?.hostSlug || ''),
      releaseId: String(body?.deployment?.releaseId || ''),
      releaseDigest: String(body?.deployment?.releaseDigest || ''),
      packageDigest: String(body?.deployment?.packageDigest || ''),
    }),
  });
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
  const expectedRuntime = requireRuntimeProfile(expected.runtime);
  const expectedRelease = requireRelease(expected.release);
  const observed = projectObservedReadBack(observation.body);
  const mismatchFields = publicReadBackMismatchFields(observed, expectedRuntime, expectedRelease);
  if (!exactHealthUrlMatches(preflight.hostname, observation.url)) mismatchFields.unshift('url');
  if (Number(observation.statusCode) !== 200) mismatchFields.unshift('http-status');
  const verified = mismatchFields.length === 0;
  return Object.freeze({
    ...preflight,
    publicReadBack: Object.freeze({
      state: verified ? 'verified' : 'mismatch',
      observation: Object.freeze({
        url: String(observation.url || ''),
        statusCode: Number(observation.statusCode),
        checkedAt: checked.text,
        observed,
        expected: Object.freeze({
          runtime: expectedRuntime,
          release: expectedRelease,
        }),
      }),
      mismatchFields: Object.freeze(mismatchFields),
    }),
  });
}

function invalidatePublicReadBack(preflight, reason = '') {
  requirePreflight(preflight);
  return Object.freeze({
    ...preflight,
    publicReadBack: Object.freeze({
      state: 'unverified',
      observation: null,
      mismatchFields: Object.freeze([]),
      ...(reason ? { invalidatedReason: String(reason) } : {}),
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

function validateDnsEvidence(value, requirements) {
  const observation = value.dns.observation;
  if (['dns-instructions-ready', 'dns-pending'].includes(value.domainState)) {
    if (observation !== null) invalidPreflight('Unconfirmed DNS state cannot contain a DNS proof.');
    return;
  }
  if (!['dns-confirmed', 'dns-mismatch'].includes(value.domainState) || !observation) {
    invalidPreflight('DNS summary state is not backed by an observation.');
  }
  requireIsoTime(observation.checkedAt, 'DEPLOYMENT_DOMAIN_PREFLIGHT_INVALID', 'DNS observation');
  const records = relevantObservedRecords(value, observation.records);
  const normalizedStored = mergeDnsRecords(observation.records);
  if (
    normalizedStored.length !== records.length
    || normalizedStored.some((record, index) => recordKey(record) !== recordKey(records[index]))
  ) {
    invalidPreflight('DNS observation contains records outside the exact requirement set.');
  }
  const matches = dnsMatches(requirements, records);
  if (observation.matches !== matches) invalidPreflight('DNS match summary contradicts observed records.');
  if (value.domainState === 'dns-confirmed' && !matches) {
    invalidPreflight('DNS confirmed state is not supported by the observation.');
  }
  if (value.domainState === 'dns-mismatch' && matches) {
    invalidPreflight('DNS mismatch state contradicts the observation.');
  }
}

function validateTlsEvidence(value) {
  const state = value.tls.state;
  const observation = value.tls.observation;
  if (state === 'unconfigured') {
    if (observation !== null) invalidPreflight('Unconfigured TLS state cannot contain certificate evidence.');
    return;
  }
  if (state === 'awaiting-dns') {
    if (value.domainState === 'dns-confirmed' || observation !== null) {
      invalidPreflight('Awaiting-DNS TLS state contradicts domain evidence.');
    }
    return;
  }
  if (state === 'ready-for-request' || state === 'requesting') {
    if (value.domainState !== 'dns-confirmed' || observation !== null) {
      invalidPreflight('TLS request state requires confirmed DNS and no certificate proof yet.');
    }
    return;
  }
  if (!observation || value.domainState !== 'dns-confirmed') {
    invalidPreflight('TLS summary state is not backed by confirmed DNS and certificate evidence.');
  }
  const verified = tlsObservationVerified(value.hostname, observation);
  if (observation.verified !== verified) {
    invalidPreflight('TLS verified summary contradicts certificate evidence.');
  }
  if (state === 'verified' && !verified) {
    invalidPreflight('TLS verified state is not supported by certificate evidence.');
  }
  if (state === 'degraded' && verified) {
    invalidPreflight('TLS degraded state contradicts certificate evidence.');
  }
}

function validatePublicReadBackEvidence(value) {
  const state = value.publicReadBack.state;
  const observation = value.publicReadBack.observation;
  const mismatchFields = value.publicReadBack.mismatchFields;
  if (!Array.isArray(mismatchFields)) invalidPreflight('Public read-back mismatch fields are invalid.');
  if (state === 'unverified' || state === 'unreachable') {
    if (observation !== null || mismatchFields.length) {
      invalidPreflight('Unverified public read-back cannot contain proof evidence.');
    }
    return;
  }
  if (!observation || value.tls.state !== 'verified') {
    invalidPreflight('Public read-back proof requires verified TLS and an observation.');
  }
  requireIsoTime(
    observation.checkedAt,
    'DEPLOYMENT_DOMAIN_PREFLIGHT_INVALID',
    'Public read-back',
  );
  const expectedRuntime = requireRuntimeProfile(observation.expected?.runtime);
  const expectedRelease = requireRelease(observation.expected?.release);
  const observed = projectObservedReadBack(observation.observed);
  const recomputed = publicReadBackMismatchFields(observed, expectedRuntime, expectedRelease);
  if (!exactHealthUrlMatches(value.hostname, observation.url)) recomputed.unshift('url');
  if (Number(observation.statusCode) !== 200) recomputed.unshift('http-status');
  if (!sameStringArray(mismatchFields, recomputed)) {
    invalidPreflight('Public read-back summary contradicts the persisted observation.');
  }
  if (state === 'verified' && recomputed.length) {
    invalidPreflight('Verified public read-back is not supported by its observation.');
  }
  if (state === 'mismatch' && !recomputed.length) {
    invalidPreflight('Public read-back mismatch state contradicts its observation.');
  }
}

function requirePreflight(value) {
  if (
    !value
    || value.version !== 1
    || normalizeHostname(value.hostname) !== value.hostname
    || !DOMAIN_STATES.includes(value.domainState)
    || value.domainState === 'domain-unconfigured'
    || !value.dns
    || value.dns.mode !== 'guided-handoff'
    || !Array.isArray(value.dns.requirements)
    || !value.dns.requirements.length
    || !value.tls
    || !TLS_STATES.includes(value.tls.state)
    || !value.publicReadBack
    || !PUBLIC_READBACK_STATES.includes(value.publicReadBack.state)
  ) {
    invalidPreflight();
  }
  const requirements = mergeDnsRecords(value.dns.requirements);
  if (
    requirements.length !== value.dns.requirements.length
    || requirements.some((record, index) => (
      recordKey(record) !== recordKey(normalizeDnsRecord(value.dns.requirements[index]))
      || record.name !== value.hostname
    ))
  ) {
    invalidPreflight('DNS requirements are not canonical for the endpoint hostname.');
  }
  const hasCname = requirements.some((record) => record.type === 'CNAME');
  if (hasCname && requirements.length !== 1) {
    invalidPreflight('CNAME requirements cannot be mixed with address records.');
  }
  validateDnsEvidence(value, requirements);
  validateTlsEvidence(value);
  validatePublicReadBackEvidence(value);
  return value;
}

module.exports = {
  DOMAIN_STATES,
  TLS_STATES,
  PUBLIC_READBACK_STATES,
  createDomainPreflight,
  invalidatePublicReadBack,
  isPublicIpv4,
  isPublicIpv6,
  normalizeHostname,
  normalizeDnsRecord,
  prepareStage4LiveReview,
  recordDnsObservation,
  recordPublicReadBack,
  recordTlsObservation,
  requirePreflight,
};
