'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');
const persistentBase = process.env.PERSISTENT_DISK_PATH
  ? path.resolve(process.env.PERSISTENT_DISK_PATH)
  : null;

function copyMissingTree(src, dst, stats) {
  if (!fs.existsSync(src)) return;

  const st = fs.statSync(src);

  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });

    for (const name of fs.readdirSync(src)) {
      copyMissingTree(
        path.join(src, name),
        path.join(dst, name),
        stats
      );
    }
    return;
  }

  if (!fs.existsSync(dst)) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    stats.files++;
    stats.bytes += st.size;
    console.log(`[persistent] copied ${path.relative(APP_ROOT, src)} -> ${dst}`);
  } else {
    stats.skipped++;
  }
}

function main() {
  if (!persistentBase) {
    console.log('[persistent] PERSISTENT_DISK_PATH not set — using normal local storage.');
    return;
  }

  const persistentData = path.join(persistentBase, 'data');
  const persistentUploads = path.join(persistentBase, 'uploads');

  const sourceData = path.join(APP_ROOT, 'data');
  const sourceUploads = path.join(APP_ROOT, 'uploads');

  fs.mkdirSync(persistentData, { recursive: true });
  fs.mkdirSync(persistentUploads, { recursive: true });

  const stats = { files: 0, skipped: 0, bytes: 0 };

  // IMPORTANT:
  // Never overwrite anything already present on the persistent volume.
  // This makes the migration safe across every future Railway redeploy.
  copyMissingTree(sourceData, persistentData, stats);
  copyMissingTree(sourceUploads, persistentUploads, stats);

  console.log(
    `[persistent] bootstrap complete — copied=${stats.files}, ` +
    `skipped_existing=${stats.skipped}, bytes=${stats.bytes}`
  );
  console.log(`[persistent] data=${persistentData}`);
  console.log(`[persistent] uploads=${persistentUploads}`);
}

try {
  main();
} catch (err) {
  console.error('[persistent] bootstrap failed:', err);
  // Do not silently continue when persistent storage is explicitly configured.
  // Starting against the wrong /app/data would defeat the persistence guarantee.
  process.exit(1);
}
