'use strict';

(() => {
  const inventory = Object.freeze({
    durableStateMirror: false,
    responsibilities: Object.freeze([
      'open and close the contextual editor without allocating permanent canvas space',
      'restore focus after server-rendered inspector swaps',
      'preview media focal position before an explicit server commit',
      'mark transient saving state while an HTMX request is in flight',
      'render server-owned stale-revision conflicts without treating them as successful saves',
      'coordinate compact Studio command menus without mirroring durable host state',
      'present and dismiss the first-draft handoff without creating a second host model',
      'reconcile page restoration with current server truth',
    ]),
  });

  function inspector() {
    return document.querySelector('#candidate-inspector');
  }

  function syncContextState() {
    const panel = inspector();
    const open = panel?.dataset.open === 'true';
    document.body.classList.toggle('cc-context-open', open);
  }

  function openInspector() {
    const panel = inspector();
    if (!panel) return;
    panel.dataset.open = 'true';
    syncContextState();
  }

  function closeInspector() {
    const panel = inspector();
    if (!panel) return;
    panel.dataset.open = 'false';
    syncContextState();
  }

  function focusInspector(panel = inspector()) {
    if (!panel) return;
    const heading = panel.querySelector('h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }

  function closeCommandMenus(except = null) {
    document.querySelectorAll('.cc-studio-commandbar details[open]').forEach((item) => {
      if (item !== except) item.removeAttribute('open');
    });
  }

  function firstDraftReveal() {
    return document.querySelector('[data-first-draft-reveal]');
  }

  function dismissFirstDraftReveal() {
    const reveal = firstDraftReveal();
    if (!reveal || reveal.hidden) return;
    reveal.hidden = true;
    const canvas = document.querySelector('.cc-studio-commandbar summary');
    if (canvas) canvas.focus({ preventScroll: true });
  }

  function presentFirstDraftIfCreated() {
    const reveal = firstDraftReveal();
    if (!reveal) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('created') !== '1') return;

    reveal.hidden = false;
    const heading = reveal.querySelector('h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      window.requestAnimationFrame(() => heading.focus({ preventScroll: true }));
    }

    // The reveal is a one-time handoff state, not durable host state. Remove the
    // query marker so reload/back does not pretend a new host was created again.
    url.searchParams.delete('created');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
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

  document.querySelectorAll('.cc-studio-commandbar details').forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open) closeCommandMenus(item);
    });
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-dismiss-first-draft]')) {
      dismissFirstDraftReveal();
      return;
    }

    const editTrigger = event.target.closest('.cc-edit-chip, [data-open-inspector]');
    if (editTrigger) {
      openInspector();
      closeCommandMenus();
    }

    if (event.target.closest('[data-close-inspector]')) closeInspector();

    if (!event.target.closest('.cc-studio-commandbar') && !editTrigger) {
      closeCommandMenus();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && firstDraftReveal() && !firstDraftReveal().hidden) {
      dismissFirstDraftReveal();
      return;
    }
    if (event.key === 'Escape' && inspector()?.dataset.open === 'true') closeInspector();
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
    if (event.detail.target?.id !== 'candidate-inspector') return;
    const state = document.querySelector('#cc-save-state');
    const status = event.detail.xhr?.status;
    if (status === 409) {
      // HTMX does not swap non-2xx responses by default. A stale write remains an
      // HTTP 409, but its server-rendered conflict panel is still useful UI.
      if (state) state.textContent = 'Not saved';
      event.detail.shouldSwap = true;
      event.detail.isError = false;
      return;
    }
    if (status >= 200 && status < 300 && state) state.textContent = 'Saved';
  });

  document.body.addEventListener('htmx:afterSwap', (event) => {
    if (event.detail.target?.id !== 'candidate-inspector') return;
    const panel = inspector();
    if (!panel) return;
    if (panel.dataset.open === 'true') {
      openInspector();
      // The inspector swaps with outerHTML, so event.detail.target is the detached
      // previous panel. Focus must land in the live panel the server just rendered.
      focusInspector(panel);
    } else {
      syncContextState();
    }
  });

  document.body.addEventListener('htmx:afterRequest', (event) => {
    if (!event.detail.elt.closest('.cc-inspector-form')) return;
    const state = document.querySelector('#cc-save-state');
    if (!state) return;
    const stale = event.detail.xhr?.status === 409;
    if (stale) state.textContent = 'Not saved';
  });

  window.addEventListener('pageshow', async () => {
    // Revalidate every displayed Studio document against server-owned revision truth.
    // Initial loads normally match and stop here; a stale history-restored document
    // reloads once, after which the rendered and server revisions agree.
    const rendered = document.querySelector('#draft-status')?.dataset.revision;
    if (!rendered) return;
    try {
      const response = await fetch(window.location.href, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Studio reconcile returned ${response.status}`);
      const html = await response.text();
      const parsed = new window.DOMParser().parseFromString(html, 'text/html');
      const serverRevision = parsed.querySelector('#draft-status')?.dataset.revision;
      if (!serverRevision || serverRevision !== rendered) window.location.reload();
    } catch {
      window.location.reload();
    }
  });

  syncContextState();
  presentFirstDraftIfCreated();
  window.CandidateCStudio = inventory;
})();
