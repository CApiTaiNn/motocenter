<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

import { useConnexionModal } from '~/composables/useConnexionModal'
import { useAuth } from '~/composables/useAuth'

const { login, isAuthenticated, user } = useAuth()
const { isOpen, close, openCreateAccountModal } = useConnexionModal()

const form = useTemplateRef('form')

const state = ref({
  email: '',
  password: ''
})
const error = ref('')
const show = ref(false)

type Schema = typeof state.value

function validate(state: Partial<Schema>): FormError[] {
  const errors = []
  if (!state.email)
    errors.push({ name: 'email', message: 'Le champ est requis' })
  if (!state.password)
    errors.push({ name: 'password', message: 'Le champ est requis' })
  return errors
}

const connexion = async () => {
  try {
    await login(state.value.email, state.value.password)
    if (isAuthenticated.value) {
      if (user.value?.isAdmin) {
        navigateTo('/admin')
      }
      close()
      state.value.email = ''
      state.value.password = ''
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Erreur de connexion'
  }
}

const resetForm = () => {
  form.value?.clear()
  state.value.email = ''
  state.value.password = ''
  error.value = ''
}

watch(
  () => isOpen.value,
  (newVal) => {
    if (!newVal) {
      resetForm()
    }
  }
)
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <div class="content">
        <h3>Se connecter</h3>

        <UForm
          ref="form"
          :state="state"
          :validate="validate"
          class="space-y-4"
          @submit.prevent="connexion"
        >
          <UFormField label="E-mail" name="email" type="email" required>
            <UInput v-model="state.email"
              ><template #trailing></template
            ></UInput>
          </UFormField>

          <UFormField label="Mot de passe" name="password" required>
            <UInput v-model="state.password" :type="show ? 'text' : 'password'"
              ><template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="show ? 'Hide password' : 'Show password'"
                  :aria-pressed="show"
                  aria-controls="password"
                  @click="show = !show"
                /> </template
            ></UInput>
          </UFormField>
          <UButton
            type="submit"
            label="Se connecter"
            class="rounded-full"
            style="width: 100%; justify-content: center; color: white"
          />
        </UForm>
        <p style="font-size: small">
          Nouveau sur ce site ?
          <span class="new-account" @click="openCreateAccountModal"
            >S'inscrire</span
          >
        </p>
        <p class="error-message">{{ error }}</p>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  margin: 5rem;
}

.error-message {
  color: red;
  font-size: 0.8em;
  margin: 1rem;
}

.new-account {
  text-decoration: underline;
  cursor: pointer;
}
</style>
