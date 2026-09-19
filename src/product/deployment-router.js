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

const REFERENCE_SSH_CAPABILITIES = Object.freeze([
  'PROVISION_HANDOFF',
  'VERIFY_TARGET',
  'COMPUTE',
  'STORE',
  'PUBLISH',
  'BOOTSTRAP_RUNTIME',
  'DEPLOY_RELEASE',
  'DOMAIN',
  'DNS',
  'TLS',
  'HEALTH',
  'ROLLBACK',
  'DECOMMISSION',
]);

function requireConnectionFacts(body = {}) {
  const allowed = new Set(['host', 'port', 'username']);
  const unexpected = Object.keys(body).filter((key) => !allowed.has(key));
  if (unexpected.length) {
    const error = new Error('Server connection details accept public host, port and username only.');
    error.code = 'DEPLOYMENT_TARGET_FIELDS_INVALID';
    throw error;
  }

  const host = String(body.host || '').trim();
  if (
    !host
    || host.length > 253
    || /\s/.test(host)
    || host.includes('/')
    || host.includes('://')
  ) {
    const error = new Error('Enter a plain server host or IP address without a URL scheme or path.');
    error.code = 'DEPLOYMENT_TARGET_HOST_INVALID';
    throw error;
  }

  const port = Number(body.port || 22);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    const error = new Error('Enter an SSH port from 1 through 65535.');
    error.code = 'DEPLOYMENT_TARGET_PORT_INVALID';
    throw error;
  }

  const username = String(body.username || '').trim();
  if (!username || !/^[A-Za-z_][A-Za-z0-9_-]{0,31}$/.test(username)) {
    const error = new Error('Enter a valid remote account name.');
    error.code = 'DEPLOYMENT_TARGET_USERNAME_INVALID';
    throw error;
  }

  return Object.freeze({ host, port, username });
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

function requireSyntheticTarget(deployment) {
  if (deployment.providerKind !== 'synthetic-offline') {
    const error = new Error('This operation is available only for the offline synthetic target.');
    error.code = 'DEPLOYMENT_TARGET_KIND_INVALID';
    throw error;
  }
  return deployment;
}

function requireHostKeyAcceptance(body = {}) {
  if (Object.keys(body).some((key) => key !== 'fingerprint')) {
    const error = new Error('Host-key review accepts only the exact observed fingerprint.');
    error.code = 'DEPLOYMENT_HOST_KEY_REVIEW_FIELDS_INVALID';
    throw error;
  }
  const fingerprint = String(body.fingerprint || '').trim();
  if (!fingerprint) {
    const error = new Error('Choose the exact observed SSH host fingerprint to continue.');
    error.code = 'DEPLOYMENT_HOST_KEY_REVIEW_REQUIRED';
    throw error;
  }
  return fingerprint;
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
      ? active.deploymentStore.list(req.params.slug).map((deployment) => {
          let authorityPublic = null;
          if (deployment.authorityRef && active.authorityStore) {
            try {
              authorityPublic = active.authorityStore.publicRecord(deployment.authorityRef);
            } catch {}
          }
          return { ...deployment, authorityPublic };
        })
      : [];
    return res.status(status).render('hivenues/deployment', {
      pageTitle: `Deployment — ${snapshot.draft.identity.displayName}`,
      ...buildViewModel(snapshot),
      deploymentAvailable: Boolean(active),
      deploymentProfile: active?.adapters?.synthetic?.profile?.() || null,
      deploymentAuthorityAvailable: Boolean(active?.authorityStore),
      deploymentVerificationAvailable: Boolean(active?.targetVerifier),
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

  const mutateAsync = (handler) => async (req, res) => {
    try {
      const active = requireServices(services);
      await handler(active, req);
      return res.redirect(303, `/hivenues/studio/${encodeURIComponent(req.params.slug)}/deploy`);
    } catch (error) {
      return render(req, res, {
        status: deploymentErrorStatus(error),
        error: error.message || 'Deployment verification could not continue.',
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

  router.post('/studio/:slug/deploy/targets/reference-ssh', mutate((active, req) => {
    if (!active.authorityStore) {
      const error = new Error('Protected deployment authority is unavailable in this runtime.');
      error.code = 'DEPLOYMENT_AUTHORITY_UNAVAILABLE';
      throw error;
    }
    const snapshot = store.snapshot(req.params.slug);
    const authority = active.authorityStore.createSshAuthority({
      label: snapshot.draft.identity.displayName + ' deployment',
    });
    let deployment;
    try {
      deployment = active.deploymentStore.createDraft({
        hostSlug: req.params.slug,
        providerKind: 'ssh-server',
        providerProfile: 'privex-reference',
        capabilities: REFERENCE_SSH_CAPABILITIES,
      });
      active.deploymentStore.setAuthorityRef(deployment.id, authority.id);
      active.deploymentStore.transition(deployment.id, 'awaiting-provider', {
        reason: 'protected-deployment-authority-created',
        patch: {
          providerState: 'awaiting-provider',
          paymentState: 'not-requested',
        },
      });
    } catch (error) {
      active.authorityStore.revoke(authority.id);
      throw error;
    }
  }));

  router.post('/studio/:slug/deploy/:deploymentId/connection', mutate((active, req) => {
    const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
    if (deployment.providerKind !== 'ssh-server') {
      const error = new Error('Only SSH/server targets accept server connection facts.');
      error.code = 'DEPLOYMENT_TARGET_KIND_INVALID';
      throw error;
    }
    if (!['target-draft', 'awaiting-provider'].includes(deployment.state)) {
      const error = new Error('Server connection facts can only be set before target verification.');
      error.code = 'DEPLOYMENT_TARGET_STATE_INVALID';
      throw error;
    }
    const facts = requireConnectionFacts(req.body);
    active.deploymentStore.setTargetPublicFacts(deployment.id, facts);
    active.deploymentStore.transition(deployment.id, 'target-ready', {
      reason: 'server-public-facts-recorded',
      patch: {
        providerState: 'ready',
        paymentState: deployment.paymentState,
      },
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
    const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
    requireSyntheticTarget(deployment);
    active.adapters.synthetic.markTargetReady(req.params.deploymentId, {
      host: 'synthetic.local',
      port: 0,
    });
  }));

  router.post('/studio/:slug/deploy/:deploymentId/verify', mutateAsync(async (active, req) => {
    const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
    if (deployment.providerKind === 'synthetic-offline') {
      active.adapters.synthetic.verify(req.params.deploymentId);
      return;
    }
    if (deployment.providerKind !== 'ssh-server' || !active.targetVerifier) {
      const error = new Error('Read-only SSH verification is unavailable in this runtime.');
      error.code = 'DEPLOYMENT_SSH_VERIFICATION_UNAVAILABLE';
      throw error;
    }
    await active.targetVerifier.verify(req.params.deploymentId);
  }));

  router.post('/studio/:slug/deploy/:deploymentId/host-key/accept', mutate((active, req) => {
    const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
    if (deployment.providerKind !== 'ssh-server' || !active.targetVerifier) {
      const error = new Error('SSH host-key review is unavailable in this runtime.');
      error.code = 'DEPLOYMENT_SSH_VERIFICATION_UNAVAILABLE';
      throw error;
    }
    active.targetVerifier.acceptObservedHostKey(
      req.params.deploymentId,
      requireHostKeyAcceptance(req.body),
    );
  }));

  router.post('/studio/:slug/deploy/:deploymentId/deploy', mutate((active, req) => {
    const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
    requireSyntheticTarget(deployment);
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
    const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
    requireSyntheticTarget(deployment);
    active.adapters.synthetic.degrade(req.params.deploymentId);
  }));

  router.post('/studio/:slug/deploy/:deploymentId/rollback', mutate((active, req) => {
    const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
    requireSyntheticTarget(deployment);
    active.adapters.synthetic.rollback(req.params.deploymentId);
  }));

  router.post('/studio/:slug/deploy/:deploymentId/disconnect', mutate((active, req) => {
    const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
    if (deployment.providerKind === 'synthetic-offline') {
      active.adapters.synthetic.disconnect(req.params.deploymentId);
      return;
    }
    if (deployment.authorityRef && active.authorityStore) {
      active.authorityStore.revoke(deployment.authorityRef);
    }
    active.deploymentStore.disconnect(req.params.deploymentId);
  }));

  return router;
}

module.exports = {
  createHiVenuesDeploymentRouter,
  requireConnectionFacts,
  requireHostKeyAcceptance,
};
