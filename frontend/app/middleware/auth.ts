import { useAuth } from '~/composables/useAuth'

export default defineNuxtRouteMiddleware(async () => {
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
