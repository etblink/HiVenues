# C2-G.1 Payment Receipt Backup and Restore

This runbook applies only to the durable Hive-Bar payment receipt store at `/var/lib/hive-bar/payments/receipts.sqlite3`.
It does not enable Pay, invoke Hive Keychain, broadcast a transfer, or change onboarding/moderation state.

## Backup

1. Keep the application in an accepted state and identify the exact installed release.
2. Create the destination directory as root with restrictive permissions.
3. Use SQLite's online backup mechanism (not a raw copy of a live WAL database) while running as `hivebar`.
4. Record the backup path, SHA-256, owner/mode, source application commit/tree, and the read-only inspection result from `scripts/prepare-payment-storage.js` or `inspectReceiptStore`.
5. Preserve the backup as an acceptance artifact; do not overwrite an earlier accepted backup.

Example operator pattern (paths/timestamps must be chosen deliberately at execution time):

```sh
install -d -o root -g root -m 0700 /var/backups/hive-bar/payments
runuser -u hivebar -- /usr/local/bin/node - <<'NODE'
const { backup, DatabaseSync } = require('node:sqlite');
const source = new DatabaseSync('/var/lib/hive-bar/payments/receipts.sqlite3', { readOnly: true });
const target = `/var/backups/hive-bar/payments/receipts.sqlite3.${process.env.BACKUP_STAMP}.bak`;
(async () => {
  try { await backup(source, target); }
  finally { source.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
NODE
```

If the installed Node runtime does not expose the required online backup API, stop and use the separately reviewed SQLite-consistent backup method. Do not fall back to copying live database/WAL files casually.

## Restore

Restore is a separately authorized production mutation. Before restoring:

1. stop the application cleanly;
2. preserve the current database and WAL/SHM files as forensic rollback artifacts;
3. verify the chosen backup SHA-256 and provenance;
4. verify the destination directory is a non-symlink directory owned by `hivebar:hivebar` mode `0700`;
5. restore to a temporary regular non-symlink file, set owner `hivebar:hivebar` and mode `0600`, and run the current release's payment-store inspection;
6. replace the destination atomically only after integrity, foreign-key, and schema-version checks pass;
7. start the service once and re-qualify health/readiness before allowing Pay exposure.

Never restore by merging receipt rows, inventing transaction IDs, changing a receipt from unresolved to paid, or replaying a payment. Ambiguous or unresolved receipts remain observation-only until exact chain evidence resolves them.
