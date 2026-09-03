<script setup lang="ts">
import * as v from 'valibot'

import { useConnexionModal } from '~/composables/useConnexionModal'
import { useAuth } from '~/composables/useAuth'

const { login, isAuthenticated, user } = useAuth()
const { isOpen, close, openCreateAccountModal } = useConnexionModal()

const state = ref({
  email: '',
  password: ''
})
const error = ref('')
const show = ref(false)
const isLoading = ref(false)

const schema = v.object({
  email: v.pipe(v.string(), v.minLength(1, 'Le champ est requis')),
  password: v.pipe(v.string(), v.minLength(1, 'Le champ est requis'))
})

const connexion = async () => {
  error.value = ''
  isLoading.value = true
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
  } finally {
    isLoading.value = false
  }
}

const goToForgot = () => {
  close()
  navigateTo('/forgot-password')
}

const resetForm = () => {
  state.value.email = ''
  state.value.password = ''
  error.value = ''
}

watch(isOpen, (newVal) => {
  if (!newVal) {
    resetForm()
  }
})
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex w-full items-center justify-between">
        <h3>Se connecter</h3>
        <UButton
          color="primary"
          variant="outline"
          icon="i-lucide-x"
          class="cursor-pointer rounded-full"
          aria-label="Fermer"
          @click="close"
        />
      </div>
    </template>

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="connexion"
      >
        <UFormField label="E-mail" name="email" required>
          <UInput v-model="state.email" type="email" class="w-full" />
        </UFormField>

        <UFormField label="Mot de passe" name="password" required>
          <UInput
            v-model="state.password"
            :type="show ? 'text' : 'password'"
            class="w-full"
            ><template #trailing>
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="
                  show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                "
                :aria-pressed="show"
                @click="show = !show"
              /> </template
          ></UInput>
        </UFormField>

        <div class="flex justify-end">
          <UButton variant="link" color="neutral" class="text-xs" @click="goToForgot">
            Mot de passe oublié ?
          </UButton>
        </div>

        <UButton
          type="submit"
          label="Se connecter"
          class="w-full justify-center rounded-full text-white"
          :loading="isLoading"
          :disabled="isLoading"
        />

        <p class="text-center text-sm">
          Nouveau sur ce site ?
          <UButton
            variant="link"
            color="neutral"
            class="p-0"
            @click="openCreateAccountModal"
          >
            S'inscrire
          </UButton>
        </p>
        <p v-if="error" class="text-center text-xs text-(--ui-error)">
          {{ error }}
        </p>
      </UForm>
    </template>
  </UModal>
</template>
