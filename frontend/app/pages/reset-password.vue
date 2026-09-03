<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '~/composables/useAuth'

useSeoMeta({
  title: 'Réinitialiser le mot de passe',
  robots: 'noindex'
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { resetPassword } = useAuth()

const token = computed(() => String(route.query.token ?? ''))
const password = ref('')
const confirmPassword = ref('')
const show = ref(false)
const isLoading = ref(false)

const passwordScore = computed(() => passwordStrength(password.value))

const submit = async () => {
  const ruleError = validatePasswordRules(password.value)
  if (ruleError) {
    toast.add({ title: ruleError, color: 'error' })
    return
  }
  if (password.value !== confirmPassword.value) {
    toast.add({ title: 'Les mots de passe ne correspondent pas', color: 'error' })
    return
  }

  isLoading.value = true
  try {
    await resetPassword(token.value, password.value)
    toast.add({
      title: 'Mot de passe mis à jour',
      description: 'Vous pouvez maintenant vous connecter.',
      color: 'success'
    })
    await router.push('/')
  } catch {
    toast.add({
      title: 'Lien invalide ou expiré',
      description: 'Demandez un nouveau lien de réinitialisation.',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-6 py-16">
    <h1 class="mb-6">Nouveau mot de passe</h1>

    <div v-if="!token" class="text-gray-500">
      <p>Ce lien est incomplet ou invalide.</p>
      <NuxtLink to="/forgot-password" class="mt-4 inline-block text-(--ui-primary)">
        Demander un nouveau lien
      </NuxtLink>
    </div>

    <UForm
      v-else
      :state="{ password, confirmPassword }"
      class="flex flex-col gap-4"
      @submit="submit"
    >
      <UFormField label="Mot de passe" name="password" required>
        <UInput
          v-model="password"
          :type="show ? 'text' : 'password'"
          placeholder="Mot de passe ..."
          variant="soft"
          class="w-full"
        >
          <template #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              :aria-label="show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              @click="show = !show"
            />
          </template>
        </UInput>
        <div v-if="password" class="mt-2 flex flex-col gap-1">
          <div class="flex gap-1" aria-hidden="true">
            <span
              v-for="i in 4"
              :key="i"
              class="h-1 flex-1 rounded-full bg-gray-200 transition-colors"
              :class="i <= passwordScore.score ? passwordScore.color : ''"
            />
          </div>
          <p class="text-xs text-gray-500">Force : {{ passwordScore.label }}</p>
        </div>
      </UFormField>

      <UFormField label="Confirmer le mot de passe" name="confirmPassword" required>
        <UInput
          v-model="confirmPassword"
          :type="show ? 'text' : 'password'"
          placeholder="Confirmation ..."
          variant="soft"
          class="w-full"
        />
      </UFormField>

      <UButton
        type="submit"
        label="Réinitialiser"
        color="primary"
        class="w-full justify-center rounded-full font-bold text-white"
        :loading="isLoading"
        :disabled="isLoading"
      />
    </UForm>
  </div>
</template>
