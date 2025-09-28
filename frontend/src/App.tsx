import React, { useEffect, useState } from 'react'
import { Container, Grid, Dialog, DialogTitle, DialogContent, Button, Box, Typography } from '@mui/material'
import DeviceCard from './components/DeviceCard'
import { listenDevices, saveSubscription, onAuthChange, signInWithGooglePopup, signOutUser } from './firebase'

function App() {
  const [devices, setDevices] = useState<Record<string, any>>({})
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    listenDevices(setDevices)
  }, [])

  useEffect(() => {
    const unsub = onAuthChange(u => setUser(u))
    return () => unsub()
  }, [])

  useEffect(() => {
    // Register service worker for push
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      ;(async () => {
        try {
          const desiredSw = new URL('sw.js', window.location.href).href
          console.log('[app] desired sw url', desiredSw)

          const regs = await navigator.serviceWorker.getRegistrations()
          console.log('[app] existing service worker registrations:', regs)

          if (regs.length > 1) {
            // If multiple are registered, offer to unregister any that don't match the desired sw script URL
            console.warn('[app] multiple service workers detected')
            const others = regs.filter(r => {
              const scripts = []
              if (r.active) scripts.push(r.active.scriptURL)
              if (r.waiting) scripts.push(r.waiting.scriptURL)
              if (r.installing) scripts.push(r.installing.scriptURL)
              return scripts.every(s => s !== desiredSw)
            })
            if (others.length > 0) {
              console.warn('[app] found registrations with different script URLs:', others)
              try {
                const doUnregister = confirm('Multiple service workers detected. Unregister outdated ones now?')
                if (doUnregister) {
                  for (const r of others) {
                    const ok = await r.unregister()
                    console.log('[app] unregistered', r, ok)
                  }
                }
              } catch (e) {
                console.warn('[app] error while unregistering service workers', e)
              }
            }
          }

          const reg = await navigator.serviceWorker.register(desiredSw)
          console.log('[app] sw registered', reg)
        } catch (err) {
          console.error('[app] sw register error', err)
        }
      })()
    }
  }, [])

  async function subscribeToPush() {
    try {
      if (!user) {
        const ok = confirm('You must sign in with Google to subscribe. Sign in now?')
        if (!ok) return
        await signInWithGooglePopup()
      }

      const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string
      if (!vapid) {
        alert('Set VITE_VAPID_PUBLIC_KEY to subscribe to push')
        return
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid)
      })

      const clientId = crypto.randomUUID()
      // saveSubscription will prefer auth.uid if available
      const ok = await saveSubscription(clientId, sub)
      if (ok) {
        alert('Subscribed to push notifications')
      } else {
        alert('Subscription saved failed; check console for errors')
      }
    } catch (e) {
      console.error(e)
      alert('Subscription failed')
    }
  }

  return (
    <Container sx={{ paddingY: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Home Dashboard</Typography>
        <Box>
          {user ? (
            <>
              <Typography component="span" sx={{ mr: 2 }}>{user.email}</Typography>
              <Button sx={{ mr: 1 }} onClick={() => signOutUser()}>Sign out</Button>
            </>
          ) : (
            <Button sx={{ mr: 1 }} onClick={() => signInWithGooglePopup()}>Sign in</Button>
          )}
          <Button variant="contained" onClick={subscribeToPush}>Subscribe to Push</Button>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' } }}>
        {Object.entries(devices).map(([key, val]) => (
          <Box key={key}>
            <DeviceCard name={key} icon={val.icon} onClick={() => { setSelected(val); setOpen(true) }} />
          </Box>
        ))}
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Device Data</DialogTitle>
        <DialogContent>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(selected, null, 2)}</pre>
        </DialogContent>
      </Dialog>
    </Container>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default App
