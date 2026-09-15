'use strict';

(() => {
  const creator = document.querySelector('[data-creator]');
  if (!creator) return;

  const form = creator.querySelector('form');
  const stages = Array.from(creator.querySelectorAll('[data-creator-stage]'));
  const progress = Array.from(creator.querySelectorAll('[data-creator-progress]'));
  if (!form || !stages.length) return;

  let current = Math.max(0, Math.min(stages.length - 1, Number(creator.dataset.initialStep || 0)));
  let furthest = current;

  function stepForElement(element) {
    return stages.findIndex((stage) => stage.contains(element));
  }

  function showStep(index, { focus = false } = {}) {
    current = Math.max(0, Math.min(stages.length - 1, index));
    furthest = Math.max(furthest, current);

    stages.forEach((stage, stageIndex) => {
      const active = stageIndex === current;
      stage.dataset.active = active ? 'true' : 'false';
      stage.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    progress.forEach((button, buttonIndex) => {
      if (buttonIndex === current) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.dataset.available = buttonIndex <= furthest ? 'true' : 'false';
      button.disabled = buttonIndex > furthest;
    });

    if (focus) {
      const heading = stages[current].querySelector('h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function syncAddressRequirement() {
    const mode = form.querySelector('input[name="presenceMode"]:checked')?.value || 'physical';
    const address = form.elements.address;
    if (!address) return;
    address.required = mode !== 'online';
    const hint = creator.querySelector('[data-address-hint]');
    if (hint) {
      hint.textContent = mode === 'online'
        ? 'Optional for an online-only host.'
        : 'Required for a physical or hybrid host.';
    }
  }

  function previewValue(name, fallback) {
    const field = form.elements[name];
    const value = field && 'value' in field ? String(field.value || '').trim() : '';
    return value || fallback;
  }

  function syncDirectionPreviews() {
    const name = previewValue('displayName', 'Your place');
    const type = previewValue('archetype', 'your kind of host');
    const tagline = previewValue('tagline', 'A first impression that belongs to you.');

    creator.querySelectorAll('[data-preview-name]').forEach((node) => { node.textContent = name; });
    creator.querySelectorAll('[data-preview-type]').forEach((node) => { node.textContent = type; });
    creator.querySelectorAll('[data-preview-tagline]').forEach((node) => { node.textContent = tagline; });
  }

  function validateCurrentStep() {
    syncAddressRequirement();
    const fields = Array.from(stages[current].querySelectorAll('input, textarea, select'));
    const invalid = fields.find((field) => !field.disabled && !field.checkValidity());
    if (!invalid) return true;
    invalid.reportValidity();
    invalid.focus({ preventScroll: false });
    return false;
  }

  creator.classList.add('cc-creator-enhanced');
  syncAddressRequirement();
  syncDirectionPreviews();
  showStep(current);

  creator.addEventListener('click', (event) => {
    const next = event.target.closest('[data-creator-next]');
    if (next) {
      if (!validateCurrentStep()) return;
      showStep(current + 1, { focus: true });
      return;
    }

    const back = event.target.closest('[data-creator-back]');
    if (back) {
      showStep(current - 1, { focus: true });
      return;
    }

    const progressButton = event.target.closest('[data-creator-progress]');
    if (progressButton && progressButton.dataset.available === 'true') {
      const index = progress.indexOf(progressButton);
      if (index >= 0 && index <= furthest) showStep(index, { focus: true });
    }
  });

  form.addEventListener('input', (event) => {
    if (['displayName', 'archetype', 'tagline'].includes(event.target.name)) syncDirectionPreviews();
    if (event.target.name === 'presenceMode') syncAddressRequirement();
  });

  form.addEventListener('change', (event) => {
    if (event.target.name === 'presenceMode') syncAddressRequirement();
  });

  form.addEventListener('submit', (event) => {
    syncAddressRequirement();
    const invalid = form.querySelector(':invalid');
    if (!invalid) return;
    event.preventDefault();
    const index = stepForElement(invalid);
    if (index >= 0) showStep(index, { focus: true });
    window.requestAnimationFrame(() => {
      invalid.reportValidity();
      invalid.focus({ preventScroll: false });
    });
  });
})();
