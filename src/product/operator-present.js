'use strict';

// Presentation only. Canonical stores and deployment services remain authoritative.
const { isDeepStrictEqual } = require('node:util');
const { requirePreflight } = require('./deployment-publication');

function publicEvidenceMatches(target) {
  const endpoint = target.publicEndpoint;
  try { requirePreflight(endpoint); } catch { return false; }
  const proof = endpoint?.publicReadBack;
  const expected = proof?.observation?.expected;
  const observed = proof?.observation?.observed;
  const active = target.activeRelease;
  const runtime = target.runtimeProfile;
  if (target.providerKind !== 'ssh-server' || !['healthy', 'rollback-available', 'disconnected'].includes(target.state)
    || proof?.state !== 'verified' || endpoint?.tls?.state !== 'verified'
    || !active || !runtime || !expected || !observed) return false;
  const releaseIdentity = { hostSlug: target.hostSlug, releaseId: active.id, releaseDigest: active.digest, packageDigest: active.packageDigest };
  const runtimeKeys = ['sourceSha', 'sourceTree', 'packageVersion', 'nodeVersion', 'bundleDigest'];
  return Object.entries(releaseIdentity).every(([key, value]) => value && expected.release?.[key] === value && observed.deployment?.[key] === value)
    && runtimeKeys.every((key) => runtime[key] && expected.runtime?.[key] === runtime[key] && observed.runtime?.[key] === runtime[key]);
}

function contentChanges(before, after) {
  if (!before) return [{ label: 'Complete website', before: null, after: 'The entire saved copy is included. Use Preview this copy to review it.' }];
  const fields = [
    ['Name', before.identity.displayName, after.identity.displayName],
    ['Headline', before.facts.tagline, after.facts.tagline],
    ['Introduction', before.facts.summary, after.facts.summary],
    ['Contact', before.facts.contact, after.facts.contact],
    ['Visit details', before.facts.presence, after.facts.presence],
    ['Story & invitation', before.intent, after.intent],
    ['Design', before.presentation, after.presentation],
    ['Activities', before.activities, after.activities],
    ['Offers', before.offers, after.offers],
    ['Images', before.media, after.media],
    ['Action wording', before.voice, after.voice],
    ['Stories', before.stories, after.stories],
    ['People', before.people, after.people],
    ['Gallery', before.gallery, after.gallery],
    ['Navigation', before.navigation, after.navigation],
    ['Participation', before.participation, after.participation],
    ['Accounts & support', before.bindings, after.bindings],
  ];
  const changes = fields.filter(([, a, b]) => !isDeepStrictEqual(a, b)).map(([label, a, b]) => ({
    label, before: typeof a === 'string' ? a : null, after: typeof b === 'string' ? b : 'Updated — see the complete preview.',
  }));
  // Never silently declare no changes when the schema gains a new semantic field.
  if (!changes.length && !isDeepStrictEqual(before, after)) changes.push({ label: 'Website details', before: null, after: 'Updated — see the complete preview.' });
  return changes;
}

function presentTarget(target, snapshot) {
  const verified = publicEvidenceMatches(target);
  const proof = target.publicEndpoint?.publicReadBack;
  const activeCopy = snapshot.releases.find((copy) => copy.id === target.activeRelease?.id && copy.digest === target.activeRelease?.digest) || null;
  const simulated = target.providerKind === 'synthetic-offline';
  let title = 'Website status unknown';
  if (simulated) title = 'Simulation · ' + target.state;
  else if (verified) title = 'Website verified';
  else if (proof?.state === 'mismatch') title = 'Website does not match the expected copy';
  else if (['deploying', 'degraded', 'reauthorizing'].includes(target.state)) title = 'Update incomplete';
  else if (target.activeRelease) title = 'Public check pending';
  else if (target.state === 'bootstrap-ready') title = 'Server checked. Ready for setup.';
  else title = 'Website setup incomplete';
  return {
    id: target.id, simulated, title, verified, state: target.state,
    name: target.publicEndpoint?.hostname || target.targetPublicFacts?.host || target.label || 'Website destination',
    url: verified && target.publicEndpoint?.hostname ? `https://${target.publicEndpoint.hostname}` : null,
    checkedAt: proof?.observation?.checkedAt || null,
    baseline: verified ? activeCopy : null,
    installedCopy: activeCopy,
    selectedCopyId: target.selectedRelease?.id || null,
    managementDisconnected: target.state === 'disconnected',
  };
}

function buildOperatorPresentation(snapshot, services = null) {
  if (!snapshot) return null;
  const all = (services?.deploymentStore?.list(snapshot.draft.identity.slug) || []).map((target) => presentTarget(target, snapshot));
  const targets = all.filter((target) => !target.simulated);
  const latest = snapshot.releases.find((copy) => copy.id === snapshot.liveReleaseId) || null;
  const matchingCopy = snapshot.releases.slice().reverse().find((copy) => copy.digest === snapshot.draftDigest) || null;
  const canPublish = Boolean(services?.remoteDeployment);
  return {
    base: `/hivenues/studio/${encodeURIComponent(snapshot.draft.identity.slug)}`,
    draft: { revision: snapshot.revision, digest: snapshot.draftDigest, matchingCopy, differsFromLatest: latest?.digest !== snapshot.draftDigest },
    latest, targets, simulations: all.filter((target) => target.simulated), canPublish,
    title: !canPublish ? 'This Studio is local-only' : targets.length === 1 ? targets[0].title : targets.length ? 'Choose a website destination' : 'Not published yet',
    primaryLabel: !canPublish ? 'Review website' : targets.some((target) => target.installedCopy) ? 'Update website' : 'Publish website',
  };
}

module.exports = { buildOperatorPresentation, contentChanges, publicEvidenceMatches };
