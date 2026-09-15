'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 12000;
const MAX_IMAGE_PIXELS = 50_000_000;

function mediaError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function parsePng(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) return null;
  if (buffer.toString('ascii', 12, 16) !== 'IHDR') throw mediaError('MEDIA_INVALID_PNG', 'PNG is missing its IHDR header.');
  return {
    mime: 'image/png',
    extension: 'png',
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function parseJpeg(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 4 <= buffer.length) {
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) break;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) throw mediaError('MEDIA_INVALID_JPEG', 'JPEG segment length is invalid.');
    if (sof.has(marker)) {
      if (length < 7) throw mediaError('MEDIA_INVALID_JPEG', 'JPEG frame header is invalid.');
      return {
        mime: 'image/jpeg',
        extension: 'jpg',
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += length;
  }
  throw mediaError('MEDIA_INVALID_JPEG', 'JPEG dimensions could not be read.');
}

function inspectImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw mediaError('MEDIA_EMPTY', 'Choose a non-empty image.');
  if (buffer.length > MAX_IMAGE_BYTES) throw mediaError('MEDIA_TOO_LARGE', `Image must be ${MAX_IMAGE_BYTES} bytes or smaller.`);
  const parsed = parsePng(buffer) || parseJpeg(buffer);
  if (!parsed) throw mediaError('MEDIA_TYPE_UNSUPPORTED', 'Use a JPEG or PNG image.');
  if (!parsed.width || !parsed.height || parsed.width > MAX_IMAGE_DIMENSION || parsed.height > MAX_IMAGE_DIMENSION || parsed.width * parsed.height > MAX_IMAGE_PIXELS) {
    throw mediaError('MEDIA_DIMENSIONS_UNSUPPORTED', 'Image dimensions are outside the bounded dogfood media limits.');
  }
  return {
    ...parsed,
    bytes: buffer.length,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  };
}

function decodeImagePayload(payload) {
  const encoded = String(payload || '');
  if (!encoded || encoded.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 32) throw mediaError('MEDIA_PAYLOAD_INVALID', 'Image payload is missing or too large.');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw mediaError('MEDIA_PAYLOAD_INVALID', 'Image payload is not valid base64.');
  const buffer = Buffer.from(encoded, 'base64');
  return { buffer, inspection: inspectImage(buffer) };
}

function defaultLocalMediaRoot() {
  return path.join(__dirname, '..', '..', 'public', 'candidate-c', 'media', 'local');
}

function persistLocalImage({ slug, buffer, inspection, mediaRoot = defaultLocalMediaRoot() }) {
  const root = path.resolve(mediaRoot);
  const directory = path.join(root, slug);
  fs.mkdirSync(directory, { recursive: true });
  const filename = `${inspection.sha256.slice(0, 24)}.${inspection.extension}`;
  const target = path.join(directory, filename);
  const existed = fs.existsSync(target);
  if (!existed) fs.writeFileSync(target, buffer, { flag: 'wx' });
  return {
    target,
    existed,
    publicPath: `/candidate-c/media/local/${encodeURIComponent(slug)}/${filename}`,
    root,
  };
}

function removeLocalImageIfNew(record) {
  if (!record || record.existed) return;
  try {
    fs.unlinkSync(record.target);
  } catch (_) {
    // Best-effort cleanup after a rejected/stale mutation. A content-addressed orphan
    // is harmless local dogfood state and is never externally uploaded.
  }
}

module.exports = {
  MAX_IMAGE_BYTES,
  decodeImagePayload,
  defaultLocalMediaRoot,
  inspectImage,
  persistLocalImage,
  removeLocalImageIfNew,
};
