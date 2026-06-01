import { useAuth } from '~/composables/useAuth'

export default defineNuxtRouteMiddleware(() => {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated.value) {
    return navigateTo('/')
  }

  if (!user.value?.isAdmin) {
    return navigateTo('/')
  }
})
