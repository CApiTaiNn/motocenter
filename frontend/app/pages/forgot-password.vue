<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'

useSeoMeta({
  title: 'Mot de passe oublié',
  robots: 'noindex'
})

const { forgotPassword } = useAuth()

const email = ref('')
const isLoading = ref(false)
const sent = ref(false)

const submit = async () => {
  if (!email.value) return
  isLoading.value = true
  try {
    await forgotPassword(email.value)
  } finally {
    // The API never reveals whether the email exists, so we always confirm.
    sent.value = true
    isLoading.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-6 py-16">
    <h1 class="mb-2">Mot de passe oublié</h1>

    <template v-if="!sent">
      <p class="mb-6 text-gray-500">
        Entrez votre adresse e-mail. Si un compte existe, vous recevrez un lien
        pour choisir un nouveau mot de passe.
      </p>
      <UForm :state="{ email }" class="flex flex-col gap-4" @submit="submit">
        <UFormField label="E-mail" name="email" required>
          <UInput
            v-model="email"
            type="email"
            placeholder="john.doe@gmail.com"
            variant="soft"
            class="w-full"
          />
        </UFormField>
        <UButton
          type="submit"
          label="Envoyer le lien"
          color="primary"
          class="w-full justify-center rounded-full font-bold text-white"
          :loading="isLoading"
          :disabled="isLoading"
        />
      </UForm>
    </template>

    <template v-else>
      <p class="text-gray-500">
        Si un compte est associé à cette adresse, un e-mail vient d'être envoyé.
        Pensez à vérifier vos spams.
      </p>
      <NuxtLink to="/" class="mt-6 text-(--ui-primary)">Retour à l'accueil</NuxtLink>
    </template>
  </div>
</template>
