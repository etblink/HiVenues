'use strict';

(() => {
  const inventory = Object.freeze({
    durableStateMirror: false,
    responsibilities: Object.freeze([
      'open and close the mobile contextual inspector',
      'restore focus after server-rendered inspector swaps',
      'preview media focal position before an explicit server commit',
      'mark transient saving state while an HTMX request is in flight',
      'render server-owned stale-revision conflicts without treating them as successful saves',
      'reconcile history restoration with current server truth',
    ]),
  });

  function inspector() {
    return document.querySelector('#candidate-inspector');
  }

  function openInspector() {
    const panel = inspector();
    if (!panel) return;
    panel.dataset.open = 'true';
  }

  function closeInspector() {
    const panel = inspector();
    if (!panel) return;
    panel.dataset.open = 'false';
  }

  function focusInspector(panel = inspector()) {
    if (!panel) return;
    const heading = panel.querySelector('h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }

  function updateFocalPreview(input) {
    const form = input.closest('[data-focal-form]');
    if (!form) return;
    const x = form.querySelector('input[name="x"]');
    const y = form.querySelector('input[name="y"]');
    const preview = form.querySelector('[data-focal-preview]');
    if (!x || !y || !preview) return;
    preview.style.setProperty('--cc-fx', `${x.value}%`);
    preview.style.setProperty('--cc-fy', `${y.value}%`);
    const output = form.querySelector('[data-focal-output]');
    if (output) output.textContent = `${x.value}% / ${y.value}%`;
  }

  document.addEventListener('click', (event) => {
    const editTrigger = event.target.closest('.cc-edit-chip, [data-open-inspector]');
    if (editTrigger) openInspector();
    if (event.target.closest('[data-close-inspector]')) closeInspector();
  });

  document.addEventListener('input', (event) => {
    if (event.target.matches('[data-focal-axis]')) updateFocalPreview(event.target);
  });

  document.body.addEventListener('htmx:beforeRequest', (event) => {
    if (!event.detail.elt.closest('.cc-inspector-form')) return;
    const state = document.querySelector('#cc-save-state');
    if (state) state.textContent = 'Saving…';
  });

  document.body.addEventListener('htmx:beforeSwap', (event) => {
    if (event.detail.xhr?.status !== 409) return;
    if (event.detail.target?.id !== 'candidate-inspector') return;
    // HTMX does not swap non-2xx responses by default. A stale write remains an
    // HTTP 409, but its server-rendered conflict panel is still useful UI.
    event.detail.shouldSwap = true;
    event.detail.isError = false;
  });

  document.body.addEventListener('htmx:afterSwap', (event) => {
    if (event.detail.target?.id !== 'candidate-inspector') return;
    openInspector();
    focusInspector(event.detail.target);
  });

  document.body.addEventListener('htmx:afterRequest', (event) => {
    if (!event.detail.elt.closest('.cc-inspector-form')) return;
    const state = document.querySelector('#cc-save-state');
    if (!state) return;
    const stale = event.detail.xhr?.status === 409;
    state.textContent = !stale && event.detail.successful ? 'Saved to draft' : 'Not saved';
  });

  const historyMarker = `candidate-c:return:${window.location.pathname}`;

  window.addEventListener('pagehide', () => {
    sessionStorage.setItem(historyMarker, '1');
  });

  window.addEventListener('pageshow', async (event) => {
    const returning = event.persisted || sessionStorage.getItem(historyMarker) === '1';
    if (!returning) return;
    sessionStorage.removeItem(historyMarker);
    const rendered = document.querySelector('#draft-status')?.dataset.revision;
    if (!rendered) return;
    try {
      const response = await fetch(window.location.href, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Studio reconcile returned ${response.status}`);
      const html = await response.text();
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const serverRevision = parsed.querySelector('#draft-status')?.dataset.revision;
      if (!serverRevision || serverRevision !== rendered) window.location.reload();
    } catch {
      window.location.reload();
    }
  });

  window.CandidateCStudio = inventory;
})();
