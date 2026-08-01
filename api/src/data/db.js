/**
 * Persistence layer.
 *
 * In Azure (or any environment with AZURE_STORAGE_CONNECTION_STRING set),
 * each "collection" (records, reminders, chats) is stored as an Azure Table
 * — this is required because Azure Static Web Apps / Azure Functions run on
 * ephemeral, non-shared, multi-instance file systems, so writing JSON files
 * to disk (the old approach) silently loses data between requests.
 *
 * With no connection string set (e.g. quick local hacking without Azurite),
 * this module transparently falls back to the original dependency-free
 * JSON-file store under src/data/store/, so `npm run dev` still works with
 * zero setup.
 *
 * Either way, the exported interface (getAll/getById/insert/update/remove)
 * is identical — no other file in the codebase needs to know which backend
 * is active.
 */
const path = require('path');

const CONNECTION_STRING = (process.env.AZURE_STORAGE_CONNECTION_STRING || '').trim();
const TABLE_PREFIX = (process.env.AZURE_STORAGE_TABLE_PREFIX || 'carepilot').trim();

let impl;

if (CONNECTION_STRING) {
  // ── Azure Table Storage backend ───────────────────────────────────────
  const { TableClient } = require('@azure/data-tables');

  const clients = new Map();
  const ensured = new Set();

  function tableName(collection) {
    // Table names must be alphanumeric only.
    return `${TABLE_PREFIX}${collection}`.replace(/[^a-zA-Z0-9]/g, '');
  }

  function getClient(collection) {
    const name = tableName(collection);
    if (!clients.has(name)) {
      clients.set(name, TableClient.fromConnectionString(CONNECTION_STRING, name, {
        allowInsecureConnection: CONNECTION_STRING.includes('UseDevelopmentStorage=true'),
      }));
    }
    return clients.get(name);
  }

  async function ensureTable(collection) {
    const name = tableName(collection);
    if (ensured.has(name)) return getClient(collection);
    const client = getClient(collection);
    await client.createTable();
    ensured.add(name);
    return client;
  }

  function toEntity(collection, item) {
    return {
      partitionKey: collection,
      rowKey: item.id,
      json: JSON.stringify(item),
    };
  }

  function fromEntity(entity) {
    return JSON.parse(entity.json);
  }

  async function getAll(collection) {
    const client = await ensureTable(collection);
    const items = [];
    for await (const entity of client.listEntities({ queryOptions: { filter: `PartitionKey eq '${collection}'` } })) {
      items.push(fromEntity(entity));
    }
    return items;
  }

  async function getById(collection, id) {
    const client = await ensureTable(collection);
    try {
      const entity = await client.getEntity(collection, id);
      return fromEntity(entity);
    } catch (err) {
      if (err.statusCode === 404) return null;
      throw err;
    }
  }

  async function insert(collection, item) {
    const client = await ensureTable(collection);
    await client.createEntity(toEntity(collection, item));
    return item;
  }

  async function update(collection, id, patch) {
    const existing = await getById(collection, id);
    if (!existing) return null;
    const client = await ensureTable(collection);
    const merged = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    await client.updateEntity(toEntity(collection, merged), 'Replace');
    return merged;
  }

  async function remove(collection, id) {
    const client = await ensureTable(collection);
    try {
      await client.deleteEntity(collection, id);
      return true;
    } catch (err) {
      if (err.statusCode === 404) return false;
      throw err;
    }
  }

  impl = { getAll, getById, insert, update, remove, backend: 'azure-table-storage' };
} else {
  // ── Local JSON-file fallback (no Azure Storage configured) ─────────────
  const fs = require('fs');

  const STORE_DIR = path.join(__dirname, 'store');
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });

  const locks = new Map();

  function filePath(collection) {
    return path.join(STORE_DIR, `${collection}.json`);
  }

  function readSync(collection) {
    const p = filePath(collection);
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, 'utf-8').trim();
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[db] Corrupt store file for "${collection}", resetting.`, err.message);
      return [];
    }
  }

  function writeSync(collection, data) {
    const p = filePath(collection);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  }

  async function withLock(collection, fn) {
    const prev = locks.get(collection) || Promise.resolve();
    let release;
    const next = new Promise((res) => (release = res));
    locks.set(collection, prev.then(() => next));
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  async function getAll(collection) {
    return withLock(collection, () => readSync(collection));
  }

  async function getById(collection, id) {
    const all = await getAll(collection);
    return all.find((x) => x.id === id) || null;
  }

  async function insert(collection, item) {
    return withLock(collection, () => {
      const all = readSync(collection);
      all.push(item);
      writeSync(collection, all);
      return item;
    });
  }

  async function update(collection, id, patch) {
    return withLock(collection, () => {
      const all = readSync(collection);
      const idx = all.findIndex((x) => x.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
      writeSync(collection, all);
      return all[idx];
    });
  }

  async function remove(collection, id) {
    return withLock(collection, () => {
      const all = readSync(collection);
      const next = all.filter((x) => x.id !== id);
      const removed = next.length !== all.length;
      writeSync(collection, next);
      return removed;
    });
  }

  impl = { getAll, getById, insert, update, remove, backend: 'local-json-file' };
}

module.exports = impl;
