'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const { createRecoveryRouter } = require('./recovery-router');
const { createHiVenuesCommunityRouter } = require('./community-router');
const { createHiVenuesSocialReadRouter } = require('./social-read-router');
const { MAX_IMAGE_BYTES, MAX_MULTIPART_BYTES, parseMultipartForm } = require('./local-media');
const { createHiVenuesOperatorRouter } = require('./operator-router');
const { createHiVenuesPreviewRouter } = require('./preview-router');
const { buildViewModel } = require('./present');
const { ProvisioningFileHiVenuesStore } = require('./provisioning-file-store');
const {
  createHiVenuesIdentityServices,
  identitySessionContext,
} = require('./identity');
const { createHiVenuesIdentityRouter } = require('./identity-router');
const { createHiVenuesParticipationServices } = require('./participation');
const { createHiVenuesParticipationRouter } = require('./participation-router');

const LOCAL_HOST = '127.0.0.1';
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

function createHiVenuesApp({
  store,
  publicIngress = false,
  accessSecret = '',
  secureCookie = publicIngress,
  provenance = null,
  discussionReader = null,
  discussionBindings = {},
  hiveReadService = null,
  socialBindings = {},
  identityServices = null,
  identityOrigin = '',
  identityNow = Date.now,
  identitySessionSecret = '',
  identityChallengeTtlMs,
  identitySessionTtlMs,
  participationServices = null,
  participationNow = Date.now,
  participationPreflightTtlMs,
  contentPermlinkFactory,
} = {}) {
  if (!store) throw new TypeError('HiVenues dogfood app requires a store.');
  if (publicIngress && String(accessSecret).length < 32) {
    throw new Error('HIVENUES_DOGFOOD_ACCESS_SECRET must contain at least 32 characters in public-ingress mode.');
  }

  const activeIdentityServices = identityServices === false
    ? null
    : identityServices || createHiVenuesIdentityServices({
        hiveReadService,
        sessionSecret: identitySessionSecret || undefined,
        challengeTtlMs: identityChallengeTtlMs,
        sessionTtlMs: identitySessionTtlMs,
        now: identityNow,
      });

  const activeParticipationServices = participationServices === false
    ? null
    : participationServices || createHiVenuesParticipationServices({
        hiveReadService,
        preflightTtlMs: participationPreflightTtlMs,
        now: participationNow,
      });

  const app = express();
  const sessions = new Set();
  const root = path.join(__dirname, '..', '..');
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.set('views', path.join(root, 'views'));
  app.set('view engine', 'ejs');
  app.use(express.raw({ type: 'multipart/form-data', limit: MAX_MULTIPART_BYTES }));
  app.use(express.json({ type: 'application/json', limit: '16kb' }));
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

    const match = /^\/hivenues\/studio\/([^/]+)\/media-import$/.exec(req.path);
    if (!match) return res.status(413).send('This request is too large. Return to the previous page and try a smaller input.');

    let slug;
    try {
      slug = decodeURIComponent(match[1]);
    } catch (_) {
      return res.status(413).send('This image is too large. Return to Media and choose a smaller JPEG or PNG.');
    }
    const snapshot = store.snapshot(slug);
    if (!snapshot) return res.sendStatus(404);
    return res.status(413).render('hivenues/media-library', {
      pageTitle: `Media — ${snapshot.draft.identity.displayName}`,
      ...buildViewModel(snapshot),
      mediaError: `That image is larger than the ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))} MiB limit. Choose a smaller JPEG or PNG and try again.`,
      imported: '',
    });
  });

  // The access page may use HiVenues styling. Product media and routes remain gated.
  app.use('/css', express.static(path.join(root, 'public', 'css')));

  app.get('/__dogfood/access', (req, res) => {
    if (!publicIngress) return res.redirect(303, '/hivenues');
    res.set('Cache-Control', 'no-store');
    return res.render('hivenues/dogfood-access', { pageTitle: 'Dogfood access — HiVenues', failed: false });
  });

  app.post('/__dogfood/access', (req, res) => {
    if (!publicIngress) return res.sendStatus(404);
    const origin = req.get('Origin');
    if (!origin || origin !== requestOrigin(req)) return res.status(403).send('DOGFOOD_ORIGIN_REJECTED');
    if (!sameSecret(req.body.accessSecret, accessSecret)) {
      res.set('Cache-Control', 'no-store');
      return res.status(401).render('hivenues/dogfood-access', { pageTitle: 'Dogfood access — HiVenues', failed: true });
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
    return res.redirect(303, '/hivenues');
  });

  if (publicIngress) {
    app.use((req, res, next) => {
      const token = parseCookies(req.get('Cookie')).get(SESSION_COOKIE);
      if (!token || !sessions.has(token)) return res.redirect(303, '/__dogfood/access');
      return next();
    });
    app.use(requireSameOrigin);
  }

  app.use(identitySessionContext(activeIdentityServices?.sessionStore || null));
  app.use((_req, res, next) => {
    res.locals.hivenuesParticipationAvailable = Boolean(activeParticipationServices);
    res.locals.hivenuesContentAvailable = Boolean(
      activeParticipationServices
      && typeof activeParticipationServices.hiveReadService?.getContentRecord === 'function'
      && typeof activeParticipationServices.hiveReadService?.getPostWithComments === 'function'
      && typeof activeParticipationServices.hiveReadService?.observeContentOperation === 'function',
    );
    res.locals.hivenuesVoteAvailable = Boolean(
      activeParticipationServices
      && typeof activeParticipationServices.hiveReadService?.getPostWithComments === 'function'
      && typeof activeParticipationServices.hiveReadService?.getVoteWeight === 'function'
      && typeof activeParticipationServices.hiveReadService?.observeVoteOperation === 'function',
    );
    res.locals.hivenuesRewardClaimAvailable = Boolean(
      activeParticipationServices
      && typeof activeParticipationServices.hiveReadService?.getAccountRecord === 'function'
      && typeof activeParticipationServices.hiveReadService?.observeRewardClaimOperation === 'function',
    );
    res.locals.hivenuesSupportAvailable = Boolean(
      activeParticipationServices
      && typeof activeParticipationServices.hiveReadService?.getAccountRecord === 'function'
      && typeof activeParticipationServices.hiveReadService?.observeSupportOperation === 'function',
    );
    next();
  });
  app.use('/identity', createHiVenuesIdentityRouter({
    services: activeIdentityServices,
    fixedOrigin: identityOrigin,
    secureCookie: Boolean(publicIngress),
  }));
  app.use('/participation', createHiVenuesParticipationRouter({
    store,
    services: activeParticipationServices,
    socialBindings,
    fixedOrigin: identityOrigin,
    contentPermlinkFactory,
  }));

  // Durable test workspaces may deliberately place local media outside the
  // repository public tree. Serve only that store-owned root, behind the same
  // ingress/session gate as the rest of the product, so normal and recoverable
  // error pages render the exact persisted assets they reference.
  if (typeof store.mediaRoot === 'string' && store.mediaRoot) {
    app.use('/hivenues/media/local', express.static(path.resolve(store.mediaRoot), {
      dotfiles: 'deny',
      fallthrough: true,
      index: false,
      redirect: false,
    }));
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

  app.post('/hivenues/studio/:slug/media-import', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const renderFailure = (status, message) => res.status(status).render('hivenues/media-library', {
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
    return res.redirect(303, `/hivenues/studio/${encodeURIComponent(req.params.slug)}/media-library?imported=${encodeURIComponent(result.mediaRole)}`);
  });

  // Product routes must run before the public directory fallback; otherwise the
  // real public/hivenues asset directory redirects /hivenues to /hivenues/.
  // Unmatched asset paths (for example /hivenues/media/...) fall through.
  app.get('/', (req, res) => res.redirect(303, '/hivenues'));
  app.use('/hivenues', createRecoveryRouter({ store }));
  // Preview routes intentionally run before the ordinary operator/public router.
  // They render only the working snapshot and never route through publicSnapshot.
  app.use('/hivenues', createHiVenuesPreviewRouter({ store }));
  // Era 3 social discovery is strictly read-side. It consumes the existing
  // HiveReadService contract and never acquires signing or broadcast authority.
  app.use('/hivenues', createHiVenuesSocialReadRouter({
    store,
    hiveReadService,
    socialBindings,
  }));
  // Community is a read-only public projection over the accepted provider-neutral
  // discussion seam. It must never enter HostGraph or acquire write authority.
  app.use('/hivenues', createHiVenuesCommunityRouter({
    store,
    discussionReader,
    discussionBindings,
  }));
  app.use('/hivenues', createHiVenuesOperatorRouter({ store }));
  app.use('/htmx', express.static(path.dirname(require.resolve('htmx.org'))));
  app.use(express.static(path.join(root, 'public')));
  return app;
}

function createHiVenuesStore({ statePath, ...options } = {}) {
  if (!statePath) throw new TypeError('HiVenues local store requires statePath.');
  return new ProvisioningFileHiVenuesStore({ statePath, ...options });
}

function startHiVenuesServer(app, { port = 4173 } = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, LOCAL_HOST, () => resolve(server));
    server.on('error', reject);
  });
}

module.exports = {
  LOCAL_HOST,
  SESSION_COOKIE,
  createHiVenuesApp,
  createHiVenuesStore,
  requireSameOrigin,
  startHiVenuesServer,
};
