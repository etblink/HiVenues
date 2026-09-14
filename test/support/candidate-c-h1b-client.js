'use strict';
/* global document, window, htmx */

(() => {
  const state = { draggedSectionId: null, focalDraft: null };

  function panelIdFor(resourceId) {
    if (resourceId?.startsWith('activity:')) return 'panel-activity';
    if (resourceId === 'host:tagline') return 'panel-tagline';
    if (resourceId?.startsWith('media:')) return 'panel-media';
    return '';
  }

  function select(resourceId, panelId) {
    document.body.dataset.selectedResource = resourceId || '';
    document.querySelectorAll('[data-context-panel]').forEach((panel) => {
      panel.hidden = panel.id !== panelId;
    });
    const sheet = document.querySelector('#context-sheet');
    if (sheet) sheet.dataset.open = panelId ? 'true' : 'false';
    const heading = panelId && document.querySelector(`#${panelId} h2`);
    if (heading) heading.focus({ preventScroll: true });
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-select-resource]');
    if (trigger) {
      event.preventDefault();
      select(trigger.dataset.selectResource, trigger.dataset.panelId);
      trigger.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
    const close = event.target.closest('[data-close-context]');
    if (close) select('', '');
    const cancelFocal = event.target.closest('[data-cancel-focal]');
    if (cancelFocal) {
      state.focalDraft = null;
      const preview = document.querySelector('#focal-preview');
      const form = document.querySelector('#focal-form');
      if (preview) preview.style.setProperty('--fx', `${preview.dataset.serverX}%`);
      if (preview) preview.style.setProperty('--fy', `${preview.dataset.serverY}%`);
      if (form && preview) {
        form.elements.x.value = preview.dataset.serverX;
        form.elements.y.value = preview.dataset.serverY;
      }
    }
  });

  document.addEventListener('dragstart', (event) => {
    const handle = event.target.closest('[data-drag-section]');
    if (!handle) return;
    state.draggedSectionId = handle.dataset.dragSection;
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  });

  document.addEventListener('dragover', (event) => {
    if (event.target.closest('[data-drop-before]') && state.draggedSectionId) event.preventDefault();
  });

  document.addEventListener('drop', (event) => {
    const target = event.target.closest('[data-drop-before]');
    if (!target || !state.draggedSectionId) return;
    event.preventDefault();
    const revision = document.querySelector('#draft-status')?.dataset.revision;
    htmx.ajax('POST', '/studio/reorder', {
      target: '#section-order',
      swap: 'outerHTML',
      values: { sectionId: state.draggedSectionId, beforeId: target.dataset.dropBefore, expectedRevision: revision },
    });
    state.draggedSectionId = null;
  });

  document.addEventListener('pointerdown', (event) => {
    const preview = event.target.closest('#focal-preview');
    if (!preview) return;
    const rect = preview.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    state.focalDraft = { x: Math.round(x), y: Math.round(y) };
    preview.style.setProperty('--fx', `${state.focalDraft.x}%`);
    preview.style.setProperty('--fy', `${state.focalDraft.y}%`);
    const form = document.querySelector('#focal-form');
    if (form) {
      form.elements.x.value = state.focalDraft.x;
      form.elements.y.value = state.focalDraft.y;
    }
  });

  document.body.addEventListener('htmx:configRequest', (event) => {
    if (!Object.hasOwn(event.detail.parameters, 'expectedRevision')) return;
    const revision = document.querySelector('#draft-status')?.dataset.revision;
    if (revision) event.detail.parameters.expectedRevision = revision;
  });

  document.body.addEventListener('htmx:beforeSwap', (event) => {
    if (event.detail.xhr.status === 409) {
      event.detail.shouldSwap = true;
      event.detail.isError = false;
      event.detail.target = document.querySelector('#conflict');
      event.detail.swapOverride = 'innerHTML';
    }
  });

  document.body.addEventListener('htmx:afterSwap', (event) => {
    const selected = document.body.dataset.selectedResource;
    if (selected) {
      document.querySelector(`[data-selected-id="${selected}"]`)?.setAttribute('aria-current', 'true');
      const panel = document.querySelector(`#${panelIdFor(selected)}`);
      if (panel) {
        panel.hidden = false;
        if (event.detail.target?.id === panel.id) panel.querySelector('h2')?.focus({ preventScroll: true });
      }
      const sheet = document.querySelector('#context-sheet');
      if (sheet) sheet.dataset.open = panel ? 'true' : 'false';
    }
    const conflict = document.querySelector('#conflict-message');
    if (conflict) conflict.focus({ preventScroll: true });
  });

  window.CandidateCInteractionIsland = {
    durableStateMirror: false,
    responsibilities: ['selection', 'drag-intent', 'focal-preview', '409-swap-policy', 'focus-restoration'],
  };
})();
