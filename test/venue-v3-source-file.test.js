'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  deriveV3DeploymentAgnosticVenueSourceDigest,
  serializeV3DeploymentAgnosticVenueSource,
} = require('../src/venue/v3/source');
const {
  V3_PERSISTED_SOURCE_ABSENT,
  V3VenueSourceFileError,
  atomicSaveV3DeploymentAgnosticVenueSourceFile,
  inspectV3DeploymentAgnosticVenueSourceFile,
  loadV3DeploymentAgnosticVenueSourceFile,
  parseV3DeploymentAgnosticVenueSourceFile,
} = require('../src/venue/v3/source-file');
const {
  REFERENCE_FACTORIES,
} = require('./support/v3-reference-fixtures');

function withWorkspace(fn) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-v3-source-'));
  try {
    return fn(workspace);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}

function replacedInodeStat(stat) {
  return new Proxy(stat, {
    get(target, property) {
      if (property === 'ino') {
        return typeof target.ino === 'bigint' ? target.ino + 1n : target.ino + 1;
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

test('v3 source persistence saves exact canonical bytes and fresh reopen preserves the domain-separated digest for R1/R2/R3', () => {
  const originalFetch = global.fetch;
  global.fetch = () => { throw new Error('network access forbidden in S2 persistence'); };
  try {
    for (const [name, factory] of Object.entries(REFERENCE_FACTORIES)) {
      withWorkspace((workspace) => {
        const filename = path.join(workspace, `${name}.json`);
        const source = factory();
        const expectedBytes = serializeV3DeploymentAgnosticVenueSource(source);
        const expectedDigest = deriveV3DeploymentAgnosticVenueSourceDigest(source);
        const before = inspectV3DeploymentAgnosticVenueSourceFile(filename);
        assert.equal(before.persistedDigest, V3_PERSISTED_SOURCE_ABSENT, name);

        const saved = atomicSaveV3DeploymentAgnosticVenueSourceFile(filename, source, {
          expectedDigest: V3_PERSISTED_SOURCE_ABSENT,
        });
        assert.equal(saved.created, true, name);
        assert.equal(saved.persistedDigest, expectedDigest, name);
        assert.equal(saved.bytes, expectedBytes, name);
        assert.equal(fs.readFileSync(filename, 'utf8'), expectedBytes, name);

        const reopened = loadV3DeploymentAgnosticVenueSourceFile(filename);
        assert.equal(deriveV3DeploymentAgnosticVenueSourceDigest(reopened), expectedDigest, name);
        assert.equal(serializeV3DeploymentAgnosticVenueSource(reopened), expectedBytes, name);
      });
    }
  } finally {
    global.fetch = originalFetch;
  }
});

test('v3 source persistence rejects stale overwrite without changing accepted bytes', () => {
  withWorkspace((workspace) => {
    const filename = path.join(workspace, 'venue-source-v3.json');
    const first = REFERENCE_FACTORIES.nativeCreator();
    const second = REFERENCE_FACTORIES.nativeRelease();
    const saved = atomicSaveV3DeploymentAgnosticVenueSourceFile(filename, first, {
      expectedDigest: V3_PERSISTED_SOURCE_ABSENT,
    });
    const beforeBytes = fs.readFileSync(filename, 'utf8');
    assert.throws(
      () => atomicSaveV3DeploymentAgnosticVenueSourceFile(filename, second, {
        expectedDigest: '0'.repeat(64),
      }),
      /persisted source changed/,
    );
    assert.equal(fs.readFileSync(filename, 'utf8'), beforeBytes);
    assert.equal(saved.persistedDigest, deriveV3DeploymentAgnosticVenueSourceDigest(first));
  });
});

test('v3 source persistence rejects noncanonical persisted bytes and unsafe destination symlink authority', () => {
  withWorkspace((workspace) => {
    const filename = path.join(workspace, 'venue-source-v3.json');
    const source = REFERENCE_FACTORIES.nativeCreator();
    const canonical = serializeV3DeploymentAgnosticVenueSource(source);
    const noncanonical = JSON.stringify(JSON.parse(canonical), null, 2);
    fs.writeFileSync(filename, noncanonical, 'utf8');
    assert.throws(
      () => inspectV3DeploymentAgnosticVenueSourceFile(filename),
      /not exact canonical v3 serialization/,
    );

    fs.writeFileSync(filename, canonical, 'utf8');
    const realLstat = fs.lstatSync.bind(fs);
    const fsImpl = {
      ...fs,
      lstatSync(candidate) {
        const stat = realLstat(candidate);
        if (path.resolve(candidate) !== path.resolve(filename)) return stat;
        return new Proxy(stat, {
          get(target, property) {
            if (property === 'isSymbolicLink') return () => true;
            const value = Reflect.get(target, property, target);
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
      },
    };
    assert.throws(
      () => inspectV3DeploymentAgnosticVenueSourceFile(filename, { fsImpl }),
      /not a symlink/,
    );
  });
});

test('v3 source persistence detects same-digest destination path replacement during staged save', () => {
  withWorkspace((workspace) => {
    const filename = path.join(workspace, 'venue-source-v3.json');
    const source = REFERENCE_FACTORIES.nativeCreator();
    const initial = atomicSaveV3DeploymentAgnosticVenueSourceFile(filename, source, {
      expectedDigest: V3_PERSISTED_SOURCE_ABSENT,
    });
    const beforeBytes = fs.readFileSync(filename, 'utf8');
    const realLstat = fs.lstatSync.bind(fs);
    let destinationInspections = 0;
    const fsImpl = {
      ...fs,
      lstatSync(candidate) {
        const stat = realLstat(candidate);
        if (path.resolve(candidate) === path.resolve(filename)) {
          destinationInspections += 1;
          if (destinationInspections >= 2) return replacedInodeStat(stat);
        }
        return stat;
      },
    };
    assert.throws(
      () => atomicSaveV3DeploymentAgnosticVenueSourceFile(filename, source, {
        expectedDigest: initial.persistedDigest,
        fsImpl,
      }),
      /path was replaced during save/,
    );
    assert.equal(fs.readFileSync(filename, 'utf8'), beforeBytes);
  });
});

test('v3 source-file parser rejects invalid v3 payloads and persistence requires an explicit filename', () => {
  assert.throws(() => parseV3DeploymentAgnosticVenueSourceFile('{"schemaVersion":3}'), V3VenueSourceFileError);
  assert.throws(
    () => atomicSaveV3DeploymentAgnosticVenueSourceFile('', REFERENCE_FACTORIES.nativeCreator(), {
      expectedDigest: V3_PERSISTED_SOURCE_ABSENT,
    }),
    /explicit local path/,
  );
});
