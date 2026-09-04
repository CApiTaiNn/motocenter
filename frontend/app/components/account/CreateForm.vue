<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import * as v from 'valibot'
import { ref, reactive, computed } from 'vue'
import { useCreateAccountModal } from '~/composables/useCreateAccountModal'
import { useAuth } from '~/composables/useAuth'

const { register } = useAuth()
const { isOpen, openConnexionModal } = useCreateAccountModal()
const currentStep = ref(1)
const formErrors = ref<FormError[]>([])
// Server-side failure shown under the buttons (duplicate email/pseudo, upload
// error, network). Without this the modal looked frozen on any API rejection.
const submitError = ref('')
// When the email is already registered, offer a jump to the login modal.
const emailAlreadyExists = ref(false)

const clearSubmitError = () => {
  submitError.value = ''
  emailAlreadyExists.value = false
}
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

const passwordScore = computed(() => passwordStrength(state.password))

// Per-step valibot schemas: the wizard validates one step at a time, so each
// step owns its own schema rather than one form-wide :schema.
const step1Schema = v.object({
  firstname: v.pipe(v.string(), v.minLength(1, 'Le prénom est requis')),
  lastname: v.pipe(v.string(), v.minLength(1, 'Le nom est requis'))
})

const step2Schema = v.object({
  pseudo: v.pipe(v.string(), v.minLength(1, 'Pseudo requis')),
  yearsExperience: v.pipe(
    v.string(),
    v.check((val) => {
      const n = Number(val)
      return val.trim() !== '' && Number.isInteger(n) && n >= 0
    }, 'Veuillez entrer un nombre entier positif')
  )
})

const step3Schema = v.pipe(
  v.object({
    email: v.pipe(
      v.string(),
      v.minLength(1, "L'email est requis"),
      v.email("L'email n'est pas valide")
    ),
    password: v.string(),
    confirmPassword: v.string()
  }),
  v.forward(
    v.rawCheck(({ dataset, addIssue }) => {
      if (!dataset.typed) return
      if (!dataset.value.password) {
        addIssue({ message: 'Le mot de passe est requis' })
        return
      }
      const message = validatePasswordRules(dataset.value.password, {
        email: dataset.value.email,
        pseudo: state.pseudo
      })
      if (message) addIssue({ message })
    }),
    ['password']
  ),
  v.forward(
    v.check(
      (input) => input.password === input.confirmPassword,
      'Les mots de passe ne correspondent pas'
    ),
    ['confirmPassword']
  )
)

// Validation par étape (valibot). Each step maps its schema issues to the
// FormError list the fields display via getError().
const collectIssues = (issues?: v.BaseIssue<unknown>[]): FormError[] =>
  (issues ?? []).map((issue) => ({
    name: String(issue.path?.[0]?.key ?? ''),
    message: issue.message
  }))

const validateStep = (step: number): FormError[] => {
  const errors: FormError[] = []

  if (step === 1 || step === 3) {
    errors.push(
      ...collectIssues(
        v.safeParse(step1Schema, {
          firstname: state.firstname,
          lastname: state.lastname
        }).issues
      )
    )
  }

  if (step === 2 || step === 3) {
    errors.push(
      ...collectIssues(
        v.safeParse(step2Schema, {
          pseudo: state.pseudo,
          yearsExperience: state.yearsExperience
        }).issues
      )
    )
  }

  if (step === 3) {
    errors.push(
      ...collectIssues(
        v.safeParse(step3Schema, {
          email: state.email,
          password: state.password,
          confirmPassword: state.confirmPassword
        }).issues
      )
    )
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
  clearSubmitError()
  validateStep(currentStep.value)

  if (formErrors.value.length === 0) {
    currentStep.value++
  }
}

const prevStep = () => {
  formErrors.value = []
  clearSubmitError()
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
  clearSubmitError()
}

// Map the API's error code to a French message, and send the user back to the
// step holding the offending field so they can fix it. Keying on the stable
// `code` avoids matching on the backend's English message text.
const applyApiError = (err: any) => {
  switch (err?.data?.code) {
    case 'PSEUDO_TAKEN':
      submitError.value = 'Ce pseudo est déjà utilisé'
      formErrors.value = [{ name: 'pseudo', message: submitError.value }]
      currentStep.value = 2
      break
    case 'EMAIL_TAKEN':
      submitError.value = 'Un compte existe déjà avec cet e-mail.'
      emailAlreadyExists.value = true
      formErrors.value = [{ name: 'email', message: submitError.value }]
      break
    case 'WEAK_PASSWORD':
      submitError.value =
        'Le mot de passe ne respecte pas les règles de sécurité'
      break
    default:
      submitError.value = "Une erreur est survenue lors de l'inscription"
  }
}

// Close signup and open the login modal.
const goToLogin = () => {
  resetForm()
  openConnexionModal()
}

const handleSubmit = async () => {
  try {
    clearSubmitError()
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
    applyApiError(err)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex w-full items-center justify-between">
        <h3>S'inscrire</h3>
        <UButton
          color="primary"
          variant="outline"
          icon="i-lucide-x"
          class="cursor-pointer rounded-full"
          aria-label="Fermer"
          @click="isOpen = false"
        />
      </div>
    </template>

    <template #body>
      <div class="flex flex-col">
        <!-- Indicateur de progression -->
        <div class="mb-8 flex justify-center gap-2">
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
                      :aria-label="
                        show
                          ? 'Masquer le mot de passe'
                          : 'Afficher le mot de passe'
                      "
                      :aria-pressed="show"
                      @click="show = !show"
                    /> </template
                ></UInput>
                <div v-if="state.password" class="mt-2 flex flex-col gap-1">
                  <div class="flex gap-1" aria-hidden="true">
                    <span
                      v-for="i in 4"
                      :key="i"
                      class="h-1 flex-1 rounded-full bg-gray-200 transition-colors"
                      :class="i <= passwordScore.score ? passwordScore.color : ''"
                    />
                  </div>
                  <p class="text-xs text-gray-500">
                    Force : {{ passwordScore.label }}
                  </p>
                </div>
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
                      :aria-label="
                        show
                          ? 'Masquer le mot de passe'
                          : 'Afficher le mot de passe'
                      "
                      :aria-pressed="show"
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
              class="ml-auto w-1/2"
              @click="nextStep"
            />
            <UButton
              v-if="currentStep === 3"
              type="submit"
              label="Confirmer"
              color="neutral"
              class="ml-auto w-1/2 font-bold"
              :loading="isLoading"
              :disabled="isLoading"
            />
          </div>

          <p v-if="submitError" class="text-center text-xs text-(--ui-error)">
            {{ submitError }}
            <button
              v-if="emailAlreadyExists"
              type="button"
              class="cursor-pointer underline"
              @click="goToLogin"
            >
              Se connecter
            </button>
          </p>
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
