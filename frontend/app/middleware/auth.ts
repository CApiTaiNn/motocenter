import { useAuth } from '~/composables/useAuth'

export default defineNuxtRouteMiddleware(async () => {
  // In production the session cookie belongs to the API domain, so the Nuxt
  // server never sees it. Gate on the client only; the API still refuses
  // admin data to anyone who is not an admin.
  if (import.meta.server) return

  const { user, fetchUser } = useAuth()

  // On a hard refresh the auth state isn't hydrated yet; resolve it from
  // the cookie before gating so admins aren't bounced spuriously.
  if (!user.value) {
    await fetchUser()
  }

  if (!user.value?.isAdmin) {
    return navigateTo('/')
  }
})
