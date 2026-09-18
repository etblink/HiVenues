'use strict';

const { PreflightStore } = require('../social/preflight-store');

const DEFAULT_PARTICIPATION_PREFLIGHT_TTL_MS = 10 * 60 * 1000;

function hasParticipationReadContract(hiveReadService) {
  return Boolean(
    hiveReadService
      && typeof hiveReadService.getProfile === 'function'
      && typeof hiveReadService.getFollowStatus === 'function'
      && typeof hiveReadService.isCommunityMember === 'function'
      && typeof hiveReadService.observeSocialOperation === 'function',
  );
}

function createHiVenuesParticipationServices({
  hiveReadService = null,
  preflightStore = null,
  preflightTtlMs = DEFAULT_PARTICIPATION_PREFLIGHT_TTL_MS,
  now = Date.now,
  random,
} = {}) {
  if (!hasParticipationReadContract(hiveReadService)) return null;

  return Object.freeze({
    hiveReadService,
    preflightStore: preflightStore || new PreflightStore({
      ttlMs: preflightTtlMs,
      now,
      ...(random ? { random } : {}),
    }),
  });
}

module.exports = {
  DEFAULT_PARTICIPATION_PREFLIGHT_TTL_MS,
  createHiVenuesParticipationServices,
  hasParticipationReadContract,
};
