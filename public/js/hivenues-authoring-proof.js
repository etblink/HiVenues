'use strict';

// Slice 0: focus handoff only. No selection manifest, editable host state, writes,
// automatic resizing or mutation/approval knowledge is carried in this island.
(() => {
  const frame = document.getElementById('proof-document');
  const enter = document.getElementById('enter-document');
  const status = document.getElementById('document-status');
  if (!frame || !enter || !status) return;
  enter.addEventListener('click', () => {
    const doc = frame.contentDocument;
    const first = doc?.querySelector('a[href], button, input, select, textarea, [tabindex="0"]');
    if (first) first.focus();
    else frame.focus();
  });
  let observedDocument = null;
  const ready = () => {
    const doc = frame.contentDocument;
    if (doc?.URL === 'about:blank' || doc === observedDocument) return;
    observedDocument = doc;
    if (!doc?.querySelector('main')) {
      status.textContent = 'The document could not be loaded, or the draft changed. Show the document again to review the current draft.';
      return;
    }
    status.textContent = 'Read-only document · ' + frame.contentWindow.innerWidth + ' × ' + frame.contentWindow.innerHeight + ' CSS pixels';
    doc.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); enter.focus(); }
    });
    // Disabled links remain styled and focusable; the server already removed
    // their destinations and the document CSP forbids execution and form effects.
    doc.addEventListener('click', (event) => {
      if (event.target.closest('[aria-disabled="true"]')) {
        event.preventDefault();
        status.textContent = 'That visitor action is unavailable in this read-only proof.';
      }
    });
  };
  frame.addEventListener('load', ready);
  if (frame.contentDocument?.readyState === 'complete') ready();
})();
