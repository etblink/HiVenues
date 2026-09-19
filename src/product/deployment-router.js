'use strict';

const express = require('express');

const { buildViewModel } = require('./present');

function deploymentErrorStatus(error) {
  if (!error || !error.code) return 400;
  if (error.code === 'DEPLOYMENT_NOT_FOUND') return 404;
  if (
    error.code === 'DEPLOYMENT_RELEASE_NOT_FOUND'
    || error.code === 'DEPLOYMENT_HOST_NOT_FOUND'
  ) return 404;
  if (
    error.code === 'DEPLOYMENT_TRANSITION_INVALID'
    || error.code === 'DEPLOYMENT_PACKAGE_RELEASE_MISMATCH'
    || error.code === 'DEPLOYMENT_RELEASE_REQUIRED'
    || error.code === 'DEPLOYMENT_ROLLBACK_UNAVAILABLE'
  ) return 409;
  return 400;
}

function requireServices(services) {
  if (
    !services
    || !services.deploymentStore
    || !services.packageBuilder
    || !services.adapters?.synthetic
  ) {
    const error = new Error('Local deployment simulation is unavailable in this runtime.');
    error.code = 'DEPLOYMENT_UNAVAILABLE';
    throw error;
  }
  return services;
}

function ownedDeployment(services, hostSlug, deploymentId) {
  const record = services.deploymentStore.get(deploymentId);
  if (!record || record.hostSlug !== hostSlug) {
    const error = new Error('Deployment target was not found for this host.');
    error.code = 'DEPLOYMENT_NOT_FOUND';
    throw error;
  }
  return record;
}

function createHiVenuesDeploymentRouter({
  store,
  services = null,
} = {}) {
  if (!store) throw new TypeError('HiVenues deployment router requires the HostGraph store.');

  const router = express.Router();

  const render = (req, res, {
    status = 200,
    error = '',
  } = {}) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const active = services;
    const deployments = active
      ? active.deploymentStore.list(req.params.slug)
      : [];
    return res.status(status).render('hivenues/deployment', {
      pageTitle: `Deployment — ${snapshot.draft.identity.displayName}`,
      ...buildViewModel(snapshot),
      deploymentAvailable: Boolean(active),
      deploymentProfile: active?.adapters?.synthetic?.profile?.() || null,
      deployments,
      error,
    });
  };

  const mutate = (handler) => (req, res) => {
    try {
      const active = requireServices(services);
      handler(active, req);
      return res.redirect(303, `/hivenues/studio/${encodeURIComponent(req.params.slug)}/deploy`);
    } catch (error) {
      return render(req, res, {
        status: deploymentErrorStatus(error),
        error: error.message || 'Deployment simulation could not continue.',
      });
    }
  };

  router.get('/studio/:slug/deploy', (req, res) => render(req, res));

  router.post('/studio/:slug/deploy/targets', mutate((active, req) => {
    active.deploymentStore.createDraft({
      hostSlug: req.params.slug,
      providerKind: 'synthetic-offline',
      providerProfile: 'synthetic-local',
      capabilities: active.adapters.synthetic.profile().capabilities,
    });
  }));

  router.post('/studio/:slug/deploy/:deploymentId/release', mutate((active, req) => {
    const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
    const releaseId = String(req.body.releaseId || '').trim();
    const snapshot = store.snapshot(req.params.slug);
    const release = snapshot.releases.find((item) => item.id === releaseId);
    if (!release) {
      const error = new Error('Choose an immutable HiVenues Release that exists for this host.');
      error.code = 'DEPLOYMENT_RELEASE_NOT_FOUND';
      throw error;
    }
    active.deploymentStore.selectRelease(deployment.id, release);
    const manifest = active.packageBuilder.build({
      hostSlug: req.params.slug,
      releaseId,
    });
    active.deploymentStore.recordPackage(deployment.id, manifest);
  }));

  router.post('/studio/:slug/deploy/:deploymentId/target-ready', mutate((active, req) => {
    ownedDeployment(active, req.params.slug, req.params.deploymentId);
    active.adapters.synthetic.markTargetReady(req.params.deploymentId, {
      host: 'synthetic.local',
      port: 0,
    });
  }));

  router.post('/studio/:slug/deploy/:deploymentId/verify', mutate((active, req) => {
    ownedDeployment(active, req.params.slug, req.params.deploymentId);
    active.adapters.synthetic.verify(req.params.deploymentId);
  }));

  router.post('/studio/:slug/deploy/:deploymentId/deploy', mutate((active, req) => {
    const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
    if (!deployment.selectedRelease) {
      const error = new Error('Choose and package an immutable Release before deployment.');
      error.code = 'DEPLOYMENT_RELEASE_REQUIRED';
      throw error;
    }
    const manifest = active.packageBuilder.build({
      hostSlug: req.params.slug,
      releaseId: deployment.selectedRelease.id,
    });
    active.deploymentStore.recordPackage(deployment.id, manifest);
    active.adapters.synthetic.deploy(deployment.id, manifest);
  }));

  router.post('/studio/:slug/deploy/:deploymentId/degrade', mutate((active, req) => {
    ownedDeployment(active, req.params.slug, req.params.deploymentId);
    active.adapters.synthetic.degrade(req.params.deploymentId);
  }));

  router.post('/studio/:slug/deploy/:deploymentId/rollback', mutate((active, req) => {
    ownedDeployment(active, req.params.slug, req.params.deploymentId);
    active.adapters.synthetic.rollback(req.params.deploymentId);
  }));

  router.post('/studio/:slug/deploy/:deploymentId/disconnect', mutate((active, req) => {
    ownedDeployment(active, req.params.slug, req.params.deploymentId);
    active.adapters.synthetic.disconnect(req.params.deploymentId);
  }));

  return router;
}

module.exports = {
  createHiVenuesDeploymentRouter,
};
