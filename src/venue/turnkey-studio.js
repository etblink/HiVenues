'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const { createApp } = require('../app');
const {
  createLocalConfig,
  createOfflineHiveBoundary,
  LOCAL_SOURCE_AUTHORING_EDITOR_PATH,
  LOCAL_SOURCE_AUTHORING_HOST,
  LocalSourceAuthoringError,
} = require('./local-source-authoring');
const { createOfflineSourceAuthoringSurface } = require('./source-authoring-surface');
const {
  loadDeploymentAgnosticVenueSourceFile,
  serializeDeploymentAgnosticVenueSourceFile,
} = require('./source-file');
const {
  MAX_MANAGED_IMAGE_BYTES,
  ManagedAssetError,
  managedAssetFilenameFromSourcePath,
  prepareManagedImage,
  resolveManagedAssetFile,
} = require('./managed-assets');
const { resolveTurnkeyWorkspace } = require('./turnkey-workspace');

const TURNKEY_MEDIA_IMPORT_SUFFIX = '/media-import';
const TURNKEY_SAVE_SUFFIX = '/save-workspace';
const TURNKEY_SCRIPT_SUFFIX = '/turnkey.js';
const SAFE_TURNKEY_MEDIA_ERROR = 'Image import failed. Choose a PNG, JPEG, or GIF up to 8 MiB and try again; existing venue media was not replaced.';
const SAFE_TURNKEY_SAVE_ERROR = 'Venue file save failed. Your accepted Studio draft is still in memory; check workspace permissions and try again.';

function silentLogger() {
  return Object.freeze({ child() { return this; }, debug() {}, error() {}, info() {}, warn() {} });
}

function localSecurityMiddleware(origin) {
  return [
    (req, res, next) => {
      const host = req.get('host');
      const expectedHost = new URL(origin).host;
      if (host !== expectedHost) {
        res.status(403).type('text').send('Venue Studio rejected an unexpected Host header.');
        return;
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('origin') !== origin) {
        res.status(403).type('text').send('Venue Studio rejected a cross-origin state change.');
        return;
      }
      next();
    },
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"], baseUri: ["'self'"], connectSrc: ["'self'"], fontSrc: ["'self'"],
          formAction: ["'self'"], frameAncestors: ["'self'"], frameSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://images.hive.blog'], mediaSrc: ["'self'", 'blob:'],
          objectSrc: ["'none'"], scriptSrc: ["'self'"], scriptSrcAttr: ["'none'"], styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-origin' },
      hsts: false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  ];
}

function applyPreviewProjection(previewApplication, projection) {
  previewApplication.locals.venue = projection.venueContext;
  previewApplication.locals.venuePackage = projection.venuePackage;
  previewApplication.locals.siteName = projection.siteName;
  previewApplication.locals.business = projection.business;
  previewApplication.locals.communityId = projection.venueContext.hive.communityId;
  previewApplication.locals.threadsContainerAccount = projection.venueContext.hive.threadsContainerAccount;
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => { server.off('listening', onListening); reject(error); };
    const onListening = () => { server.off('error', onError); resolve(server.address()); };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen({ host: LOCAL_SOURCE_AUTHORING_HOST, port, exclusive: true });
  });
}

function close(server) {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

function mediaLabel(pointer) {
  if (pointer === '/venuePackage/brand/logo/src') return 'Venue logo';
  if (pointer === '/venuePackage/home/hero/image/src') return 'Hero image';
  const gallery = pointer.match(/^\/venuePackage\/home\/gallery\/items\/(\d+)\/src$/);
  return gallery ? `Gallery image ${Number(gallery[1]) + 1}` : pointer;
}

function turnkeyPanel(session, editorPath) {
  const options = session.listEditableFields()
    .filter((field) => field.controlKind === 'asset-path')
    .map((field) => `<option value="${field.pointer}">${mediaLabel(field.pointer)}</option>`)
    .join('');
  const dirty = session.status().dirty;
  return `<section class="turnkey-tools" aria-labelledby="turnkey-tools-heading">
    <style>
      .turnkey-tools{margin:0 0 16px;padding:16px;border:2px solid #0c4a6e;border-radius:16px;background:#f0f9ff;color:#1c1917}.turnkey-tools h2{margin:0 0 4px;font-size:1.25rem}.turnkey-tools p{margin:0 0 12px;color:#44403c}.turnkey-tools__grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(220px,1fr);gap:14px}.turnkey-tools form{display:grid;gap:9px;padding:12px;border:1px solid #bae6fd;border-radius:12px;background:white}.turnkey-tools label{font-weight:700}.turnkey-tools small{color:#57534e}.turnkey-tools__status{min-height:1.5em}.turnkey-tools button{justify-self:start}@media(max-width:800px){.turnkey-tools__grid{grid-template-columns:1fr}}
    </style>
    <h2 id="turnkey-tools-heading">Workspace tools</h2>
    <p>Import local venue images into this workspace, preview them, then keep and save the accepted draft. Nothing here uploads media, publishes, deploys, or writes to Hive.</p>
    <div class="turnkey-tools__grid">
      <form data-turnkey-media-form>
        <label for="turnkey-media-pointer">Replace</label><select id="turnkey-media-pointer" name="pointer" required>${options}</select>
        <label for="turnkey-media-file">Local image</label><input id="turnkey-media-file" name="file" type="file" accept="image/png,image/jpeg,image/gif" required>
        <small>PNG, JPEG, or GIF; maximum 8 MiB. HiVenues stores accepted bytes under <code>/venue-assets/</code> with a deterministic content-derived filename and refuses unsafe overwrite.</small>
        <button type="submit">Import into preview</button><span class="turnkey-tools__status" data-turnkey-media-status role="status"></span>
      </form>
      <form method="post" action="${editorPath}${TURNKEY_SAVE_SUFFIX}">
        <strong>Save accepted draft</strong><small>${dirty ? 'Keep or undo preview changes first.' : 'The accepted draft is ready to persist to venue-source.json.'}</small>
        <button type="submit"${dirty ? ' disabled aria-disabled="true"' : ''}>Save to workspace</button>
      </form>
    </div>
  </section>`;
}

const TURNKEY_CLIENT_SCRIPT = `'use strict';
(() => {
  const form = document.querySelector('[data-turnkey-media-form]');
  if (!form) return;
  const fileInput = form.querySelector('input[type="file"]');
  const pointerInput = form.querySelector('select[name="pointer"]');
  const status = form.querySelector('[data-turnkey-media-status]');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = fileInput.files && fileInput.files[0];
    if (!file || !pointerInput.value) { status.textContent = 'Choose an image and destination first.'; return; }
    status.textContent = 'Importing image…';
    try {
      const response = await fetch(location.pathname + '${TURNKEY_MEDIA_IMPORT_SUFFIX}?pointer=' + encodeURIComponent(pointerInput.value), {
        method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file,
      });
      if (!response.ok) { status.textContent = await response.text() || 'Image import failed.'; return; }
      location.assign(location.pathname);
    } catch { status.textContent = 'Image import failed before the local request completed.'; }
  });
})();`;

function atomicSaveSource(filename, source, fsImpl = fs) {
  let stat;
  try { stat = fsImpl.lstatSync(filename); } catch (error) { throw new Error(`cannot inspect ${filename}: ${error.message}`); }
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('venue-source.json must be a regular file, not a symlink');
  const bytes = serializeDeploymentAgnosticVenueSourceFile(source);
  const temporary = path.join(path.dirname(filename), `.${path.basename(filename)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  try {
    fsImpl.writeFileSync(temporary, bytes, { encoding: 'utf8', flag: 'wx', mode: 0o644 });
    fsImpl.renameSync(temporary, filename);
  } catch (error) {
    try { fsImpl.unlinkSync(temporary); } catch { /* no temporary file to remove */ }
    throw error;
  }
  return bytes;
}

function assetContentType(filename) {
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.jpg')) return 'image/jpeg';
  if (filename.endsWith('.gif')) return 'image/gif';
  if (filename.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

async function startTurnkeyStudio({ workspaceDirectory, port = 0, fetchImpl = globalThis.fetch, fsImpl = fs } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) throw new TypeError('port must be an integer between 0 and 65535');
  const workspace = resolveTurnkeyWorkspace(workspaceDirectory);
  const sourceInput = loadDeploymentAgnosticVenueSourceFile(workspace.sourceFile, { statSync: fsImpl.statSync, readFileSync: fsImpl.readFileSync });

  const hostApplication = express();
  hostApplication.disable('x-powered-by');
  const server = http.createServer(hostApplication);
  let address;
  try { address = await listen(server, port); } catch (error) { throw new LocalSourceAuthoringError('could not bind the loopback listener', { cause: error }); }

  try {
    if (!address || typeof address === 'string') throw new LocalSourceAuthoringError('loopback listener did not return a TCP address');
    const origin = `http://${LOCAL_SOURCE_AUTHORING_HOST}:${address.port}`;
    let previewApplication = null;
    const offlineHive = createOfflineHiveBoundary();
    const surface = createOfflineSourceAuthoringSurface({
      sourceInput,
      editorPath: LOCAL_SOURCE_AUTHORING_EDITOR_PATH,
      async renderPreviewHtml(projection) {
        if (!previewApplication) throw new LocalSourceAuthoringError('preview application is not ready');
        applyPreviewProjection(previewApplication, projection);
        const response = await fetchImpl(`${origin}/`, { headers: { accept: 'text/html' }, redirect: 'error' });
        if (!response.ok) throw new LocalSourceAuthoringError(`local preview renderer returned HTTP ${response.status}`);
        return response.text();
      },
    });
    const config = createLocalConfig(surface.session.acceptedSource.venueContext, { origin, port: address.port });
    previewApplication = createApp({
      config, logger: silentLogger(), rpcPool: offlineHive.rpcPool, hiveReadService: offlineHive.hiveReadService,
      deploymentIdentity: Object.freeze({ exact: false, build: 'turnkey-studio-local' }),
      onboardingEnvironment: Object.freeze({ HIVE_ONBOARDING_ENABLED: 'false' }),
      venue: surface.session.acceptedSource.venueContext, venuePackage: surface.session.acceptedSource.venuePackage,
    });

    for (const middleware of localSecurityMiddleware(origin)) hostApplication.use(middleware);
    const scriptPath = `${surface.editorPath}${TURNKEY_SCRIPT_SUFFIX}`;
    hostApplication.get(scriptPath, (req, res) => res.type('application/javascript').send(TURNKEY_CLIENT_SCRIPT));
    hostApplication.post(
      `${surface.editorPath}${TURNKEY_MEDIA_IMPORT_SUFFIX}`,
      express.raw({ type: () => true, limit: MAX_MANAGED_IMAGE_BYTES + 1 }),
      (req, res) => {
        try {
          const pointer = String(req.query.pointer || '');
          const field = surface.session.listEditableFields().find((entry) => entry.pointer === pointer && entry.controlKind === 'asset-path');
          if (!field) throw new ManagedAssetError('selected media destination is unavailable');
          const asset = prepareManagedImage({ workspaceDirectory: workspace.root, bytes: req.body, fsImpl });
          surface.session.edit(pointer, asset.sourcePath);
          res.status(204).end();
        } catch (error) {
          res.status(400).type('text').send(error instanceof ManagedAssetError ? error.message : SAFE_TURNKEY_MEDIA_ERROR);
        }
      },
    );
    hostApplication.post(`${surface.editorPath}${TURNKEY_SAVE_SUFFIX}`, (req, res) => {
      try {
        if (surface.session.status().dirty) { res.status(409).type('text').send('Keep or undo preview changes before saving venue-source.json.'); return; }
        atomicSaveSource(workspace.sourceFile, surface.session.acceptedSource, fsImpl);
        res.redirect(303, surface.editorPath);
      } catch { res.status(500).type('text').send(SAFE_TURNKEY_SAVE_ERROR); }
    });
    hostApplication.get(`/${workspace.assetDirectory.split(path.sep).at(-1)}/:filename`, (req, res) => {
      try {
        const sourcePath = `/${workspace.assetDirectory.split(path.sep).at(-1)}/${req.params.filename}`;
        managedAssetFilenameFromSourcePath(sourcePath, { allowStarter: true });
        const filename = resolveManagedAssetFile(workspace.root, sourcePath, { allowStarter: true });
        const stat = fsImpl.lstatSync(filename);
        if (!stat.isFile() || stat.isSymbolicLink()) throw new ManagedAssetError('asset is not a regular file');
        res.type(assetContentType(filename)).send(fsImpl.readFileSync(filename));
      } catch { res.status(404).type('text').send('Managed venue asset not found.'); }
    });
    hostApplication.use((req, res, next) => {
      if (req.method !== 'GET' || req.path !== surface.editorPath) return next();
      const send = res.send.bind(res);
      res.send = (body) => send(typeof body === 'string'
        ? body.replace('</head>', `<script defer src="${scriptPath}"></script></head>`)
          .replace('<div class="layout">', `${turnkeyPanel(surface.session, surface.editorPath)}<div class="layout">`)
        : body);
      return next();
    });
    hostApplication.use(surface.router);
    hostApplication.use(previewApplication);
    hostApplication.use((error, req, res, next) => {
      if (error?.type === 'entity.too.large') { res.status(413).type('text').send(`Image import failed: selected image exceeds the ${MAX_MANAGED_IMAGE_BYTES}-byte limit.`); return; }
      next(error);
    });

    let closed = false;
    return Object.freeze({
      address: Object.freeze({ address: address.address, family: address.family, port: address.port }),
      diagnostics: offlineHive.snapshot,
      editorPath: surface.editorPath,
      origin,
      sourceFilePath: workspace.sourceFile,
      url: `${origin}${surface.editorPath}`,
      workspace: workspace.root,
      async close() { if (closed) return; closed = true; await close(server); },
    });
  } catch (error) {
    try { await close(server); } catch { /* preserve original failure */ }
    if (error instanceof LocalSourceAuthoringError) throw error;
    throw new LocalSourceAuthoringError(error.message, { cause: error });
  }
}

module.exports = {
  SAFE_TURNKEY_MEDIA_ERROR,
  SAFE_TURNKEY_SAVE_ERROR,
  TURNKEY_MEDIA_IMPORT_SUFFIX,
  TURNKEY_SAVE_SUFFIX,
  TURNKEY_SCRIPT_SUFFIX,
  atomicSaveSource,
  startTurnkeyStudio,
  turnkeyPanel,
};
