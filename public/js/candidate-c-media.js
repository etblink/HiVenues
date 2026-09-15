'use strict';

(() => {
  function fileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('The image could not be read from this computer.'));
      reader.onload = () => {
        const value = String(reader.result || '');
        const comma = value.indexOf(',');
        if (comma < 0) reject(new Error('The image could not be encoded.'));
        else resolve(value.slice(comma + 1));
      };
      reader.readAsDataURL(file);
    });
  }

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-media-import-form]');
    if (!form) return;
    event.preventDefault();
    const fileInput = form.querySelector('[data-media-file]');
    const errorNode = form.querySelector('[data-media-error]');
    const submit = form.querySelector('button[type="submit"]');
    const file = fileInput?.files?.[0];
    if (!file) return;
    if (errorNode) {
      errorNode.hidden = true;
      errorNode.textContent = '';
    }
    if (submit) {
      submit.disabled = true;
      submit.dataset.originalLabel = submit.textContent;
      submit.textContent = 'Importing…';
    }

    try {
      const dataBase64 = await fileAsBase64(file);
      const formData = new FormData(form);
      const response = await fetch(form.action, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedRevision: formData.get('expectedRevision'),
          expectedDraftDigest: formData.get('expectedDraftDigest'),
          role: formData.get('role'),
          alt: formData.get('alt'),
          caption: formData.get('caption'),
          originalName: file.name,
          declaredMime: file.type,
          dataBase64,
        }),
      });
      const result = await response.json().catch(() => ({ ok: false, reason: `HTTP_${response.status}` }));
      if (!response.ok || !result.ok) throw new Error(result.message || result.reason || 'The image could not be imported.');
      window.location.assign(result.redirect);
    } catch (error) {
      if (errorNode) {
        errorNode.textContent = error.message || 'The image could not be imported.';
        errorNode.hidden = false;
      }
      if (submit) {
        submit.disabled = false;
        submit.textContent = submit.dataset.originalLabel || 'Import image';
      }
    }
  });
})();
