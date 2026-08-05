import { openDB } from 'idb'

export const dbPromise = openDB('brahmco-offline', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('productos')) db.createObjectStore('productos', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('movimientos_pendientes')) db.createObjectStore('movimientos_pendientes', { keyPath: 'tempId' })
  },
})

export async function saveProductosLocal(productos) {
  const db = await dbPromise
  const tx = db.transaction('productos', 'readwrite')
  for (const p of productos) tx.store.put(p)
  await tx.done
}

export async function getProductosLocal() {
  const db = await dbPromise
  return db.getAll('productos')
}

export async function addMovimientoPendiente(mov) {
  const db = await dbPromise
  const tempId = Date.now().toString()
  await db.put('movimientos_pendientes', {...mov, tempId, created_at: new Date().toISOString() })
}

export async function getPendientes() {
  const db = await dbPromise
  return db.getAll('movimientos_pendientes')
}

export async function clearPendiente(tempId) {
  const db = await dbPromise
  await db.delete('movimientos_pendientes', tempId)
}