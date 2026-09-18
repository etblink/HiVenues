'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ZIP_METHOD_DEFLATE = 8;
const ZIP_UTF8_FLAG = 0x0800;
const ZIP_VERSION = 20;
const DOS_TIME = 0;
const DOS_DATE = 0x0021; // 1980-01-01

function parseArgs(argv) {
  const out = { bundle: '', output: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--bundle') out.bundle = path.resolve(argv[++index] || '');
    else if (arg === '--output') out.output = path.resolve(argv[++index] || '');
    else throw new Error('Unknown Windows distributable build argument: ' + arg);
  }
  if (!out.bundle) throw new Error('--bundle is required.');
  if (!out.output) throw new Error('--output is required.');
  return out;
}

function sortedDirectoryEntries(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => (
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0
  ));
}

function collectFiles(root, relative = '') {
  const directory = path.join(root, relative);
  const files = [];
  for (const entry of sortedDirectoryEntries(directory)) {
    const childRelative = relative ? path.join(relative, entry.name) : entry.name;
    const childPath = path.join(root, childRelative);
    if (entry.isDirectory()) {
      files.push(...collectFiles(root, childRelative));
      continue;
    }
    const stat = fs.lstatSync(childPath);
    if (stat.isSymbolicLink()) {
      throw new Error('Windows distributable does not admit symbolic links: ' + childRelative);
    }
    if (!stat.isFile()) {
      throw new Error('Windows distributable contains an unsupported filesystem entry: ' + childRelative);
    }
    files.push(childRelative.split(path.sep).join('/'));
  }
  return files;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function uint32(value, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error(label + ' exceeds classic ZIP limits.');
  }
  return value;
}

function makeLocalHeader({ name, crc, compressedSize, uncompressedSize }) {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(ZIP_VERSION, 4);
  header.writeUInt16LE(ZIP_UTF8_FLAG, 6);
  header.writeUInt16LE(ZIP_METHOD_DEFLATE, 8);
  header.writeUInt16LE(DOS_TIME, 10);
  header.writeUInt16LE(DOS_DATE, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(compressedSize, 18);
  header.writeUInt32LE(uncompressedSize, 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28);
  return header;
}

function makeCentralHeader({ name, crc, compressedSize, uncompressedSize, offset }) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(ZIP_VERSION, 4);
  header.writeUInt16LE(ZIP_VERSION, 6);
  header.writeUInt16LE(ZIP_UTF8_FLAG, 8);
  header.writeUInt16LE(ZIP_METHOD_DEFLATE, 10);
  header.writeUInt16LE(DOS_TIME, 12);
  header.writeUInt16LE(DOS_DATE, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(compressedSize, 20);
  header.writeUInt32LE(uncompressedSize, 24);
  header.writeUInt16LE(name.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);
  return header;
}

function makeEndOfCentralDirectory({ entries, centralSize, centralOffset }) {
  if (entries > 0xffff) throw new Error('Windows distributable exceeds classic ZIP entry-count limits.');
  const record = Buffer.alloc(22);
  record.writeUInt32LE(0x06054b50, 0);
  record.writeUInt16LE(0, 4);
  record.writeUInt16LE(0, 6);
  record.writeUInt16LE(entries, 8);
  record.writeUInt16LE(entries, 10);
  record.writeUInt32LE(centralSize, 12);
  record.writeUInt32LE(centralOffset, 16);
  record.writeUInt16LE(0, 20);
  return record;
}

function writeAll(fd, buffer) {
  let offset = 0;
  while (offset < buffer.length) {
    offset += fs.writeSync(fd, buffer, offset, buffer.length - offset);
  }
}

function writeDeterministicZip({ root, output, prefix }) {
  const rootPath = path.resolve(root);
  const outputPath = path.resolve(output);
  const files = collectFiles(rootPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.rmSync(outputPath, { force: true });

  const fd = fs.openSync(outputPath, 'wx', 0o600);
  const central = [];
  let archiveOffset = 0;
  let uncompressedBytes = 0;

  try {
    for (const relative of files) {
      const data = fs.readFileSync(path.join(rootPath, ...relative.split('/')));
      const compressed = zlib.deflateRawSync(data, { level: 9 });
      const name = Buffer.from(prefix + relative, 'utf8');
      const crc = crc32(data);
      const compressedSize = uint32(compressed.length, 'Compressed file size');
      const uncompressedSize = uint32(data.length, 'Uncompressed file size');
      const localOffset = uint32(archiveOffset, 'Archive offset');
      const localHeader = makeLocalHeader({ name, crc, compressedSize, uncompressedSize });

      writeAll(fd, localHeader);
      writeAll(fd, name);
      writeAll(fd, compressed);

      archiveOffset += localHeader.length + name.length + compressed.length;
      uncompressedBytes += data.length;
      central.push({ name, crc, compressedSize, uncompressedSize, offset: localOffset });
    }

    const centralOffset = uint32(archiveOffset, 'Central-directory offset');
    for (const entry of central) {
      const header = makeCentralHeader(entry);
      writeAll(fd, header);
      writeAll(fd, entry.name);
      archiveOffset += header.length + entry.name.length;
    }
    const centralSize = uint32(archiveOffset - centralOffset, 'Central-directory size');
    writeAll(fd, makeEndOfCentralDirectory({
      entries: central.length,
      centralSize,
      centralOffset,
    }));
  } finally {
    fs.closeSync(fd);
  }

  return Object.freeze({
    fileCount: files.length,
    uncompressedBytes,
    archiveBytes: fs.statSync(outputPath).size,
  });
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function readJson(file, label) {
  let value;
  try {
    value = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(label + ' is missing or invalid JSON.', { cause: error });
  }
  return value;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const provenance = readJson(path.join(options.bundle, 'build-provenance.json'), 'Bundle provenance');
  const packageRecord = readJson(path.join(options.bundle, 'app', 'package.json'), 'Packaged application manifest');

  if (provenance.platform !== 'win32' || provenance.arch !== 'x64') {
    throw new Error('Tranche-2 distributables currently require a Windows x64 bundle.');
  }
  if (!/^[a-f0-9]{40}$/i.test(String(provenance.sourceSha || ''))) {
    throw new Error('Bundle provenance is missing a full source SHA.');
  }
  if (!/^[a-f0-9]{40}$/i.test(String(provenance.sourceTree || ''))) {
    throw new Error('Bundle provenance is missing a full source tree SHA.');
  }
  if (String(packageRecord.version || '') !== String(provenance.packageVersion || '')) {
    throw new Error('Packaged application version disagrees with bundle provenance.');
  }

  const version = packageRecord.version;
  const baseName = 'HiVenues-Studio-' + version + '-windows-x64';
  const archiveName = baseName + '.zip';
  const archivePath = path.join(options.output, archiveName);
  const prefix = baseName + '/';

  fs.rmSync(options.output, { recursive: true, force: true });
  fs.mkdirSync(options.output, { recursive: true });

  const archive = writeDeterministicZip({
    root: options.bundle,
    output: archivePath,
    prefix,
  });
  const archiveSha256 = sha256(archivePath);

  const releaseProvenance = {
    distributableProvenanceVersion: 1,
    product: 'HiVenues Studio',
    packageVersion: version,
    platform: 'windows',
    arch: 'x64',
    qualificationArtifact: true,
    signing: 'unsigned',
    sourceSha: provenance.sourceSha,
    sourceTree: provenance.sourceTree,
    nodeVersion: provenance.nodeVersion,
    packageManager: provenance.packageManager,
    archive: {
      file: archiveName,
      sha256: archiveSha256,
      bytes: archive.archiveBytes,
      fileCount: archive.fileCount,
      uncompressedBytes: archive.uncompressedBytes,
    },
  };

  const provenanceName = baseName + '.provenance.json';
  const checksumName = baseName + '.sha256';
  fs.writeFileSync(
    path.join(options.output, provenanceName),
    JSON.stringify(releaseProvenance, null, 2) + '\n',
    'utf8',
  );
  fs.writeFileSync(
    path.join(options.output, checksumName),
    archiveSha256 + '  ' + archiveName + '\n',
    'utf8',
  );

  process.stdout.write(JSON.stringify({
    result: 'PASS',
    archivePath,
    archiveSha256,
    provenancePath: path.join(options.output, provenanceName),
    checksumPath: path.join(options.output, checksumName),
    ...archive,
  }, null, 2) + '\n');
}

if (require.main === module) {
  main();
}

module.exports = {
  collectFiles,
  crc32,
  sha256,
  writeDeterministicZip,
};
