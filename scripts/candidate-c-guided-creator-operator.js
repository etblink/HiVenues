'use strict';

const assert = require('node:assert/strict');

async function chooseLabelledChoice(page, name, value, labelClass) {
  const input = page.locator(`[name="${name}"][value="${value}"]`);
  const labels = page.locator(labelClass || 'label').filter({ has: input });
  assert.equal(await labels.count(), 1, `expected one visible ${name} choice for ${value}`);
  await labels.click();
  assert.equal(await input.isChecked(), true, `${name}=${value} was not selected`);
}

async function fillPurpose(page, values) {
  await page.locator('[name="displayName"]').fill(values.displayName);
  await page.locator('[name="archetype"]').fill(values.archetype);
  await page.locator('[name="tagline"]').fill(values.tagline);
  await page.locator('[name="purpose"]').fill(values.purpose);
}

async function advanceToPresence(page) {
  await page.getByRole('button', { name: 'Show the next consequence' }).click();
  await page.getByRole('heading', { name: 'What makes this place feel real?' }).waitFor();
}

async function fillPresence(page, values) {
  await chooseLabelledChoice(page, 'presenceMode', values.presenceMode, 'label.cc-creator-choice');
  await page.locator('[name="presenceLabel"]').fill(values.presenceLabel);
  await page.locator('[name="address"]').fill(values.address || '');
  await page.locator('[name="contact"]').fill(values.contact);
  await page.locator('[name="timezone"]').fill(values.timezone);
  await page.locator('[name="summary"]').fill(values.summary);
  await page.locator('[name="presenceMaterial"]').fill(values.presenceMaterial);
}

async function advanceToDirection(page) {
  await page.getByRole('button', { name: 'See directions' }).click();
  await page.getByRole('heading', { name: 'Which world feels most like this host?' }).waitFor();
}

async function chooseDirection(page, direction) {
  await chooseLabelledChoice(page, 'direction', direction, 'label.cc-direction-choice');
}

async function advanceToParticipation(page) {
  await page.getByRole('button', { name: 'Shape participation' }).click();
  await page.getByRole('heading', { name: 'What can people meaningfully do here?' }).waitFor();
}

async function fillParticipation(page, values) {
  await page.locator('[name="participation"]').fill(values.participation);
  const activity = values.activity;
  if (!activity) return;
  const optional = page.locator('details.cc-creator-optional');
  if (!(await optional.getAttribute('open'))) await optional.locator('summary').click();
  await page.locator('[name="activityTitle"]').fill(activity.title);
  await page.locator('[name="activityDescription"]').fill(activity.description);
  await page.locator('[name="activityStartsLocal"]').fill(activity.startsLocal);
  await page.locator('[name="activityEndsLocal"]').fill(activity.endsLocal);
}

async function fillGuidedCreator(page, values) {
  await fillPurpose(page, values);
  await advanceToPresence(page);
  await fillPresence(page, values);
  await advanceToDirection(page);
  await chooseDirection(page, values.direction);
  await advanceToParticipation(page);
  await fillParticipation(page, values);
}

async function submitFirstDraft(page) {
  await page.getByRole('button', { name: 'Create my first draft' }).click();
}

async function dismissFirstDraftReveal(page) {
  const button = page.getByRole('button', { name: 'Open Studio' });
  if (await button.count()) {
    await button.waitFor({ state: 'visible' });
    await button.click();
  }
}

module.exports = {
  advanceToDirection,
  advanceToParticipation,
  advanceToPresence,
  chooseDirection,
  chooseLabelledChoice,
  dismissFirstDraftReveal,
  fillGuidedCreator,
  fillParticipation,
  fillPresence,
  fillPurpose,
  submitFirstDraft,
};
