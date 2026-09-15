'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const { createBetaRemediationRouter } = require('./beta-remediation-router');
const { MAX_IMAGE_BYTES, MAX_MULTIPART_BYTES, parseMultipartForm } = require('./local-media');
const { createCandidateCOperatorRouter } = require('./operator-router');
const { buildViewModel } = require('./present');

const DOGFOOD_HOST = '127.0.0.1';
const SESSION_COOKIE = 'hivenues_dogfood_session';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function parseCookies(header) {
  const cookies = new Map();
  for (const pair of String(header || '').split(';')) {
    const index = pair.indexOf('=');
    if (index < 1) continue;
    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (name) cookies.set(name, value);
  }
  return cookies;
}

function sameSecret(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function requestOrigin(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function requireSameOrigin(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('Origin');
  if (!origin || origin !== requestOrigin(req)) return res.status(403).send('DOGFOOD_ORIGIN_REJECTED');
  const fetchSite = req.get('Sec-Fetch-Site');
  if (fetchSite && fetchSite !== 'same-origin') return res.status(403).send('DOGFOOD_SITE_REJECTED');
  return next();
}

function createDogfoodApp({
  store,
  publicIngress = false,
  accessSecret = '',
  secureCookie = publicIngress,
  provenance = null,
} = {}) {
  if (!store) throw new TypeError('Candidate C dogfood app requires a store.');
  if (publicIngress && String(accessSecret).length < 32) {
    throw new Error('CANDIDATE_C_DOGFOOD_ACCESS_SECRET must contain at least 32 characters in public-ingress mode.');
  }

  const app = express();
  const sessions = new Set();
  const root = path.join(__dirname, '..', '..');
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.set('views', path.join(root, 'views'));
  app.set('view engine', 'ejs');
  app.use(express.raw({ type: 'multipart/form-data', limit: MAX_MULTIPART_BYTES }));
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));

  // Convert parser ceilings into an ordinary product error instead of exposing
  // Express internals. This runs before routing because the body parser itself
  // is what rejects a too-large multipart request.
  app.use((error, req, res, next) => {
    if (!error || error.type !== 'entity.too.large') return next(error);

    if (publicIngress) {
      const token = parseCookies(req.get('Cookie')).get(SESSION_COOKIE);
      if (!token || !sessions.has(token)) return res.redirect(303, '/__dogfood/access');
    }

    const match = /^\/candidate-c\/studio\/([^/]+)\/media-import$/.exec(req.path);
    if (!match) return res.status(413).send('This request is too large. Return to the previous page and try a smaller input.');

    let slug;
    try {
      slug = decodeURIComponent(match[1]);
    } catch (_) {
      return res.status(413).send('This image is too large. Return to Media and choose a smaller JPEG or PNG.');
    }
    const snapshot = store.snapshot(slug);
    if (!snapshot) return res.sendStatus(404);
    return res.status(413).render('candidate-c/media-library', {
      pageTitle: `Media — ${snapshot.draft.identity.displayName}`,
      ...buildViewModel(snapshot),
      mediaError: `That image is larger than the ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))} MiB limit. Choose a smaller JPEG or PNG and try again.`,
      imported: '',
    });
  });

  // The access page may use Candidate C styling. Product media and routes remain gated.
  app.use('/css', express.static(path.join(root, 'public', 'css')));

  app.get('/__dogfood/access', (req, res) => {
    if (!publicIngress) return res.redirect(303, '/candidate-c');
    res.set('Cache-Control', 'no-store');
    return res.render('candidate-c/dogfood-access', { pageTitle: 'Dogfood access — HiVenues', failed: false });
  });

  app.post('/__dogfood/access', (req, res) => {
    if (!publicIngress) return res.sendStatus(404);
    const origin = req.get('Origin');
    if (!origin || origin !== requestOrigin(req)) return res.status(403).send('DOGFOOD_ORIGIN_REJECTED');
    if (!sameSecret(req.body.accessSecret, accessSecret)) {
      res.set('Cache-Control', 'no-store');
      return res.status(401).render('candidate-c/dogfood-access', { pageTitle: 'Dogfood access — HiVenues', failed: true });
    }
    const token = crypto.randomBytes(32).toString('hex');
    sessions.add(token);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: Boolean(secureCookie),
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });
    res.set('Cache-Control', 'no-store');
    return res.redirect(303, '/candidate-c');
  });

  if (publicIngress) {
    app.use((req, res, next) => {
      const token = parseCookies(req.get('Cookie')).get(SESSION_COOKIE);
      if (!token || !sessions.has(token)) return res.redirect(303, '/__dogfood/access');
      return next();
    });
    app.use(requireSameOrigin);
  }

  // Test-only provenance surface so an independent beta operator can bind the
  // served runtime to the exact source without repository access.
  app.get('/__dogfood/build', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.type('text/plain; charset=utf-8');
    return res.send([
      'HiVenues dogfood build',
      `HEAD ${provenance?.commit || 'UNKNOWN'}`,
      `TREE ${provenance?.tree || 'UNKNOWN'}`,
      '',
    ].join('\n'));
  });

  app.post('/candidate-c/studio/:slug/media-import', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const renderFailure = (status, message) => res.status(status).render('candidate-c/media-library', {
      pageTitle: `Media — ${snapshot.draft.identity.displayName}`,
      ...buildViewModel(snapshot),
      mediaError: message,
      imported: '',
    });
    if (typeof store.importLocalImage !== 'function') return renderFailure(501, 'Local media import requires the durable test runtime.');

    let parsed;
    try {
      parsed = parseMultipartForm(req.body, req.get('Content-Type'));
    } catch (error) {
      return renderFailure(400, error.message || 'The image could not be read.');
    }
    const result = store.importLocalImage(req.params.slug, {
      ...parsed.fields,
      imageBuffer: parsed.imageBuffer,
      inspection: parsed.inspection,
    }, Number(parsed.fields.expectedRevision), String(parsed.fields.expectedDraftDigest || ''));
    if (!result.ok) {
      const stale = ['STALE_REVISION', 'STALE_DIGEST', 'INVALID_REVISION', 'INVALID_DRAFT_DIGEST'].includes(result.reason);
      return renderFailure(stale ? 409 : 400, result.message || result.reason);
    }
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/media-library?imported=${encodeURIComponent(result.mediaRole)}`);
  });

  // Product routes must run before the public directory fallback; otherwise the
  // real public/candidate-c asset directory redirects /candidate-c to /candidate-c/.
  // Unmatched asset paths (for example /candidate-c/media/...) fall through.
  app.get('/', (req, res) => res.redirect(303, '/candidate-c'));
  app.use('/candidate-c', createBetaRemediationRouter({ store }));
  app.use('/candidate-c', createCandidateCOperatorRouter({ store }));
  app.use('/htmx', express.static(path.dirname(require.resolve('htmx.org'))));
  app.use(express.static(path.join(root, 'public')));
  return app;
}

function startDogfoodServer(app, { port = 4173 } = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, DOGFOOD_HOST, () => resolve(server));
    server.on('error', reject);
  });
}

module.exports = {
  DOGFOOD_HOST,
  SESSION_COOKIE,
  createDogfoodApp,
  requireSameOrigin,
  startDogfoodServer,
};
