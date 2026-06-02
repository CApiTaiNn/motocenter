<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import { ref, reactive } from 'vue'
import { useCreateAccountModal } from '~/composables/useCreateAccountModal'
import { useAuth } from '~/composables/useAuth'

const { register } = useAuth()
const { isOpen } = useCreateAccountModal()
const currentStep = ref(1)
const formErrors = ref<FormError[]>([])
const show = ref(false)
const isLoading = ref(false)
const apiBase = useRuntimeConfig().public.apiBase
const state = reactive({
  firstname: '',
  lastname: '',
  pseudo: '',
  moto: '',
  experience: 'Confirmé',
  yearsExperience: '',
  email: '',
  password: '',
  confirmPassword: '',
  file: undefined as File | undefined
})

const experienceLevels = ['Débutant', 'Confirmé', 'Expert', 'Autre']

// Validation par étape
const validateStep = (step: number): FormError[] => {
  const errors: FormError[] = []

  if (step === 1 || step === 3) {
    if (!state.firstname)
      errors.push({ name: 'firstname', message: 'Le prénom est requis' })
    if (!state.lastname)
      errors.push({ name: 'lastname', message: 'Le nom est requis' })
  }

  if (step === 2 || step === 3) {
    const years = Number(state.yearsExperience)
    if (isNaN(years) || years < 0 || !Number.isInteger(years)) {
      errors.push({
        name: 'yearsExperience',
        message: 'Veuillez entrer un nombre entier positif'
      })
    }
    if (!state.pseudo) errors.push({ name: 'pseudo', message: 'Pseudo requis' })
  }

  if (step === 3) {
    if (!state.email)
      errors.push({ name: 'email', message: "L'email est requis" })
    if (state.email && !isValidEmail(state.email))
      errors.push({ name: 'email', message: "L'email n'est pas valide" })

    if (!state.password)
      errors.push({
        name: 'password',
        message: 'Le mot de passe est requis'
      })
    if (state.password && state.password.length < 8)
      errors.push({
        name: 'password',
        message: 'Le mot de passe doit contenir au moins 8 caractères'
      })
    if (state.password !== state.confirmPassword)
      errors.push({
        name: 'confirmPassword',
        message: 'Les mots de passe ne correspondent pas'
      })
  }
  formErrors.value = errors
  return errors
}

const uploadImage = async (file: File, name: string): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('name', name)

  const { url } = await $fetch<{ url: string }>(`${apiBase}images`, {
    method: 'POST',
    body: formData
  })
  return url
}

const getError = (path: string) => {
  return formErrors.value.find((e) => e.name === path)?.message
}

const nextStep = async () => {
  validateStep(currentStep.value)

  if (formErrors.value.length === 0) {
    currentStep.value++
  }
}

const prevStep = () => {
  formErrors.value = []
  currentStep.value--
}

const resetForm = () => {
  // Réinitialiser tous les champs
  state.firstname = ''
  state.lastname = ''
  state.pseudo = ''
  state.experience = ''
  state.moto = ''
  state.yearsExperience = ''
  state.email = ''
  state.password = ''
  state.confirmPassword = ''

  // Retour à l'étape 1
  currentStep.value = 1

  // Effacer les erreurs
  formErrors.value = []
}

const handleSubmit = async () => {
  try {
    validateStep(currentStep.value)
    if (formErrors.value.length > 0) return

    isLoading.value = true

    // Calcul de l'année
    const startYear = (
      new Date().getFullYear() - Number(state.yearsExperience)
    ).toString()

    // Upload
    let imageUrl = ''
    if (state.file) {
      // On attend l'URL de l'image avant d'appeler register
      imageUrl = await uploadImage(state.file, Date.now().toString())
    }

    await register(
      state.email,
      state.password,
      state.firstname,
      state.lastname,
      state.pseudo,
      {
        Débutant: 'beginner',
        Confirmé: 'confirmed',
        Expert: 'expert',
        Autre: 'other'
      }[state.experience] as 'beginner' | 'confirmed' | 'expert' | 'other',
      startYear,
      imageUrl
    )

    formErrors.value = []
    isOpen.value = false
    resetForm()
  } catch (err) {
    console.error('Erreur lors de la soumission:', err)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <div class="flex h-[65vh] flex-col overflow-y-auto p-8">
        <h3>S'inscrire</h3>

        <!-- Indicateur de progression -->
        <div class="flex justify-center gap-2 mb-8">
          <div class="progress-dot" :class="{ active: currentStep >= 1 }" />
          <div class="progress-dot" :class="{ active: currentStep >= 2 }" />
          <div class="progress-dot" :class="{ active: currentStep >= 3 }" />
        </div>

        <UForm
          ref="form"
          :state="state"
          :errors="formErrors"
          class="flex flex-1 flex-col gap-6"
          @submit="handleSubmit"
        >
          <!-- ÉTAPE 1 -->
          <div v-if="currentStep === 1" class="flex flex-col gap-6">
            <div class="flex flex-col gap-6">
              <UFormField name="file" class="flex cursor-pointer flex-col items-center gap-4 text-center text-sm text-gray-500 underline transition-colors hover:text-gray-700">
                <UFileUpload
                  v-model="state.file"
                  accept="image/*"
                  label="Déposez votre avatar"
                  description="PNG ou JPG"
              /></UFormField>
              <div class="flex flex-col gap-2">
                <UFormField
                  label="Prénom"
                  name="firstname"
                  :error="getError('firstname')"
                  required
                >
                  <UInput
                    v-model="state.firstname"
                    placeholder="Jean"
                    variant="soft"
                    class="w-full"
                  />
                </UFormField>
              </div>
              <div class="flex flex-col gap-2">
                <UFormField
                  label="Nom"
                  name="lastname"
                  :error="getError('lastname')"
                  required
                >
                  <UInput
                    v-model="state.lastname"
                    placeholder="Bihan"
                    variant="soft"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </div>
          </div>

          <!-- ÉTAPE 2 -->
          <div v-if="currentStep === 2" class="flex flex-col gap-6">
            <div class="flex flex-col gap-6">
              <UFormField
                label="Pseudonyme"
                name="pseudo"
                :error="getError('pseudo')"
                required
              >
                <UInput
                  v-model="state.pseudo"
                  placeholder="Jack22"
                  variant="soft"
                  class="w-full"
                />
              </UFormField>
              <div class="flex flex-col gap-3">
                <label class="block text-sm font-medium">Je suis :</label>
                <div class="flex flex-wrap justify-between gap-2">
                  <button
                    v-for="level in experienceLevels"
                    :key="level"
                    type="button"
                    class="experience-button cursor-pointer rounded-full border-2 border-solid border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-700 transition-all hover:border-gray-500"
                    :class="{ active: state.experience === level }"
                    @click="state.experience = level"
                  >
                    {{ level }}
                  </button>
                </div>
              </div>
              <UFormField label="Moto" name="moto">
                <UInput
                  id="moto"
                  v-model="state.moto"
                  placeholder="GSX-R"
                  variant="soft"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="Motard depuis (nombre d'années)"
                name="yearsExperience"
                :error="getError('yearsExperience')"
              >
                <UInput
                  v-model="state.yearsExperience"
                  min="0"
                  placeholder="12"
                  variant="soft"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>

          <!-- ÉTAPE 3 -->
          <div v-if="currentStep === 3" class="flex flex-col gap-6">
            <div class="flex flex-col gap-6">
              <UFormField
                label="E-mail"
                name="email"
                :error="getError('email')"
                required
              >
                <UInput
                  id="email"
                  v-model="state.email"
                  type="email"
                  placeholder="john.doe@gmail.com"
                  variant="soft"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="Mot de passe"
                name="password"
                :error="getError('password')"
                required
              >
                <UInput
                  v-model="state.password"
                  :type="show ? 'text' : 'password'"
                  placeholder="Mot de passe ..."
                  variant="soft"
                  class="w-full"
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
              <UFormField
                label="Confirmer le mot de passe"
                name="confirmPassword"
                :error="getError('confirmPassword')"
                required
              >
                <UInput
                  v-model="state.confirmPassword"
                  :type="show ? 'text' : 'password'"
                  placeholder="Confirmation mot de passe ..."
                  variant="soft"
                  class="w-full"
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
            </div>
          </div>

          <!-- Boutons de navigation -->
          <div class="mt-auto flex gap-3 pt-4">
            <UButton
              v-if="currentStep > 1"
              type="button"
              label="Retour"
              variant="soft"
              color="neutral"
              class="w-1/2"
              @click="prevStep"
            />
            <UButton
              v-if="currentStep < 3"
              type="button"
              label="Suivant"
              color="neutral"
              class="w-1/2 ml-auto"
              @click="nextStep"
            />
            <UButton
              v-if="currentStep === 3"
              type="submit"
              label="Confirmer"
              color="neutral"
              class="font-bold w-1/2 ml-auto"
              :loading="isLoading"
              :disabled="isLoading"
            />
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.progress-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #d1d5db;
  transition: background-color 0.2s ease;
}

.progress-dot.active {
  background-color: var(--ui-color-error-500);
}

.experience-button.active {
  border-color: var(--ui-color-error-500);
  color: var(--ui-color-error-500);
}
</style>
