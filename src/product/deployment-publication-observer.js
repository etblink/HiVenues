'use strict';

const dns = require('node:dns').promises;
const https = require('node:https');
const tls = require('node:tls');

function observerError(code, message, cause = null) {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

function normalizeDnsAnswer(type, name, values) {
  const list = [...new Set((values || []).map((value) => String(value).trim()).filter(Boolean))].sort();
  return Object.freeze({
    type,
    name,
    values: Object.freeze(list),
  });
}

function subjectAltNames(certificate) {
  const value = String(certificate?.subjectaltname || '');
  if (!value) return Object.freeze([]);
  return Object.freeze(
    value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.startsWith('DNS:'))
      .map((item) => item.slice(4).trim())
      .filter(Boolean),
  );
}

function isoFromCertificateTime(value) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) {
    throw observerError(
      'DEPLOYMENT_TLS_OBSERVATION_INVALID',
      'The observed TLS certificate contained an invalid validity time.',
    );
  }
  return new Date(timestamp).toISOString();
}

class NodePublicationObserver {
  constructor({
    resolver = dns,
    tlsConnect = tls.connect,
    httpsRequest = https.request,
    now = Date.now,
    timeoutMs = 8000,
    maxBodyBytes = 128 * 1024,
  } = {}) {
    if (!resolver) throw new TypeError('Publication observer requires a DNS resolver.');
    if (typeof tlsConnect !== 'function') throw new TypeError('Publication observer requires a TLS connector.');
    if (typeof httpsRequest !== 'function') throw new TypeError('Publication observer requires an HTTPS requester.');
    this.resolver = resolver;
    this.tlsConnect = tlsConnect;
    this.httpsRequest = httpsRequest;
    this.now = now;
    this.timeoutMs = timeoutMs;
    this.maxBodyBytes = maxBodyBytes;
  }

  async resolveRequirement(requirement) {
    const type = String(requirement?.type || '').toUpperCase();
    const name = String(requirement?.name || '');
    try {
      if (type === 'A') {
        return normalizeDnsAnswer(type, name, await this.resolver.resolve4(name));
      }
      if (type === 'AAAA') {
        return normalizeDnsAnswer(type, name, await this.resolver.resolve6(name));
      }
      if (type === 'CNAME') {
        return normalizeDnsAnswer(type, name, await this.resolver.resolveCname(name));
      }
      throw observerError(
        'DEPLOYMENT_DNS_OBSERVATION_INVALID',
        'The requested DNS observation type is not supported.',
      );
    } catch (error) {
      if (['ENODATA', 'ENOTFOUND', 'ENOENT', 'ENOTIMP'].includes(error?.code)) {
        return normalizeDnsAnswer(type, name, []);
      }
      if (error?.code === 'DEPLOYMENT_DNS_OBSERVATION_INVALID') throw error;
      throw observerError(
        'DEPLOYMENT_DNS_OBSERVATION_UNAVAILABLE',
        'DNS could not be checked right now.',
        error,
      );
    }
  }

  async observeDns(preflight) {
    const requirements = Array.isArray(preflight?.dns?.requirements)
      ? preflight.dns.requirements
      : [];
    if (!requirements.length) {
      throw observerError(
        'DEPLOYMENT_DNS_OBSERVATION_INVALID',
        'DNS observation requires an exact prepared record set.',
      );
    }
    const records = [];
    for (const requirement of requirements) {
      const answer = await this.resolveRequirement(requirement);
      if (answer.values.length) records.push(answer);
    }
    return Object.freeze({
      records: Object.freeze(records),
      checkedAt: new Date(this.now()).toISOString(),
      resolver: 'system-dns',
    });
  }

  observeTls(hostname) {
    const host = String(hostname || '');
    return new Promise((resolve, reject) => {
      let settled = false;
      let socket;
      const finishError = (error) => {
        if (settled) return;
        settled = true;
        try { socket?.destroy(); } catch {}
        reject(observerError(
          'DEPLOYMENT_TLS_OBSERVATION_UNAVAILABLE',
          'The secure endpoint is not ready for TLS verification yet.',
          error,
        ));
      };
      try {
        socket = this.tlsConnect({
          host,
          port: 443,
          servername: host,
          rejectUnauthorized: false,
        });
      } catch (error) {
        finishError(error);
        return;
      }
      socket.setTimeout?.(this.timeoutMs, () => finishError(new Error('TLS observation timed out.')));
      socket.once('error', finishError);
      socket.once('secureConnect', () => {
        if (settled) return;
        try {
          const certificate = socket.getPeerCertificate?.(true) || {};
          const observation = Object.freeze({
            hostname: host,
            authorized: socket.authorized === true,
            protocol: String(socket.getProtocol?.() || ''),
            subjectAltNames: subjectAltNames(certificate),
            validFrom: isoFromCertificateTime(certificate.valid_from),
            validTo: isoFromCertificateTime(certificate.valid_to),
            checkedAt: new Date(this.now()).toISOString(),
          });
          settled = true;
          try { socket.end(); } catch {}
          resolve(observation);
        } catch (error) {
          finishError(error);
        }
      });
    });
  }

  readPublicHealth(hostname) {
    const host = String(hostname || '');
    const requestUrl = 'https://' + host + '/__hivenues/health';
    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (error) => {
        if (settled) return;
        settled = true;
        reject(observerError(
          'DEPLOYMENT_PUBLIC_READBACK_UNAVAILABLE',
          'The public HTTPS health endpoint could not be read.',
          error,
        ));
      };
      let request;
      try {
        request = this.httpsRequest(requestUrl, {
          method: 'GET',
          servername: host,
          rejectUnauthorized: true,
          headers: {
            accept: 'application/json',
            'user-agent': 'HiVenues-Stage4E/1',
          },
        }, (response) => {
          const chunks = [];
          let bytes = 0;
          response.on('data', (chunk) => {
            bytes += chunk.length;
            if (bytes > this.maxBodyBytes) {
              response.destroy(observerError(
                'DEPLOYMENT_PUBLIC_READBACK_TOO_LARGE',
                'The public HTTPS health response exceeded the permitted size.',
              ));
              return;
            }
            chunks.push(Buffer.from(chunk));
          });
          response.once('error', fail);
          response.once('end', () => {
            if (settled) return;
            let body;
            try {
              body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            } catch (error) {
              fail(observerError(
                'DEPLOYMENT_PUBLIC_READBACK_INVALID',
                'The public HTTPS health response was not valid JSON.',
                error,
              ));
              return;
            }
            settled = true;
            resolve(Object.freeze({
              url: requestUrl,
              statusCode: Number(response.statusCode || 0),
              checkedAt: new Date(this.now()).toISOString(),
              body,
            }));
          });
        });
      } catch (error) {
        fail(error);
        return;
      }
      request.setTimeout?.(this.timeoutMs, () => {
        request.destroy(new Error('Public HTTPS read-back timed out.'));
      });
      request.once('error', fail);
      request.end();
    });
  }
}

module.exports = {
  NodePublicationObserver,
  isoFromCertificateTime,
  normalizeDnsAnswer,
  subjectAltNames,
};
