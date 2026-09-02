'use strict';

const express = require('express');
const { isDeepStrictEqual } = require('node:util');
const { LEGACY_FOURTH_STREET_DEPLOYMENT } = require('../platform/identity');
const { FOURTH_STREET_REFERENCE_VENUE } = require('../venue/reference/fourth-street');

function resolveHealthServiceName(config) {
  const venue = config?.venue;
  if (!venue || isDeepStrictEqual(venue, FOURTH_STREET_REFERENCE_VENUE)) {
    return LEGACY_FOURTH_STREET_DEPLOYMENT.serviceName;
  }
  return String(venue.id || '').trim() || LEGACY_FOURTH_STREET_DEPLOYMENT.serviceName;
}

function createHealthRouter({ config, rpcPool, deploymentIdentity, readinessChecks = [] }) {
  const router = express.Router();

  router.get('/healthz', (_req, res) => {
    const body = {
      status: 'ok',
      service: resolveHealthServiceName(config),
      environment: config.env,
      writeMode: config.hive.writeMode,
    };
    if (deploymentIdentity.exact) {
      body.build = deploymentIdentity.build;
      body.commit = deploymentIdentity.commit;
      body.tree = deploymentIdentity.tree;
    }
    res.set('Cache-Control', 'no-store').json(body);
  });

  router.get('/readyz', async (_req, res) => {
    try {
      await rpcPool.call('condenser_api', 'get_dynamic_global_properties', []);
      for (const check of readinessChecks) await check();
      res.set('Cache-Control', 'no-store').json({ status: 'ready' });
    } catch (_error) {
      res.set('Cache-Control', 'no-store').status(503).json({ status: 'not_ready' });
    }
  });

  return router;
}

module.exports = { createHealthRouter, resolveHealthServiceName };
