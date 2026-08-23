'use strict';

const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} = require('../lib/errors');
const { parseAsset } = require('../hive/assets');

const PAYMENT_SCHEMA_VERSION = 2;
const TRANSACTION_ID_PATTERN = /^[0-9a-f]{40}$/;
const RECEIPT_STATES = Object.freeze({
  VALIDATED: 'Validated',
  AWAITING_SIGNATURE: 'AwaitingSignature',
  BROADCAST_ACCEPTED: 'BroadcastAccepted',
  CHAIN_CONFIRMED: 'ChainConfirmed',
  CONFIRMATION_TIMEOUT: 'ConfirmationTimeout',
  CANCELLED: 'Cancelled',
});
const UNRESOLVED_STATES = Object.freeze([
  RECEIPT_STATES.VALIDATED,
  RECEIPT_STATES.AWAITING_SIGNATURE,
  RECEIPT_STATES.BROADCAST_ACCEPTED,
  RECEIPT_STATES.CONFIRMATION_TIMEOUT,
]);

function receiptId() {
  return randomBytes(24).toString('base64url');
}

function assertSafeDatabaseTarget(filename, { requireExisting = false } = {}) {
  if (filename === ':memory:') return;
  const directory = path.dirname(filename);
  let directoryStat;
  try {
    directoryStat = fs.lstatSync(directory);
  } catch (error) {
    throw new Error('Payment database directory is unavailable', { cause: error });
  }
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
    throw new Error('Payment database directory is unsafe');
  }
  if (!fs.existsSync(filename)) {
    if (requireExisting) throw new Error('Payment database must already exist');
    return;
  }
  const fileStat = fs.lstatSync(filename);
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
    throw new Error('Payment database target is unsafe');
  }
}

function inspectReceiptStore(filename) {
  assertSafeDatabaseTarget(filename, { requireExisting: true });
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    db.enableDefensive?.(true);
    db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    const integrity = db.prepare('PRAGMA quick_check').get();
    const integrityValue = integrity && Object.values(integrity)[0];
    if (integrityValue !== 'ok') throw new Error('Payment database integrity check failed');
    const foreignKeys = db.prepare('PRAGMA foreign_key_check').all();
    if (foreignKeys.length > 0) throw new Error('Payment database foreign-key check failed');
    const version = db
      .prepare("SELECT version FROM hive_bar_schema WHERE name = 'receipts'")
      .get()?.version;
    if (version !== PAYMENT_SCHEMA_VERSION) {
      throw new Error('Unsupported Hive-Bar receipt schema version');
    }
    return Object.freeze({ schemaVersion: version, integrity: 'ok' });
  } finally {
    db.close();
  }
}

function sqliteConstraint(error) {
  return (
    String(error?.code || '').startsWith('ERR_SQLITE_CONSTRAINT') ||
    /(?:UNIQUE|PRIMARY KEY) constraint failed/i.test(String(error?.message || ''))
  );
}

class ReceiptStore {
  constructor({
    filename = ':memory:',
    now = Date.now,
    random = receiptId,
    database,
    requireExisting = false,
  } = {}) {
    this.filename = filename;
    this.now = now;
    this.random = random;
    if (!database) assertSafeDatabaseTarget(filename, { requireExisting });
    this.db = database || new DatabaseSync(filename);
    this.db.enableDefensive?.(true);
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    if (filename !== ':memory:') {
      this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
    }
    this.#migrate();
  }

  #migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hive_bar_schema (
        name TEXT PRIMARY KEY,
        version INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS payment_receipts (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        account TEXT NOT NULL,
        merchant TEXT NOT NULL,
        amount TEXT NOT NULL,
        amount_milli INTEGER NOT NULL CHECK (amount_milli > 0),
        memo TEXT NOT NULL,
        operations_json TEXT NOT NULL,
        summary_json TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        authority TEXT NOT NULL CHECK (authority = 'Active'),
        state TEXT NOT NULL CHECK (state IN (
          'Validated', 'AwaitingSignature', 'BroadcastAccepted',
          'ChainConfirmed', 'ConfirmationTimeout', 'Cancelled'
        )),
        transaction_id TEXT UNIQUE,
        block_number INTEGER,
        transaction_index INTEGER,
        chain_timestamp TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        broadcast_at TEXT,
        confirmed_at TEXT,
        observation_checks INTEGER NOT NULL DEFAULT 0,
        diagnostic TEXT
      ) STRICT;
      CREATE INDEX IF NOT EXISTS payment_receipts_session_idx
        ON payment_receipts (session_id, updated_at DESC);
    `);

    const existingVersion = this.db
      .prepare("SELECT version FROM hive_bar_schema WHERE name = 'receipts'")
      .get()?.version;

    if (existingVersion === undefined) {
      this.db
        .prepare('INSERT INTO hive_bar_schema (name, version) VALUES (?, ?)')
        .run('receipts', PAYMENT_SCHEMA_VERSION);
    } else if (![1, PAYMENT_SCHEMA_VERSION].includes(existingVersion)) {
      throw new Error('Unsupported Hive-Bar receipt schema version');
    }

    this.db.exec(`
      DROP INDEX IF EXISTS payment_receipts_fingerprint_active_idx;
      CREATE UNIQUE INDEX IF NOT EXISTS payment_receipts_fingerprint_idx
        ON payment_receipts (fingerprint);
      CREATE UNIQUE INDEX IF NOT EXISTS payment_receipts_unresolved_payer_idx
        ON payment_receipts (account)
        WHERE state IN ('Validated', 'AwaitingSignature', 'BroadcastAccepted', 'ConfirmationTimeout');
    `);

    if (existingVersion === 1) {
      this.db
        .prepare("UPDATE hive_bar_schema SET version = ? WHERE name = 'receipts' AND version = 1")
        .run(PAYMENT_SCHEMA_VERSION);
    }

    const version = this.db
      .prepare("SELECT version FROM hive_bar_schema WHERE name = 'receipts'")
      .get()?.version;
    if (version !== PAYMENT_SCHEMA_VERSION) {
      throw new Error('Unsupported Hive-Bar receipt schema version');
    }
  }

  health() {
    const integrity = this.db.prepare('PRAGMA quick_check').get();
    const integrityValue = integrity && Object.values(integrity)[0];
    if (integrityValue !== 'ok') throw new Error('Payment database integrity check failed');
    const foreignKeys = this.db.prepare('PRAGMA foreign_key_check').all();
    if (foreignKeys.length > 0) throw new Error('Payment database foreign-key check failed');
    const schemaVersion = this.db
      .prepare("SELECT version FROM hive_bar_schema WHERE name = 'receipts'")
      .get()?.version;
    if (schemaVersion !== PAYMENT_SCHEMA_VERSION) {
      throw new Error('Unsupported Hive-Bar receipt schema version');
    }
    return Object.freeze({ schemaVersion, integrity: 'ok' });
  }

  createValidated({ sessionId, envelope }) {
    const [type, transfer] = envelope?.operations?.[0] || [];
    const parsedAmount = parseAsset(transfer?.amount, 'HBD');
    if (
      type !== 'transfer' ||
      !sessionId ||
      !parsedAmount ||
      envelope.account !== transfer.from ||
      envelope.authority !== 'Active'
    ) {
      throw new ValidationError('The payment envelope is invalid');
    }
    const now = new Date(this.now()).toISOString();
    const id = this.random();
    try {
      this.db.prepare(`
        INSERT INTO payment_receipts (
          id, session_id, account, merchant, amount, amount_milli, memo,
          operations_json, summary_json, fingerprint, authority, state,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', 'Validated', ?, ?)
      `).run(
        id,
        sessionId,
        envelope.account,
        transfer.to,
        parsedAmount.canonical,
        Number(parsedAmount.units),
        transfer.memo,
        JSON.stringify(envelope.operations),
        JSON.stringify(envelope.summary),
        envelope.fingerprint,
        now,
        now,
      );
    } catch (error) {
      if (!sqliteConstraint(error)) throw error;
      const duplicate = this.db
        .prepare('SELECT id FROM payment_receipts WHERE fingerprint = ? LIMIT 1')
        .get(envelope.fingerprint);
      if (duplicate) {
        throw new ConflictError('This exact payment is already prepared or recorded', {
          code: 'DUPLICATE_PAYMENT',
        });
      }
      const unresolved = this.db.prepare(`
        SELECT id FROM payment_receipts
        WHERE account = ?
          AND state IN ('Validated', 'AwaitingSignature', 'BroadcastAccepted', 'ConfirmationTimeout')
        LIMIT 1
      `).get(envelope.account);
      if (unresolved) {
        throw new ConflictError(
          'This account already has an unresolved payment. Recheck or cancel that receipt before starting another.',
          { code: 'PAYMENT_UNRESOLVED' },
        );
      }
      throw error;
    }
    return this.publicRecord(this.#record(this.#row(id)));
  }

  get(id, sessionId, account = null) {
    const row = this.#row(String(id || ''));
    if (!row) throw new NotFoundError('The payment receipt was not found');
    if (row.session_id !== sessionId && row.account !== account) {
      throw new AuthorizationError('This payment receipt belongs to another verified account', {
        code: 'PAYMENT_SESSION_MISMATCH',
      });
    }
    return this.#record(row);
  }

  latest(sessionId, account = null) {
    const row = this.db.prepare(`
      SELECT * FROM payment_receipts
      WHERE (session_id = ? OR account = ?) AND state != 'Cancelled'
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    `).get(sessionId, account);
    return row ? this.publicRecord(this.#record(row)) : null;
  }

  markAwaitingSignature(id, sessionId, account = null) {
    const record = this.get(id, sessionId, account);
    if (record.state === RECEIPT_STATES.AWAITING_SIGNATURE) return this.publicRecord(record);
    if (record.state !== RECEIPT_STATES.VALIDATED) {
      throw new ConflictError('Only a validated payment may await a Keychain signature', {
        code: 'PAYMENT_STATE_CONFLICT',
      });
    }
    this.#transition(id, RECEIPT_STATES.VALIDATED, RECEIPT_STATES.AWAITING_SIGNATURE);
    return this.publicRecord(this.get(id, sessionId, account));
  }

  cancel(id, sessionId, account = null) {
    const record = this.get(id, sessionId, account);
    if (record.state === RECEIPT_STATES.CANCELLED) return this.publicRecord(record);
    if (![RECEIPT_STATES.VALIDATED, RECEIPT_STATES.AWAITING_SIGNATURE].includes(record.state)) {
      throw new ConflictError('A broadcast-accepted payment cannot be cancelled', {
        code: 'PAYMENT_NOT_CANCELLABLE',
      });
    }
    this.#transition(id, record.state, RECEIPT_STATES.CANCELLED);
    return this.publicRecord(this.get(id, sessionId, account));
  }

  markBroadcastAccepted(id, sessionId, transactionIdValue, account = null) {
    const transactionId = transactionIdValue
      ? String(transactionIdValue).toLowerCase()
      : null;
    if (transactionId && !TRANSACTION_ID_PATTERN.test(transactionId)) {
      throw new ValidationError('A valid Hive transaction id is required');
    }
    const record = this.get(id, sessionId, account);
    if (
      [RECEIPT_STATES.BROADCAST_ACCEPTED, RECEIPT_STATES.CONFIRMATION_TIMEOUT, RECEIPT_STATES.CHAIN_CONFIRMED]
        .includes(record.state)
    ) {
      if (record.transactionId !== transactionId) {
        throw new ConflictError('This payment already has a different transaction id', {
          code: 'TRANSACTION_ID_CONFLICT',
        });
      }
      return this.publicRecord(record);
    }
    if (record.state !== RECEIPT_STATES.AWAITING_SIGNATURE) {
      throw new ConflictError('Exact review must be accepted before recording a broadcast', {
        code: 'PAYMENT_REVIEW_REQUIRED',
      });
    }
    const now = new Date(this.now()).toISOString();
    try {
      const result = this.db.prepare(`
        UPDATE payment_receipts
        SET state = 'BroadcastAccepted', transaction_id = ?, broadcast_at = ?,
            updated_at = ?, diagnostic = NULL
        WHERE id = ? AND state = 'AwaitingSignature'
      `).run(transactionId, now, now, id);
      if (result.changes !== 1) throw new ConflictError('The payment state changed concurrently');
    } catch (error) {
      if (sqliteConstraint(error)) {
        throw new ConflictError('This transaction id is already attached to another receipt', {
          code: 'DUPLICATE_TRANSACTION',
        });
      }
      throw error;
    }
    return this.publicRecord(this.get(id, sessionId, account));
  }

  applyObservation(id, sessionId, observation, account = null) {
    const record = this.get(id, sessionId, account);
    if (record.state === RECEIPT_STATES.CHAIN_CONFIRMED) return this.publicRecord(record);
    if (![RECEIPT_STATES.BROADCAST_ACCEPTED, RECEIPT_STATES.CONFIRMATION_TIMEOUT].includes(record.state)) {
      throw new ConflictError('Broadcast acceptance is required before chain observation', {
        code: 'BROADCAST_ACCEPTANCE_REQUIRED',
      });
    }
    const now = new Date(this.now()).toISOString();
    const diagnostic = String(observation?.diagnostic || 'Awaiting exact two-node confirmation').slice(0, 500);
    if (observation?.status === 'confirmed') {
      if (!Number.isSafeInteger(observation.blockNumber) || observation.blockNumber <= 0) {
        throw new ValidationError('Confirmed observation requires a valid Hive block number');
      }
      this.db.prepare(`
        UPDATE payment_receipts
        SET state = 'ChainConfirmed', block_number = ?, transaction_index = ?,
            chain_timestamp = ?, confirmed_at = ?, updated_at = ?,
            observation_checks = observation_checks + 1, diagnostic = NULL
        WHERE id = ? AND state IN ('BroadcastAccepted', 'ConfirmationTimeout')
      `).run(
        observation.blockNumber,
        Number.isSafeInteger(observation.transactionIndex) ? observation.transactionIndex : null,
        observation.chainTimestamp || null,
        now,
        now,
        id,
      );
    } else {
      this.db.prepare(`
        UPDATE payment_receipts
        SET observation_checks = observation_checks + 1, updated_at = ?, diagnostic = ?
        WHERE id = ? AND state IN ('BroadcastAccepted', 'ConfirmationTimeout')
      `).run(now, diagnostic, id);
    }
    return this.publicRecord(this.get(id, sessionId, account));
  }

  markConfirmationTimeout(
    id,
    sessionId,
    diagnostic = 'Confirmation timed out; recheck the chain before paying again',
    account = null,
  ) {
    const record = this.get(id, sessionId, account);
    if (record.state === RECEIPT_STATES.CONFIRMATION_TIMEOUT) return this.publicRecord(record);
    if (record.state !== RECEIPT_STATES.BROADCAST_ACCEPTED) return this.publicRecord(record);
    const now = new Date(this.now()).toISOString();
    this.db.prepare(`
      UPDATE payment_receipts
      SET state = 'ConfirmationTimeout', updated_at = ?, diagnostic = ?
      WHERE id = ? AND state = 'BroadcastAccepted'
    `).run(now, String(diagnostic).slice(0, 500), id);
    return this.publicRecord(this.get(id, sessionId, account));
  }

  publicRecord(record) {
    return {
      id: record.id,
      account: record.account,
      merchant: record.merchant,
      amount: record.amount,
      memo: record.memo,
      operations: record.operations,
      summary: record.summary,
      fingerprint: record.fingerprint,
      authority: record.authority,
      state: record.state,
      transactionId: record.transactionId,
      blockNumber: record.blockNumber,
      transactionIndex: record.transactionIndex,
      chainTimestamp: record.chainTimestamp,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      broadcastAt: record.broadcastAt,
      confirmedAt: record.confirmedAt,
      observationChecks: record.observationChecks,
      diagnostic: record.diagnostic,
    };
  }

  close() {
    this.db.close();
  }

  #transition(id, expected, next) {
    const now = new Date(this.now()).toISOString();
    const result = this.db
      .prepare('UPDATE payment_receipts SET state = ?, updated_at = ? WHERE id = ? AND state = ?')
      .run(next, now, id, expected);
    if (result.changes !== 1) {
      throw new ConflictError('The payment state changed concurrently', {
        code: 'PAYMENT_STATE_CONFLICT',
      });
    }
  }

  #row(id) {
    return this.db.prepare('SELECT * FROM payment_receipts WHERE id = ?').get(id);
  }

  #record(row) {
    return {
      id: row.id,
      sessionId: row.session_id,
      account: row.account,
      merchant: row.merchant,
      amount: row.amount,
      memo: row.memo,
      operations: JSON.parse(row.operations_json),
      summary: JSON.parse(row.summary_json),
      fingerprint: row.fingerprint,
      authority: row.authority,
      state: row.state,
      transactionId: row.transaction_id,
      blockNumber: row.block_number,
      transactionIndex: row.transaction_index,
      chainTimestamp: row.chain_timestamp,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      broadcastAt: row.broadcast_at,
      confirmedAt: row.confirmed_at,
      observationChecks: row.observation_checks,
      diagnostic: row.diagnostic,
    };
  }
}

module.exports = {
  PAYMENT_SCHEMA_VERSION,
  RECEIPT_STATES,
  ReceiptStore,
  TRANSACTION_ID_PATTERN,
  UNRESOLVED_STATES,
  assertSafeDatabaseTarget,
  inspectReceiptStore,
};
