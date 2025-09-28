import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue, set } from 'firebase/database'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'

const raw = import.meta.env.VITE_FIREBASE_CONFIG || ''
if (!raw) throw new Error('Set VITE_FIREBASE_CONFIG env variable (JSON)')
const firebaseConfig = JSON.parse(raw)

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)
const auth = getAuth(app)
const provider = new GoogleAuthProvider()

export function listenDevices(callback: (v: Record<string, any>) => void) {
  const r = ref(db, 'devices')
  onValue(r, snapshot => {
    const val = snapshot.val() || {}
    callback(val)
  })
}

export async function saveSubscription(clientId: string, sub: any) {
  // Prefer storing subscriptions under the authenticated user's UID when available
  try {
    const user = auth.currentUser
    const key = user ? user.uid : clientId
    // Ensure we store a plain JSON-friendly subscription object.
    // PushSubscription has a toJSON() method in browsers; use it when available.
    let plainSub: any = sub
    try {
      if (sub && typeof sub.toJSON === 'function') {
        plainSub = sub.toJSON()
      } else if (sub && sub.endpoint) {
        // Already looks like a subscription-like object; shallow-copy endpoint and keys.
        plainSub = { endpoint: sub.endpoint, keys: sub.keys || (sub.getKey ? { p256dh: sub.getKey('p256dh')?.toString?.() } : undefined) }
      }
    } catch (e) {
      console.warn('Failed to normalize subscription to JSON, saving raw object instead', e)
      plainSub = sub
    }

    const payload: any = { subscription: plainSub, createdAt: new Date().toISOString() }
    if (user) {
      payload.uid = user.uid
      payload.email = user.email
    }
    const r = ref(db, `subscriptions/${key}`)
    await set(r, payload)
    console.log('Saved subscription to', `subscriptions/${key}`)
    return true
  } catch (err) {
    console.error('saveSubscription error', err)
    return false
  }
}

export function signInWithGooglePopup() {
  return signInWithPopup(auth, provider)
}

export function signOutUser() {
  return signOut(auth)
}

export function onAuthChange(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, user => cb(user))
}

export async function setDeviceData(name: string, data: any) {
  const r = ref(db, `devices/${name}`)
  await set(r, data)
}

export { db }
