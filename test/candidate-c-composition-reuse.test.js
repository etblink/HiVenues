'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const { buildCandidateCHostFromInput } = require('../src/candidate-c/admission');
const { createDogfoodApp } = require('../src/candidate-c/dogfood-app');
const { ProvisioningFileCandidateCStore } = require('../src/candidate-c/provisioning-file-store');

const LEAK_PATTERN = /undefined|Northline|Nova Ashby|Harbor & Hearth|Sunday supper|Sunday table|harbor change color|Downtown Las Vegas · live, close, late|Field notes · live sessions · dispatches/i;

function baseInput(displayName, overrides = {}) {
  return {
    displayName,
    archetype: 'independent host',
    timezone: 'America/Los_Angeles',
    presenceMode: 'physical',
    presenceLabel: 'A truthful presence label',
    address: '10 Truth Street, Las Vegas, NV',
    tagline: `${displayName} has its own voice.`,
    summary: `${displayName} is represented only by facts entered for this host.`,
    contact: 'hello@example.test',
    purpose: `Give ${displayName} a faithful digital front door.`,
    presenceMaterial: `Materials and atmosphere belonging to ${displayName}, not a reference specimen.`,
    direction: 'poster',
    participation: `Let people understand and participate in ${displayName} without platform literacy.`,
    activityTitle: 'First Gathering',
    activityDescription: `A real activity belonging to ${displayName}.`,
    activityStartsLocal: '2026-09-18T19:30',
    activityEndsLocal: '2026-09-18T21:30',
    ...overrides,
  };
}

function build(raw) {
  const result = buildCandidateCHostFromInput(raw, { randomUUID: () => '22222222-2222-4222-8222-222222222222' });
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.graph;
}

function assertTruthfulHtml(html, expected) {
  assert.match(html, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(html, LEAK_PATTERN);
}

test('composition families remain structural across physical, online, and hybrid fresh hosts after explicit Release', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-composition-reuse-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = new ProvisioningFileCandidateCStore({ statePath: path.join(directory, 'state.json') });

  const cases = [
    {
      graph: build(baseInput('Poster Online', {
        direction: 'poster',
        presenceMode: 'online',
        presenceLabel: 'Independent online room',
        address: '',
      })),
      expectedPresence: 'Independent online room',
    },
    {
      graph: build(baseInput('Editorial Physical', {
        direction: 'editorial',
        presenceMode: 'physical',
        presenceLabel: 'Arts district workshop · Las Vegas',
        address: '20 Editorial Avenue, Las Vegas, NV',
      })),
      expectedPresence: '20 Editorial Avenue, Las Vegas, NV',
    },
    {
      graph: build(baseInput('Hospitality Hybrid', {
        direction: 'hospitality',
        presenceMode: 'hybrid',
        presenceLabel: 'Neighborhood counter + live stream',
        address: '30 Hospitality Lane, Las Vegas, NV',
      })),
      expectedPresence: 'Neighborhood counter + live stream',
    },
  ];

  for (const item of cases) {
    assert.equal(store.createHost(item.graph).ok, true);
    const working = store.snapshot(item.graph.identity.slug);
    const released = store.createRelease(item.graph.identity.slug, working.revision, working.draftDigest);
    assert.equal(released.ok, true);
  }
  const app = createDogfoodApp({ store });

  for (const { graph, expectedPresence } of cases) {
    const slug = graph.identity.slug;
    const publicPage = await request(app).get(`/candidate-c/${slug}`).expect(200);
    assertTruthfulHtml(publicPage.text, graph.identity.displayName);
    assert.match(publicPage.text, new RegExp(graph.intent.presenceMaterial.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    const activity = graph.activities[0];
    const activityPage = await request(app).get(`/candidate-c/${slug}/activities/${activity.slug}`).expect(200);
    assertTruthfulHtml(activityPage.text, expectedPresence);
  }
});
