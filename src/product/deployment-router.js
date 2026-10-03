'use strict';

const net = require('node:net');

const express = require('express');

const {
  createDomainPreflight,
  normalizeHostname,
  prepareStage4LiveReview,
} = require('./deployment-publication');
const { buildViewModel } = require('./present');

function mutationSubstage(stderr) {
  const prefix = 'HIVENUES_MUTATION_STAGE=';
  const markers = String(stderr || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^HIVENUES_MUTATION_STAGE=[A-Za-z0-9._:-]+$/.test(line));
  if (!markers.length) return '';
  return markers.at(-1).slice(prefix.length);
}

function deploymentErrorMessage(error, fallback = 'Deployment verification could not continue.') {
  if (!error) return fallback;
  const base = error.message || fallback;
  if (
    error.code !== 'DEPLOYMENT_REMOTE_COMMAND_FAILED'
    && error.code !== 'DEPLOYMENT_SFTP_UPLOAD_FAILED'
  ) {
    return base;
  }
  const outerStage = /^[A-Za-z0-9._:-]+$/.test(String(error.deploymentStage || ''))
    ? String(error.deploymentStage)
    : 'remote-mutation';
  const innerStage = mutationSubstage(error.remoteStderr);
  const stage = innerStage && innerStage !== outerStage
    ? outerStage + ' / ' + innerStage
    : outerStage;
  const status = Number.isInteger(error.remoteExitCode)
    ? ' (status ' + String(error.remoteExitCode) + ')'
    : '';
  return 'Remote deployment operation failed during '
    + stage
    + status
    + '. ['
    + String(error.code || 'DEPLOYMENT_REMOTE_FAILURE')
    + ']';
}

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
    || error.code === 'DEPLOYMENT_MUTATION_STATE_INVALID'
    || error.code === 'DEPLOYMENT_PACKAGE_STALE'
    || error.code === 'DEPLOYMENT_CONSEQUENCE_REVIEW_STALE'
    || error.code === 'DEPLOYMENT_TARGET_NOT_TRUSTED'
    || error.code === 'DEPLOYMENT_DOMAIN_HEALTHY_REQUIRED'
    || error.code === 'DEPLOYMENT_DOMAIN_PREFLIGHT_LOCKED'
    || error.code === 'DEPLOYMENT_PUBLICATION_ACTIVE_DEPLOYMENT_REQUIRED'
    || error.code === 'DEPLOYMENT_PUBLICATION_DOMAIN_PLAN_REQUIRED'
    || error.code === 'DEPLOYMENT_PUBLICATION_MIGRATION_REVIEW_STALE'
    || error.code === 'DEPLOYMENT_PUBLICATION_MIGRATION_BOOTSTRAP_AUTHORITY_REQUIRED'
    || error.code === 'DEPLOYMENT_PUBLICATION_MIGRATION_STATE_INVALID'
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

function requireDeploymentConsequenceSubmission(body = {}) {
  const allowed = new Set(['reviewDigest', 'confirmation']);
  const unexpected = Object.keys(body).filter((key) => !allowed.has(key));
  if (unexpected.length) {
    const error = new Error('Deployment consequence confirmation contains unexpected fields.');
    error.code = 'DEPLOYMENT_CONSEQUENCE_FIELDS_INVALID';
    throw error;
  }
  return Object.freeze({
    reviewDigest: String(body.reviewDigest || '').trim(),
    confirmation: String(body.confirmation || '').trim(),
  });
}

function requireDomainPreflightSubmission(body = {}) {
  if (Object.keys(body).some((key) => key !== 'hostname')) {
    const error = new Error('Domain setup accepts only one hostname.');
    error.code = 'DEPLOYMENT_DOMAIN_FIELDS_INVALID';
    throw error;
  }
  return normalizeHostname(body.hostname);
}

function domainDestination(deployment) {
  const host = String(deployment?.targetPublicFacts?.host || '').trim();
  const family = net.isIP(host);
  if (family === 4) return Object.freeze({ kind: 'ipv4', value: host });
  if (family === 6) return Object.freeze({ kind: 'ipv6', value: host });
  if (host) return Object.freeze({ kind: 'hostname', value: normalizeHostname(host) });
  const error = new Error('The deployment target has no public destination for domain setup.');
  error.code = 'DEPLOYMENT_DOMAIN_DESTINATION_INVALID';
  throw error;
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
          let publicationReview = null;
          if (deployment.publicEndpoint) {
            try {
              publicationReview = prepareStage4LiveReview({
                preflight: deployment.publicEndpoint,
                deployment,
              });
            } catch {}
          }
          return { ...deployment, authorityPublic, publicationReview };
        })
      : [];
    return res.status(status).render('hivenues/deployment', {
      pageTitle: `Deployment — ${snapshot.draft.identity.displayName}`,
      ...buildViewModel(snapshot),
      deploymentAvailable: Boolean(active),
      deploymentProfile: active?.adapters?.synthetic?.profile?.() || null,
      deploymentAuthorityAvailable: Boolean(active?.authorityStore),
      deploymentVerificationAvailable: Boolean(active?.targetVerifier),
      deploymentMutationAvailable: Boolean(active?.remoteDeployment),
      deploymentPublicationInspectionAvailable: Boolean(
        active?.remoteDeployment
        && typeof active.remoteDeployment.inspectPublicationCapability === 'function'
      ),
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
        error: deploymentErrorMessage(
          error,
          'Deployment verification could not continue.',
        ),
      });
    }
  };

  router.get('/studio/:slug/deploy', (req, res) => render(req, res));

  router.get('/studio/:slug/deploy/:deploymentId/readback', async (req, res) => {
    try {
      const active = requireServices(services);
      if (!active.remoteDeployment || typeof active.remoteDeployment.inspectReadBack !== 'function') {
        const error = new Error('Exact deployment read-back inspection is unavailable in this runtime.');
        error.code = 'DEPLOYMENT_MUTATION_UNAVAILABLE';
        throw error;
      }
      const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
      if (deployment.providerKind !== 'ssh-server') {
        const error = new Error('Exact deployment read-back inspection requires an SSH/server target.');
        error.code = 'DEPLOYMENT_TARGET_KIND_INVALID';
        throw error;
      }
      const diagnostic = await active.remoteDeployment.inspectReadBack(deployment.id);
      const snapshot = store.snapshot(req.params.slug);
      if (!snapshot) return res.sendStatus(404);
      return res.render('hivenues/deployment-readback', {
        pageTitle: `Deployment read-back — ${snapshot.draft.identity.displayName}`,
        ...buildViewModel(snapshot),
        deployment,
        diagnostic,
      });
    } catch (error) {
      return render(req, res, {
        status: deploymentErrorStatus(error),
        error: deploymentErrorMessage(
          error,
          'Exact deployment read-back could not be inspected.',
        ),
      });
    }
  });

  router.get('/studio/:slug/deploy/:deploymentId/publication-capability', async (req, res) => {
    try {
      const active = requireServices(services);
      if (
        !active.remoteDeployment
        || typeof active.remoteDeployment.inspectPublicationCapability !== 'function'
      ) {
        const error = new Error('Server publishing readiness inspection is unavailable in this runtime.');
        error.code = 'DEPLOYMENT_PUBLICATION_CAPABILITY_UNAVAILABLE';
        throw error;
      }
      const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
      if (deployment.providerKind !== 'ssh-server') {
        const error = new Error('Server publishing readiness requires a real server deployment target.');
        error.code = 'DEPLOYMENT_TARGET_KIND_INVALID';
        throw error;
      }
      if (!deployment.publicEndpoint) {
        const error = new Error('Prepare a domain plan before checking server publishing readiness.');
        error.code = 'DEPLOYMENT_PUBLICATION_DOMAIN_PLAN_REQUIRED';
        throw error;
      }
      if (
        !['healthy', 'rollback-available'].includes(deployment.state)
        || !deployment.activeRelease
      ) {
        const error = new Error('Finish a healthy exact Release deployment before checking server publishing readiness.');
        error.code = 'DEPLOYMENT_PUBLICATION_ACTIVE_DEPLOYMENT_REQUIRED';
        throw error;
      }
      const diagnostic = await active.remoteDeployment.inspectPublicationCapability(deployment.id);
      const snapshot = store.snapshot(req.params.slug);
      if (!snapshot) return res.sendStatus(404);
      return res.render('hivenues/deployment-publication-capability', {
        pageTitle: `Server publishing readiness — ${snapshot.draft.identity.displayName}`,
        ...buildViewModel(snapshot),
        deployment,
        diagnostic,
        publicationMigrationAvailable: Boolean(
          active.remoteDeployment
          && typeof active.remoteDeployment.preparePublicationMigrationReview === 'function'
          && typeof active.remoteDeployment.migratePublicationCapability === 'function'
        ),
      });
    } catch (error) {
      return render(req, res, {
        status: deploymentErrorStatus(error),
        error: deploymentErrorMessage(
          error,
          'Server publishing readiness could not be inspected.',
        ),
      });
    }
  });

  router.get('/studio/:slug/deploy/:deploymentId/publication-upgrade-review', async (req, res) => {
    try {
      const active = requireServices(services);
      if (
        !active.remoteDeployment
        || typeof active.remoteDeployment.preparePublicationMigrationReview !== 'function'
      ) {
        const error = new Error('One-time server publishing upgrade review is unavailable.');
        error.code = 'DEPLOYMENT_PUBLICATION_MIGRATION_UNAVAILABLE';
        throw error;
      }
      const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
      const review = await active.remoteDeployment.preparePublicationMigrationReview(deployment.id);
      const snapshot = store.snapshot(req.params.slug);
      if (!snapshot) return res.sendStatus(404);
      return res.render('hivenues/deployment-publication-upgrade-review', {
        pageTitle: `One-time server upgrade — ${snapshot.draft.identity.displayName}`,
        ...buildViewModel(snapshot),
        deployment,
        review,
      });
    } catch (error) {
      return render(req, res, {
        status: deploymentErrorStatus(error),
        error: deploymentErrorMessage(
          error,
          'One-time server publishing upgrade review could not be prepared.',
        ),
      });
    }
  });

  router.post('/studio/:slug/deploy/:deploymentId/publication-upgrade', async (req, res) => {
    try {
      const active = requireServices(services);
      const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
      if (
        deployment.providerKind !== 'ssh-server'
        || !active.remoteDeployment
        || typeof active.remoteDeployment.migratePublicationCapability !== 'function'
      ) {
        const error = new Error('One-time server publishing upgrade is unavailable.');
        error.code = 'DEPLOYMENT_PUBLICATION_MIGRATION_UNAVAILABLE';
        throw error;
      }
      await active.remoteDeployment.migratePublicationCapability(
        deployment.id,
        requireDeploymentConsequenceSubmission(req.body),
      );
      return res.redirect(
        303,
        `/hivenues/studio/${encodeURIComponent(req.params.slug)}/deploy/`
          + `${encodeURIComponent(deployment.id)}/publication-capability`,
      );
    } catch (error) {
      return render(req, res, {
        status: deploymentErrorStatus(error),
        error: deploymentErrorMessage(
          error,
          'One-time server publishing upgrade could not continue.',
        ),
      });
    }
  });

  router.get('/studio/:slug/deploy/:deploymentId/recovery-review', async (req, res) => {
    try {
      const active = requireServices(services);
      if (
        !active.remoteDeployment
        || typeof active.remoteDeployment.prepareRecoveryFinalization !== 'function'
      ) {
        const error = new Error('Interrupted deployment recovery finalization is unavailable.');
        error.code = 'DEPLOYMENT_MUTATION_UNAVAILABLE';
        throw error;
      }
      const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
      const review = await active.remoteDeployment.prepareRecoveryFinalization(deployment.id);
      const snapshot = store.snapshot(req.params.slug);
      if (!snapshot) return res.sendStatus(404);
      return res.render('hivenues/deployment-recovery-review', {
        pageTitle: `Recovery finalization — ${snapshot.draft.identity.displayName}`,
        ...buildViewModel(snapshot),
        deployment,
        review,
      });
    } catch (error) {
      return render(req, res, {
        status: deploymentErrorStatus(error),
        error: deploymentErrorMessage(
          error,
          'Interrupted deployment recovery review could not be prepared.',
        ),
      });
    }
  });

  router.post(
    '/studio/:slug/deploy/:deploymentId/finalize-recovery',
    mutateAsync(async (active, req) => {
      const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
      if (
        deployment.providerKind !== 'ssh-server'
        || !active.remoteDeployment
        || typeof active.remoteDeployment.finalizeInterruptedRecovery !== 'function'
      ) {
        const error = new Error('Interrupted deployment recovery finalization is unavailable.');
        error.code = 'DEPLOYMENT_MUTATION_UNAVAILABLE';
        throw error;
      }
      await active.remoteDeployment.finalizeInterruptedRecovery(
        deployment.id,
        requireDeploymentConsequenceSubmission(req.body),
      );
    }),
  );

  router.get('/studio/:slug/deploy/:deploymentId/review', (req, res) => {
    try {
      const active = requireServices(services);
      if (!active.remoteDeployment) {
        const error = new Error('Qualified server deployment is unavailable in this runtime.');
        error.code = 'DEPLOYMENT_MUTATION_UNAVAILABLE';
        throw error;
      }
      const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
      const review = active.remoteDeployment.prepareReview(deployment.id);
      const snapshot = store.snapshot(req.params.slug);
      if (!snapshot) return res.sendStatus(404);
      return res.render('hivenues/deployment-review', {
        pageTitle: `Deployment review — ${snapshot.draft.identity.displayName}`,
        ...buildViewModel(snapshot),
        deployment,
        review,
      });
    } catch (error) {
      return render(req, res, {
        status: deploymentErrorStatus(error),
        error: error.message || 'Deployment consequence review could not be prepared.',
      });
    }
  });

  router.post('/studio/:slug/deploy/:deploymentId/deploy-exact', mutateAsync(async (active, req) => {
    const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
    if (deployment.providerKind !== 'ssh-server' || !active.remoteDeployment) {
      const error = new Error('Qualified server deployment is unavailable in this runtime.');
      error.code = 'DEPLOYMENT_MUTATION_UNAVAILABLE';
      throw error;
    }
    await active.remoteDeployment.deploy(
      deployment.id,
      requireDeploymentConsequenceSubmission(req.body),
    );
  }));

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

  router.post('/studio/:slug/deploy/:deploymentId/domain/preflight', mutate((active, req) => {
    const deployment = ownedDeployment(active, req.params.slug, req.params.deploymentId);
    if (deployment.providerKind !== 'ssh-server') {
      const error = new Error('Domain setup requires a real server deployment target.');
      error.code = 'DEPLOYMENT_TARGET_KIND_INVALID';
      throw error;
    }
    if (!['healthy', 'rollback-available'].includes(deployment.state) || !deployment.activeRelease) {
      const error = new Error('Finish a healthy exact Release deployment before connecting a domain.');
      error.code = 'DEPLOYMENT_DOMAIN_HEALTHY_REQUIRED';
      throw error;
    }
    if (
      deployment.publicEndpoint
      && !['dns-instructions-ready', 'dns-mismatch'].includes(deployment.publicEndpoint.domainState)
    ) {
      const error = new Error(
        'This domain has already advanced beyond editable preflight. Preserve its proof before changing it.',
      );
      error.code = 'DEPLOYMENT_DOMAIN_PREFLIGHT_LOCKED';
      throw error;
    }
    const hostname = requireDomainPreflightSubmission(req.body);
    const endpoint = createDomainPreflight({
      hostname,
      destinations: [domainDestination(deployment)],
    });
    active.deploymentStore.setPublicEndpoint(deployment.id, endpoint);
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
  deploymentErrorMessage,
  requireConnectionFacts,
  requireDeploymentConsequenceSubmission,
  requireDomainPreflightSubmission,
  requireHostKeyAcceptance,
};
