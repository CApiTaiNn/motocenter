import type { IUser } from '~/types/users.ts'

export function useAuth() {
  const apiBase = useRuntimeConfig().public.apiBase

  // SSR-safe shared state: useState is per-request on the server (no leakage
  // between concurrent requests) and serialises to the client on hydration.
  const user = useState<IUser | null>('auth-user', () => null)
  const isLoading = useState<boolean>('auth-loading', () => true)
  const isAuthenticated = computed(() => !!user.value)

  async function fetchUser(projects: string = 'all') {
    isLoading.value = true
    // useRequestFetch forwards the incoming request's cookies during SSR, so a
    // hard refresh can resolve the session on the server pass (plain $fetch
    // drops them server-side, which bounced authenticated admins).
    const request = useRequestFetch()
    try {
      const data = await request<{ users: IUser }>(`${apiBase}users/account`, {
        credentials: 'include',
        params: { project: projects }
      })
      user.value = data.users
    } catch {
      user.value = null
    } finally {
      isLoading.value = false
    }
  }

  async function register(
    email: string,
    password: string,
    firstname: string,
    lastname: string,
    pseudo: string,
    userType: string,
    ridingStartYear: string,
    image?: string
  ) {
    await $fetch(`${apiBase}users/account`, {
      method: 'POST',
      body: {
        email,
        password,
        firstname,
        lastname,
        pseudo,
        userType,
        ridingStartYear,
        image
      }
    })
    await login(email, password)
  }

  async function updateProfile(formData: FormData) {
    // Extraire les données du FormData
    const updateData: any = {}

    // Ajouter uniquement les champs présents dans le FormData
    if (formData.has('firstname'))
      updateData.firstname = formData.get('firstname')
    if (formData.has('lastname')) updateData.lastname = formData.get('lastname')
    if (formData.has('pseudo')) updateData.pseudo = formData.get('pseudo')
    if (formData.has('experience'))
      updateData.userType = formData.get('experience')
    if (formData.has('ridingStartYear'))
      updateData.ridingStartYear = Number(formData.get('ridingStartYear'))
    if (formData.has('email')) updateData.email = formData.get('email')
    if (formData.has('image')) updateData.image = formData.get('image')
    if (formData.has('password')) updateData.password = formData.get('password')

    await $fetch(`${apiBase}users/account`, {
      method: 'PUT',
      credentials: 'include',
      body: updateData
    })

    await fetchUser()
  }

  async function login(email: string, password: string) {
    await $fetch(`${apiBase}auth`, {
      method: 'POST',
      credentials: 'include',
      body: { email, password }
    })
    await fetchUser()
  }

  async function logout() {
    await $fetch(`${apiBase}auth/logout`, {
      method: 'POST',
      credentials: 'include'
    })
    user.value = null
  }

  // Request a reset link. The API always succeeds (it never reveals whether the
  // email exists), so this resolves regardless.
  async function forgotPassword(email: string) {
    await $fetch(`${apiBase}auth/forgot-password`, {
      method: 'POST',
      body: { email }
    })
  }

  async function resetPassword(token: string, password: string) {
    await $fetch(`${apiBase}auth/reset-password`, {
      method: 'POST',
      body: { token, password }
    })
  }

  async function verifyEmail(token: string) {
    await $fetch(`${apiBase}auth/verify-email`, {
      method: 'POST',
      body: { token }
    })
  }

  async function resendVerification(email: string) {
    await $fetch(`${apiBase}auth/resend-verification`, {
      method: 'POST',
      body: { email }
    })
  }

  return {
    user: readonly(user),
    isAuthenticated,
    isLoading: readonly(isLoading),
    register,
    updateProfile,
    fetchUser,
    login,
    logout,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification
  }
}
