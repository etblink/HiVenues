'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { TURNKEY_ASSET_DIRECTORY, resolveTurnkeyWorkspace } = require('./turnkey-workspace');

const MAX_MANAGED_IMAGE_BYTES = 8 * 1024 * 1024;
const MANAGED_MEDIA_FILENAME_PATTERN = /^media-[0-9a-f]{20}\.(?:png|jpg|gif)$/;
const STARTER_MEDIA_FILENAME_PATTERN = /^starter-(?:logo|hero|gallery)\.svg$/;

class ManagedAssetError extends Error {
  constructor(message, options = {}) {
    super(`HiVenues media import failed: ${message}`, options);
    this.name = 'ManagedAssetError';
  }
}

function positiveDimension(value, label) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 8192) {
    throw new ManagedAssetError(`${label} must be between 1 and 8192 pixels`);
  }
  return value;
}

function inspectPng(bytes) {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return null;
  return Object.freeze({
    extension: 'png',
    mediaType: 'image/png',
    width: positiveDimension(bytes.readUInt32BE(16), 'image width'),
    height: positiveDimension(bytes.readUInt32BE(20), 'image height'),
  });
}

function inspectGif(bytes) {
  if (bytes.length < 10) return null;
  const signature = bytes.subarray(0, 6).toString('ascii');
  if (signature !== 'GIF87a' && signature !== 'GIF89a') return null;
  return Object.freeze({
    extension: 'gif',
    mediaType: 'image/gif',
    width: positiveDimension(bytes.readUInt16LE(6), 'image width'),
    height: positiveDimension(bytes.readUInt16LE(8), 'image height'),
  });
}

const JPEG_START_OF_FRAME = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function inspectJpeg(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 2 > bytes.length) break;
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
    if (JPEG_START_OF_FRAME.has(marker)) {
      if (segmentLength < 7) break;
      return Object.freeze({
        extension: 'jpg',
        mediaType: 'image/jpeg',
        height: positiveDimension(bytes.readUInt16BE(offset + 3), 'image height'),
        width: positiveDimension(bytes.readUInt16BE(offset + 5), 'image width'),
      });
    }
    offset += segmentLength;
  }
  throw new ManagedAssetError('JPEG dimensions could not be verified');
}

function inspectManagedImage(input) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input || []);
  if (!bytes.length) throw new ManagedAssetError('selected image is empty');
  if (bytes.length > MAX_MANAGED_IMAGE_BYTES) {
    throw new ManagedAssetError(`selected image exceeds the ${MAX_MANAGED_IMAGE_BYTES}-byte limit`);
  }
  const inspected = inspectPng(bytes) || inspectGif(bytes) || inspectJpeg(bytes);
  if (!inspected) throw new ManagedAssetError('only PNG, JPEG, and GIF images are accepted');
  return inspected;
}

function regularDirectory(filename, label, fsImpl = fs) {
  let stat;
  try {
    stat = fsImpl.lstatSync(filename);
  } catch (error) {
    throw new ManagedAssetError(`${label} is unavailable: ${filename}`, { cause: error });
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new ManagedAssetError(`${label} must be a real directory, not a symlink: ${filename}`);
  }
}

function prepareManagedImage({ workspaceDirectory, bytes: input, fsImpl = fs } = {}) {
  const workspace = resolveTurnkeyWorkspace(workspaceDirectory);
  regularDirectory(workspace.root, 'workspace', fsImpl);
  regularDirectory(workspace.assetDirectory, 'managed asset directory', fsImpl);
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input || []);
  const inspected = inspectManagedImage(bytes);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  const filename = `media-${digest.slice(0, 20)}.${inspected.extension}`;
  const target = path.join(workspace.assetDirectory, filename);
  if (path.dirname(target) !== workspace.assetDirectory) {
    throw new ManagedAssetError('managed media target escaped the venue-assets directory');
  }

  try {
    fsImpl.writeFileSync(target, bytes, { flag: 'wx', mode: 0o644 });
  } catch (error) {
    if (error?.code !== 'EEXIST') {
      throw new ManagedAssetError(`could not store selected image: ${error.message}`, { cause: error });
    }
    let stat;
    try {
      stat = fsImpl.lstatSync(target);
    } catch (cause) {
      throw new ManagedAssetError('existing managed media could not be inspected', { cause });
    }
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new ManagedAssetError('managed media target already exists but is not a regular file');
    }
    const existing = fsImpl.readFileSync(target);
    if (existing.length !== bytes.length || !crypto.timingSafeEqual(existing, bytes)) {
      throw new ManagedAssetError('managed media target already exists with different bytes; refusing overwrite');
    }
  }

  return Object.freeze({
    ...inspected,
    bytes: bytes.length,
    digestSha256: digest,
    filename,
    filePath: target,
    sourcePath: `/${TURNKEY_ASSET_DIRECTORY}/${filename}`,
  });
}

function managedAssetFilenameFromSourcePath(sourcePath, { allowStarter = true } = {}) {
  const value = String(sourcePath || '');
  const prefix = `/${TURNKEY_ASSET_DIRECTORY}/`;
  if (!value.startsWith(prefix)) throw new ManagedAssetError(`media path must stay under ${prefix}`);
  const filename = value.slice(prefix.length);
  if (filename.includes('/') || filename.includes('\\')) {
    throw new ManagedAssetError('media path must name one managed file without traversal');
  }
  if (!MANAGED_MEDIA_FILENAME_PATTERN.test(filename) && !(allowStarter && STARTER_MEDIA_FILENAME_PATTERN.test(filename))) {
    throw new ManagedAssetError('media path is not a recognized managed HiVenues asset');
  }
  return filename;
}

function resolveManagedAssetFile(workspaceDirectory, sourcePath, options = {}) {
  const workspace = resolveTurnkeyWorkspace(workspaceDirectory);
  const filename = managedAssetFilenameFromSourcePath(sourcePath, options);
  return path.join(workspace.assetDirectory, filename);
}

function sourceMediaReferences(source) {
  const references = [
    Object.freeze({ pointer: '/venuePackage/brand/logo/src', src: source.venuePackage.brand.logo.src }),
    Object.freeze({ pointer: '/venuePackage/home/hero/image/src', src: source.venuePackage.home.hero.image.src }),
  ];
  source.venuePackage.home.gallery.items.forEach((item, index) => {
    references.push(Object.freeze({ pointer: `/venuePackage/home/gallery/items/${index}/src`, src: item.src }));
  });
  return Object.freeze(references);
}

module.exports = {
  MANAGED_MEDIA_FILENAME_PATTERN,
  MAX_MANAGED_IMAGE_BYTES,
  ManagedAssetError,
  STARTER_MEDIA_FILENAME_PATTERN,
  inspectManagedImage,
  managedAssetFilenameFromSourcePath,
  prepareManagedImage,
  resolveManagedAssetFile,
  sourceMediaReferences,
};
