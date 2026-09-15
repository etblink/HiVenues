'use strict';

const { FileCandidateCStore } = require('./file-store');
const {
  defaultLocalMediaRoot,
  inspectImage,
  persistLocalImage,
  removeLocalImageIfNew,
} = require('./local-media');
const { provisionCandidateCHost } = require('./provision');

class ProvisioningFileCandidateCStore extends FileCandidateCStore {
  constructor(options = {}) {
    const { mediaRoot, ...storeOptions } = options;
    super(storeOptions);
    this.mediaRoot = mediaRoot || defaultLocalMediaRoot();
  }

  createHost(graph) {
    return this.mutate((store) => provisionCandidateCHost(store, graph));
  }

  importLocalImage(slug, input, expectedRevision, expectedDigest) {
    const role = input.role === 'logo' ? 'logo' : 'hero';
    const alt = String(input.alt || '').trim();
    const caption = String(input.caption || '').trim();
    if (!alt || alt.length > 300) return { ok: false, reason: 'MEDIA_ALT_INVALID' };
    if (caption.length > 300) return { ok: false, reason: 'MEDIA_CAPTION_INVALID' };

    let inspection;
    try {
      inspection = input.inspection || inspectImage(input.imageBuffer);
    } catch (error) {
      return { ok: false, reason: error.code || 'MEDIA_INVALID', message: error.message };
    }
    if (!Buffer.isBuffer(input.imageBuffer)) return { ok: false, reason: 'MEDIA_EMPTY' };

    const snapshot = this.snapshot(slug);
    if (!snapshot) return { ok: false, reason: 'NOT_FOUND' };
    const graph = snapshot.draft;
    const hero = graph.media.find((item) => item.id !== `media-${slug}-logo`) || graph.media[0];
    if (!hero) return { ok: false, reason: 'MEDIA_TARGET_MISSING' };

    const persisted = persistLocalImage({
      slug,
      buffer: input.imageBuffer,
      inspection,
      mediaRoot: this.mediaRoot,
    });
    const descriptor = {
      version: 1,
      storage: 'repo-local',
      path: persisted.publicPath,
      mime: inspection.mime,
      bytes: inspection.bytes,
      width: inspection.width,
      height: inspection.height,
      sha256: inspection.sha256,
    };
    const provenance = caption || `Photo supplied by ${graph.identity.displayName}.`;
    const logoId = `media-${slug}-logo`;

    const result = this.draftMutation(slug, expectedRevision, expectedDigest, (store) => (
      store.commit(slug, expectedRevision, `import-local-${role}`, (draft) => {
        if (role === 'logo') {
          const target = draft.media.find((item) => item.id === logoId);
          const replacement = {
            id: logoId,
            kind: 'image',
            alt,
            provenance,
            focal: target?.focal || { x: 50, y: 50 },
            palette: target?.palette || hero.palette,
            asset: descriptor,
          };
          if (target) Object.assign(target, replacement);
          else draft.media.push(replacement);
          return;
        }
        const target = draft.media.find((item) => item.id === hero.id);
        if (!target) throw new Error('Media target not found');
        target.kind = 'image';
        target.alt = alt;
        target.provenance = provenance;
        target.asset = descriptor;
      }, [
        role === 'logo' ? `media.${logoId}` : `media.${hero.id}.kind`,
        role === 'logo' ? `media.${logoId}.alt` : `media.${hero.id}.alt`,
        role === 'logo' ? `media.${logoId}.provenance` : `media.${hero.id}.provenance`,
        role === 'logo' ? `media.${logoId}.asset` : `media.${hero.id}.asset`,
      ], expectedDigest)
    ));

    if (!result.ok) removeLocalImageIfNew(persisted);
    return result.ok
      ? { ...result, mediaRole: role, asset: descriptor, mediaId: role === 'logo' ? logoId : hero.id }
      : result;
  }
}

module.exports = { ProvisioningFileCandidateCStore };
