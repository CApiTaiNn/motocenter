<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'

useSeoMeta({
  title: 'Vérification de l’e-mail',
  robots: 'noindex'
})

const route = useRoute()
const { verifyEmail, resendVerification } = useAuth()

type Status = 'loading' | 'success' | 'error'
const status = ref<Status>('loading')

const resendEmail = ref('')
const resendSent = ref(false)
const isResending = ref(false)

const token = computed(() => String(route.query.token ?? ''))

onMounted(async () => {
  if (!token.value) {
    status.value = 'error'
    return
  }
  try {
    await verifyEmail(token.value)
    status.value = 'success'
  } catch {
    status.value = 'error'
  }
})

const resend = async () => {
  if (!resendEmail.value) return
  isResending.value = true
  try {
    await resendVerification(resendEmail.value)
  } finally {
    resendSent.value = true
    isResending.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-6 py-16 text-center">
    <template v-if="status === 'loading'">
      <UIcon name="i-lucide-loader-circle" class="mx-auto mb-4 animate-spin text-4xl text-(--ui-primary)" />
      <p class="text-gray-500">Vérification en cours…</p>
    </template>

    <template v-else-if="status === 'success'">
      <UIcon name="i-lucide-circle-check" class="mx-auto mb-4 text-5xl text-green-500" />
      <h1 class="mb-2">E-mail confirmé</h1>
      <p class="mb-6 text-gray-500">Votre adresse e-mail est vérifiée. Merci !</p>
      <UButton
        to="/"
        label="Aller à l'accueil"
        color="primary"
        class="mx-auto rounded-full font-bold"
        style="color: white"
      />
    </template>

    <template v-else>
      <UIcon name="i-lucide-circle-x" class="mx-auto mb-4 text-5xl text-red-500" />
      <h1 class="mb-2">Lien invalide ou expiré</h1>
      <p class="mb-6 text-gray-500">
        Ce lien de vérification n'est plus valide. Entrez votre e-mail pour en
        recevoir un nouveau.
      </p>

      <template v-if="!resendSent">
        <UForm :state="{ resendEmail }" class="flex flex-col gap-3" @submit="resend">
          <UInput
            v-model="resendEmail"
            type="email"
            placeholder="john.doe@gmail.com"
            variant="soft"
            class="w-full"
          />
          <UButton
            type="submit"
            label="Renvoyer le lien"
            color="primary"
            class="w-full justify-center rounded-full font-bold"
            style="color: white"
            :loading="isResending"
            :disabled="isResending"
          />
        </UForm>
      </template>
      <p v-else class="text-gray-500">
        Si un compte existe pour cette adresse, un nouvel e-mail vient d'être
        envoyé.
      </p>
    </template>
  </div>
</template>
