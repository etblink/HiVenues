'use strict';

const express = require('express');
const { createHiVenuesPreviewRouter } = require('./preview-router');
const { buildViewModel } = require('./present');
const { buildOperatorPresentation, contentChanges } = require('./operator-present');
const { ownedDeployment, selectWebsiteRelease, requireDeploymentConsequenceSubmission, deploymentErrorMessage, deploymentErrorStatus } = require('./deployment-router');

function createWorkspaceRouter({ store, services = null }) {
  const router = express.Router();
  router.use('/studio/:slug', (req, res, next) => {
    res.locals.presentOperator = (snapshot) => buildOperatorPresentation(snapshot, services);
    res.locals.operator = res.locals.presentOperator(store.snapshot(req.params.slug));
    res.set('Cache-Control', 'no-store');
    next();
  });
  function render(req, res, screen, extra = {}, status = 200) {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    return res.status(status).render('hivenues/workspace-task', {
      ...buildViewModel(snapshot), operator: buildOperatorPresentation(snapshot, services),
      pageTitle: `${snapshot.draft.identity.displayName} — Website`, screen, error: '', copy: null, target: null, review: null, changes: [], ...extra,
    });
  }
  function copyFor(req) {
    return store.snapshot(req.params.slug)?.releases.find((copy) => copy.id === req.params.copyId);
  }
  function remoteTarget(req) {
    if (!services?.remoteDeployment) throw Object.assign(new Error('This Studio is local-only. Your saved copy is safe here.'), { code: 'DEPLOYMENT_MUTATION_UNAVAILABLE' });
    const target = ownedDeployment(services, req.params.slug, req.params.targetId);
    if (target.providerKind !== 'ssh-server') throw Object.assign(new Error('Simulations cannot publish a public website.'), { code: 'DEPLOYMENT_TARGET_KIND_INVALID' });
    if (!copyFor(req)) throw Object.assign(new Error('This saved copy was not found.'), { code: 'DEPLOYMENT_RELEASE_NOT_FOUND' });
    return target;
  }
  function ensureSelected(req, target) {
    const copy = copyFor(req);
    if (target.selectedRelease?.id !== copy.id || target.selectedRelease?.digest !== copy.digest) {
      throw Object.assign(new Error('The selected website copy changed. Choose this destination again to review the exact copy.'), { code: 'DEPLOYMENT_CONSEQUENCE_REVIEW_STALE' });
    }
  }
  function failure(req, res, error) {
    return render(req, res, 'problem', { error: deploymentErrorMessage(error), copy: copyFor(req) || null }, deploymentErrorStatus(error));
  }
  router.get('/studio/:slug/website', (req, res) => render(req, res, 'website'));
  router.get('/studio/:slug/history', (req, res) => render(req, res, 'history'));
  router.get('/studio/:slug/publish', (req, res) => render(req, res, 'content-review'));
  router.post('/studio/:slug/publish', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (req.body.confirmation !== 'approve-exact-content') return render(req, res, 'content-review', { error: 'Confirm that you reviewed this website copy before continuing.' }, 400);
    if (Number(req.body.expectedRevision) !== snapshot.revision || req.body.expectedDraftDigest !== snapshot.draftDigest) {
      return render(req, res, 'content-review', { error: 'Your draft changed after this review. Review the current copy before continuing.' }, 409);
    }
    let copy = snapshot.releases.slice().reverse().find((item) => item.digest === snapshot.draftDigest);
    if (!copy) {
      const result = store.createRelease(req.params.slug, Number(req.body.expectedRevision), req.body.expectedDraftDigest);
      if (!result.ok) return render(req, res, 'content-review', { error: 'The draft changed. Please review it again.' }, 409);
      copy = result.release;
    }
    return res.redirect(303, `${res.locals.operator.base}/publish/${encodeURIComponent(copy.id)}`);
  });
  router.get('/studio/:slug/publish/:copyId', (req, res) => {
    const copy = copyFor(req);
    return copy ? render(req, res, 'destination', { copy }) : res.sendStatus(404);
  });
  router.use('/studio/:slug/publish/:copyId/preview', (req, res, next) => {
    const copy = copyFor(req);
    if (!copy) return res.sendStatus(404);
    const slug = req.params.slug;
    const snapshot = { ...store.snapshot(slug), draft: copy.snapshot, revision: copy.draftRevision, draftDigest: copy.digest };
    res.locals.previewRouteBase = `${res.locals.operator.base}/publish/${encodeURIComponent(copy.id)}/preview`;
    res.locals.previewCopy = copy;
    const originalUrl = req.url;
    req.url = `/studio/${encodeURIComponent(slug)}/preview${originalUrl === '/' ? '' : originalUrl}`;
    return createHiVenuesPreviewRouter({ store: { snapshot: () => snapshot, publicSnapshot: () => null } })(req, res, (error) => { req.url = originalUrl; next(error); });
  });
  // Choosing a destination only selects/packages immutable content locally. The
  // exact service review and explicit consequence submission still gate execution.
  router.post('/studio/:slug/publish/:copyId/to/:targetId', (req, res) => {
    try {
      const target = remoteTarget(req);
      selectWebsiteRelease(services, store, req.params.slug, target, req.params.copyId);
      return res.redirect(303, `${res.locals.operator.base}/publish/${encodeURIComponent(req.params.copyId)}/to/${encodeURIComponent(target.id)}/review`);
    } catch (error) { return failure(req, res, error); }
  });
  router.get('/studio/:slug/publish/:copyId/to/:targetId/review', (req, res) => {
    try {
      const target = remoteTarget(req);
      ensureSelected(req, target);
      const review = services.remoteDeployment.prepareReview(target.id);
      const presentation = res.locals.operator.targets.find((item) => item.id === target.id);
      return render(req, res, 'consequence', { copy: copyFor(req), target, review, presentation, changes: contentChanges(presentation.baseline?.snapshot, copyFor(req).snapshot) });
    } catch (error) { return failure(req, res, error); }
  });
  router.post('/studio/:slug/publish/:copyId/to/:targetId/execute', async (req, res) => {
    try {
      const target = remoteTarget(req);
      ensureSelected(req, target);
      await services.remoteDeployment.deploy(target.id, requireDeploymentConsequenceSubmission(req.body));
      return res.redirect(303, `${res.locals.operator.base}/publish/${encodeURIComponent(req.params.copyId)}/to/${encodeURIComponent(target.id)}/result`);
    } catch (error) { return failure(req, res, error); }
  });
  router.get('/studio/:slug/publish/:copyId/to/:targetId/result', (req, res) => {
    try {
      const target = remoteTarget(req);
      const presentation = res.locals.operator.targets.find((item) => item.id === target.id);
      return render(req, res, 'result', { copy: copyFor(req), target, presentation });
    } catch (error) { return failure(req, res, error); }
  });
  function installedCopy(req, target) {
    const copy = copyFor(req);
    if (target.activeRelease?.id !== copy.id || target.activeRelease?.digest !== copy.digest) {
      throw Object.assign(new Error('This server now has a different website copy. Review the current website before connecting its public address.'), { code: 'DEPLOYMENT_CONSEQUENCE_REVIEW_STALE' });
    }
  }
  router.get('/studio/:slug/publish/:copyId/to/:targetId/address', async (req, res) => {
    try {
      const target = remoteTarget(req);
      installedCopy(req, target);
      const review = await services.remoteDeployment.prepareHostnamePublicationReview(target.id);
      return render(req, res, 'address-review', { copy: copyFor(req), target, review });
    } catch (error) { return failure(req, res, error); }
  });
  router.post('/studio/:slug/publish/:copyId/to/:targetId/address', async (req, res) => {
    try {
      const target = remoteTarget(req);
      installedCopy(req, target);
      await services.remoteDeployment.publishHostname(target.id, requireDeploymentConsequenceSubmission(req.body));
      return res.redirect(303, `${res.locals.operator.base}/publish/${encodeURIComponent(req.params.copyId)}/to/${encodeURIComponent(target.id)}/result`);
    } catch (error) { return failure(req, res, error); }
  });
  router.post('/studio/:slug/publish/:copyId/to/:targetId/check', async (req, res) => {
    try {
      const target = remoteTarget(req);
      // Read-only public observation, using the existing protected verification.
      await services.remoteDeployment.verifyPublicHttps(target.id);
      return res.redirect(303, `${res.locals.operator.base}/publish/${encodeURIComponent(req.params.copyId)}/to/${encodeURIComponent(target.id)}/result`);
    } catch (error) { return failure(req, res, error); }
  });
  return router;
}
module.exports = { createWorkspaceRouter };
