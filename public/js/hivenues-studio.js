'use strict';

(() => {
  const inventory = Object.freeze({
    durableStateMirror: false,
    responsibilities: Object.freeze([
      'progressively guide first-run creation without mirroring durable host state',
      'open contextual Studio editing without allocating permanent canvas space',
      'preserve server-owned save, stale-conflict, focal, and reconcile behavior',
      'present the transient first-draft handoff over the same canonical host',
      'switch the same canonical canvas between wide and narrow review geometry',
    ]),
  });

  function initCreator() {
    const root = document.querySelector('[data-creator]');
    if (!root) return;
    const form = root.querySelector('form');
    const stages = Array.from(root.querySelectorAll('[data-creator-stage]'));
    const progress = Array.from(root.querySelectorAll('[data-creator-progress]'));
    if (!form || !stages.length) return;
    let current = Math.max(0, Math.min(stages.length - 1, Number(root.dataset.initialStep || 0)));
    let furthest = current;
    const stepFor = (el) => stages.findIndex((stage) => stage.contains(el));
    const previewValue = (name, fallback) => String(form.elements[name]?.value || '').trim() || fallback;
    function show(index, focus = false) {
      current = Math.max(0, Math.min(stages.length - 1, index));
      furthest = Math.max(furthest, current);
      stages.forEach((stage, i) => { const active = i === current; stage.dataset.active = active ? 'true' : 'false'; stage.setAttribute('aria-hidden', String(!active)); });
      progress.forEach((button, i) => { if (i === current) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); button.dataset.available = i <= furthest ? 'true' : 'false'; button.disabled = i > furthest; });
      if (!focus) return;
      const heading = stages[current].querySelector('h2');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function syncPresence() {
      const online = form.querySelector('input[name="presenceMode"]:checked')?.value === 'online';
      if (form.elements.address) form.elements.address.required = !online;
      const hint = root.querySelector('[data-address-hint]');
      if (hint) hint.textContent = online ? 'Optional for an online-only host.' : 'Required for a physical or hybrid host.';
    }
    function syncPreviews() {
      const values = { name: previewValue('displayName', 'Your place'), type: previewValue('archetype', 'your kind of host'), tagline: previewValue('tagline', 'A first impression that belongs to you.') };
      root.querySelectorAll('[data-preview-name]').forEach((node) => { node.textContent = values.name; });
      root.querySelectorAll('[data-preview-type]').forEach((node) => { node.textContent = values.type; });
      root.querySelectorAll('[data-preview-tagline]').forEach((node) => { node.textContent = values.tagline; });
    }
    function validStep() {
      syncPresence();
      const invalid = Array.from(stages[current].querySelectorAll('input, textarea, select')).find((field) => !field.disabled && !field.checkValidity());
      if (!invalid) return true;
      invalid.reportValidity(); invalid.focus({ preventScroll: false }); return false;
    }
    root.classList.add('cc-creator-enhanced'); syncPresence(); syncPreviews(); show(current);
    root.addEventListener('click', (event) => {
      if (event.target.closest('[data-creator-next]')) { if (validStep()) show(current + 1, true); return; }
      if (event.target.closest('[data-creator-back]')) { show(current - 1, true); return; }
      const button = event.target.closest('[data-creator-progress]');
      if (button?.dataset.available === 'true') { const index = progress.indexOf(button); if (index >= 0 && index <= furthest) show(index, true); }
    });
    form.addEventListener('input', (event) => { if (['displayName', 'archetype', 'tagline'].includes(event.target.name)) syncPreviews(); if (event.target.name === 'presenceMode') syncPresence(); });
    form.addEventListener('change', (event) => { if (event.target.name === 'presenceMode') syncPresence(); });
    form.addEventListener('submit', (event) => {
      syncPresence();
      const invalid = form.querySelector(':invalid');
      if (!invalid) return;
      event.preventDefault();
      const index = stepFor(invalid); if (index >= 0) show(index, true);
      window.requestAnimationFrame(() => { invalid.reportValidity(); invalid.focus({ preventScroll: false }); });
    });
  }

  function initStudio() {
    const panel = () => document.querySelector('#candidate-inspector');
    const reveal = () => document.querySelector('[data-first-draft-reveal]');
    const state = () => document.querySelector('#cc-save-state');
    const sync = () => document.body.classList.toggle('cc-context-open', panel()?.dataset.open === 'true');
    function open() { const node = panel(); if (!node) return; node.dataset.open = 'true'; sync(); }
    function close() { const node = panel(); if (!node) return; node.dataset.open = 'false'; sync(); }
    function closeMenus(except = null) { document.querySelectorAll('.cc-studio-commandbar details[open]').forEach((item) => { if (item !== except) item.removeAttribute('open'); }); }
    function focusPanel() { const heading = panel()?.querySelector('h2'); if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); } }
    function dismissReveal() { const node = reveal(); if (!node || node.hidden) return; node.hidden = true; document.querySelector('.cc-studio-commandbar summary')?.focus({ preventScroll: true }); }
    function presentReveal() {
      const node = reveal(); if (!node) return;
      const url = new URL(window.location.href); if (url.searchParams.get('created') !== '1') return;
      node.hidden = false; const heading = node.querySelector('h1'); if (heading) { heading.setAttribute('tabindex', '-1'); window.requestAnimationFrame(() => heading.focus({ preventScroll: true })); }
      url.searchParams.delete('created'); window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
    function focal(input) {
      const form = input.closest('[data-focal-form]'); if (!form) return;
      const x = form.querySelector('input[name="x"]'), y = form.querySelector('input[name="y"]'), preview = form.querySelector('[data-focal-preview]');
      if (!x || !y || !preview) return;
      preview.style.setProperty('--cc-fx', `${x.value}%`); preview.style.setProperty('--cc-fy', `${y.value}%`);
      const output = form.querySelector('[data-focal-output]'); if (output) output.textContent = `${x.value}% / ${y.value}%`;
    }
    document.querySelectorAll('.cc-studio-commandbar details').forEach((item) => item.addEventListener('toggle', () => { if (item.open) closeMenus(item); }));
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-dismiss-first-draft]')) { dismissReveal(); return; }
      const review = event.target.closest('[data-review-width]'); if (review) { const stage = document.querySelector('[data-review-stage]'); if (stage) { stage.dataset.reviewMode = review.dataset.reviewWidth; document.querySelectorAll('[data-review-width]').forEach((button) => button.setAttribute('aria-pressed', String(button === review))); } return; }
      const trigger = event.target.closest('.cc-edit-chip, [data-open-inspector]');
      if (trigger) { open(); closeMenus(); }
      if (event.target.closest('[data-close-inspector]')) close();
      if (!event.target.closest('.cc-studio-commandbar') && !trigger) closeMenus();
    });
    document.addEventListener('keydown', (event) => { if (event.key !== 'Escape') return; if (reveal() && !reveal().hidden) dismissReveal(); else if (panel()?.dataset.open === 'true') close(); });
    document.addEventListener('input', (event) => { if (event.target.matches('[data-focal-axis]')) focal(event.target); });
    document.body.addEventListener('htmx:beforeRequest', (event) => { if (!event.detail.elt.closest('.cc-inspector-form')) return; if (state()) state().textContent = 'Saving…'; });
    document.body.addEventListener('htmx:beforeSwap', (event) => {
      if (event.detail.target?.id !== 'candidate-inspector') return;
      const status = event.detail.xhr?.status;
      if (status === 409) { if (state()) state().textContent = 'Not saved'; event.detail.shouldSwap = true; event.detail.isError = false; return; }
      if (status >= 200 && status < 300 && state()) state().textContent = 'Saved';
    });
    document.body.addEventListener('htmx:afterSwap', (event) => { if (event.detail.target?.id !== 'candidate-inspector') return; if (panel()?.dataset.open === 'true') { open(); focusPanel(); } else sync(); });
    document.body.addEventListener('htmx:afterRequest', (event) => { if (event.detail.elt.closest('.cc-inspector-form') && event.detail.xhr?.status === 409 && state()) state().textContent = 'Not saved'; });
    window.addEventListener('pageshow', async () => {
      const rendered = document.querySelector('#draft-status')?.dataset.revision; if (!rendered) return;
      try {
        const response = await fetch(window.location.href, { cache: 'no-store' }); if (!response.ok) throw new Error(`Studio reconcile returned ${response.status}`);
        const html = await response.text(); const parsed = new window.DOMParser().parseFromString(html, 'text/html'); const serverRevision = parsed.querySelector('#draft-status')?.dataset.revision;
        if (!serverRevision || serverRevision !== rendered) window.location.reload();
      } catch { window.location.reload(); }
    });
    sync(); presentReveal();
  }

  initCreator();
  initStudio();
  window.HiVenuesStudio = inventory;
})();
