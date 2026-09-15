'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 12000;
const MAX_IMAGE_PIXELS = 50_000_000;
const MAX_MULTIPART_BYTES = MAX_IMAGE_BYTES + 64 * 1024;
const MULTIPART_FIELDS = new Set(['expectedRevision', 'expectedDraftDigest', 'role', 'alt', 'caption']);

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

function parseMultipartForm(body, contentType) {
  if (!Buffer.isBuffer(body) || body.length === 0 || body.length > MAX_MULTIPART_BYTES) {
    throw mediaError('MEDIA_MULTIPART_INVALID', 'Media form payload is missing or too large.');
  }
  const match = /^multipart\/form-data\s*;\s*boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(String(contentType || ''));
  const boundary = match ? (match[1] || match[2]) : '';
  if (!/^[A-Za-z0-9'()+_,.\/:=?-]{1,70}$/.test(boundary)) {
    throw mediaError('MEDIA_MULTIPART_INVALID', 'Media form boundary is invalid.');
  }

  const marker = `--${boundary}`;
  const raw = body.toString('latin1');
  if (!raw.startsWith(marker) || !raw.includes(`${marker}--`)) throw mediaError('MEDIA_MULTIPART_INVALID', 'Media form is incomplete.');
  const chunks = raw.split(marker).slice(1, -1);
  const fields = {};
  let imageBuffer = null;

  for (let chunk of chunks) {
    if (chunk.startsWith('\r\n')) chunk = chunk.slice(2);
    if (chunk.endsWith('\r\n')) chunk = chunk.slice(0, -2);
    const headerEnd = chunk.indexOf('\r\n\r\n');
    if (headerEnd < 0) throw mediaError('MEDIA_MULTIPART_INVALID', 'Media form part is malformed.');
    const headers = chunk.slice(0, headerEnd);
    const value = Buffer.from(chunk.slice(headerEnd + 4), 'latin1');
    const disposition = headers.split('\r\n').find((line) => /^content-disposition:/i.test(line)) || '';
    const nameMatch = /\bname="([^"]+)"/i.exec(disposition);
    if (!nameMatch) throw mediaError('MEDIA_MULTIPART_INVALID', 'Media form part has no field name.');
    const name = nameMatch[1];
    const filenameMatch = /\bfilename="([^"]*)"/i.exec(disposition);

    if (name === 'image') {
      if (!filenameMatch || imageBuffer) throw mediaError('MEDIA_MULTIPART_INVALID', 'Provide exactly one image file.');
      imageBuffer = value;
      continue;
    }
    if (!MULTIPART_FIELDS.has(name) || filenameMatch || Object.hasOwn(fields, name) || value.length > 4096) {
      throw mediaError('MEDIA_MULTIPART_INVALID', 'Media form contains unexpected or duplicate authority.');
    }
    fields[name] = value.toString('utf8');
  }

  if (!imageBuffer) throw mediaError('MEDIA_EMPTY', 'Choose a JPEG or PNG image.');
  return { fields, imageBuffer, inspection: inspectImage(imageBuffer) };
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
  MAX_MULTIPART_BYTES,
  defaultLocalMediaRoot,
  inspectImage,
  parseMultipartForm,
  persistLocalImage,
  removeLocalImageIfNew,
};
