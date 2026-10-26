const DB_NAME = "sp-manager-offline-v1";
const DB_VERSION = 1;
const STORE = "records";
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let opening;

function openDb() {
  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Offline storage is unavailable."));
  });
  return opening;
}

async function read(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function write(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve(value);
    tx.onerror = tx.onabort = () => reject(tx.error || new Error("Offline storage write failed."));
  });
}

export async function deviceId() {
  let id = await read("device-id");
  if (!id) {
    id = crypto.randomUUID();
    await write("device-id", id);
  }
  return id;
}

async function deriveAesKey(password, salt) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(String(password)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function rememberLogin(username, password, pack) {
  if (!crypto?.subtle || !indexedDB) throw new Error("This browser does not support encrypted offline sign-in.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(password, salt);
  const plain = encoder.encode(JSON.stringify({ ...pack, username: String(username).trim().toLowerCase() }));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  await write("credential", { username: String(username).trim().toLowerCase(), salt: Array.from(salt), iv: Array.from(iv), encrypted: Array.from(new Uint8Array(encrypted)), savedAt: Date.now() });
  try { await navigator.storage?.persist?.(); } catch { }
}

export async function unlock(username, password) {
  const record = await read("credential");
  if (!record || record.username !== String(username).trim().toLowerCase()) throw new Error("Offline sign-in is not available on this device.");
  try {
    const key = await deriveAesKey(password, new Uint8Array(record.salt));
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(record.iv) }, key, new Uint8Array(record.encrypted));
    const pack = JSON.parse(decoder.decode(plaintext));
    if (!pack.grant || !Number.isFinite(Number(pack.expiresAt)) || Number(pack.expiresAt) <= Date.now()) throw new Error("Offline access expired. Connect to the database and sign in again.");
    return pack;
  } catch (error) {
    if (/expired|not available/i.test(String(error?.message || ""))) throw error;
    throw new Error("Invalid username or password.");
  }
}

export async function saveSnapshot(snapshot) { await write("snapshot", snapshot || {}); }
export async function getSnapshot() { return (await read("snapshot")) || {}; }

export async function setQuota(quota) { await write("quota", quota || {}); }
export async function getQuota() { return (await read("quota")) || {}; }

export async function enqueueSale(sale) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const q = store.get("queue");
    const quotaRequest = store.get("quota");
    let failure = "";
    let queue = [];
    let quota = {};
    let ready = 0;
    const commit = () => {
      if (++ready !== 2) return;
      if (queue.some(item => item.sale?.id === sale.id)) return;
      const requested = {};
      for (const line of sale.items || []) {
        const id = String(line.productDbId || line.productId || line.id);
        if (!id || line.isService) continue;
        requested[id] = (requested[id] || 0) + Math.max(0, Number(line.qty || 0));
      }
      for (const [id, qty] of Object.entries(requested)) {
        if (Number(quota[id] || 0) + 1e-9 < qty) { failure = "Offline stock quota exceeded for one or more products."; tx.abort(); return; }
      }
      for (const [id, qty] of Object.entries(requested)) quota[id] = Number(quota[id] || 0) - qty;
      queue.push({ id: sale.id, sale, status: "pending", createdAt: new Date().toISOString() });
      store.put(queue, "queue");
      store.put(quota, "quota");
    };
    q.onsuccess = () => { queue = Array.isArray(q.result) ? q.result : []; commit(); };
    quotaRequest.onsuccess = () => { quota = quotaRequest.result || {}; commit(); };
    tx.oncomplete = () => resolve(true);
    tx.onerror = tx.onabort = () => reject(new Error(failure || "Could not save sale to the offline queue."));
  });
}
export async function pendingSales() { return (await read("queue")) || []; }
export async function replacePendingSales(rows) { return write("queue", rows); }
export async function pendingCount() { return (await pendingSales()).filter(row => row.status !== "synced").length; }
