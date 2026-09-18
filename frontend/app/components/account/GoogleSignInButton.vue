<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'

// Emitted after a successful Google sign-in, so the host form can close and
// redirect exactly like a password login.
const emit = defineEmits<{ success: [] }>()

const { googleClientId } = useRuntimeConfig().public
const { loginWithGoogle } = useAuth()
const toast = useToast()

const buttonEl = ref<HTMLDivElement | null>(null)

// Google Identity Services is loaded on demand from Google; it attaches
// `window.google` once ready. Loaded once and reused across mounts.
function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { google?: { accounts?: { id?: unknown } } }
    if (w.google?.accounts?.id) return resolve()

    const existing = document.getElementById(
      'gis-script'
    ) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('GIS failed')))
      return
    }

    const script = document.createElement('script')
    script.id = 'gis-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('GIS failed'))
    document.head.appendChild(script)
  })
}

async function handleCredential(response: { credential?: string }) {
  if (!response.credential) return
  try {
    await loginWithGoogle(response.credential)
    emit('success')
  } catch {
    toast.add({
      title: 'Connexion impossible',
      description: 'La connexion avec Google a échoué. Réessayez.',
      color: 'error'
    })
  }
}

onMounted(async () => {
  if (!googleClientId || !buttonEl.value) return
  try {
    await loadGis()
    // No official types for GIS, so the client object is accessed untyped.
    const google = (window as unknown as { google: any }).google
    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleCredential
    })
    google.accounts.id.renderButton(buttonEl.value, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      width: 320,
      locale: 'fr'
    })
  } catch {
    // If GIS cannot load (offline or blocked), leave the slot empty rather than
    // breaking the form.
  }
})
</script>

<template>
  <div v-if="googleClientId" class="flex justify-center">
    <div ref="buttonEl" />
  </div>
</template>
