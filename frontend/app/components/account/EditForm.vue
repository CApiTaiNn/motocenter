<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import { reactive, ref, watch } from 'vue'
import { useProfileEditModal } from '~/composables/useProfileEditModal'
import { useAuth } from '~/composables/useAuth'

const { user, updateProfile } = useAuth()
const { isOpen, close } = useProfileEditModal()
const form = useTemplateRef('form')
const formErrors = ref<FormError[]>([])
const show = ref(false)
const isLoading = ref(false)

const state = reactive({
  firstname: '',
  lastname: '',
  pseudo: '',
  experience: 'Confirmé',
  ridingStartYear: new Date().getFullYear(),
  email: '',
  password: '',
  confirmPassword: '',
  file: undefined as File | undefined
})

const imagePreview = ref<string>('')
const experienceOptions = ['Débutant', 'Confirmé', 'Expert', 'Autre']

const fillProfil = () => {
  state.firstname = user.value?.firstname || ''
  state.lastname = user.value?.lastname || ''
  state.pseudo = user.value?.pseudo || ''
  state.experience =
    {
      beginner: 'Débutant',
      confirmed: 'Confirmé',
      expert: 'Expert',
      other: 'Autre'
    }[user.value?.userType || 'confirmed'] || 'Confirmé'
  state.ridingStartYear =
    user.value?.ridingStartYear || new Date().getFullYear()
  state.email = user.value?.email || ''

  state.password = ''
  state.confirmPassword = ''

  imagePreview.value = user.value?.image || ''
}

const validate = (): FormError[] => {
  const errors: FormError[] = []

  if (!state.firstname)
    errors.push({ name: 'firstname', message: 'Le prénom est requis' })

  if (!state.lastname)
    errors.push({ name: 'lastname', message: 'Le nom est requis' })

  if (!state.pseudo)
    errors.push({ name: 'pseudo', message: 'Le pseudo est requis' })

  if (!state.email)
    errors.push({ name: 'email', message: "L'email est requis" })

  if (state.email && !isValidEmail(state.email))
    errors.push({ name: 'email', message: "L'email n'est pas valide" })

  const currentYear = new Date().getFullYear()
  if (state.ridingStartYear < 1950 || state.ridingStartYear > currentYear) {
    errors.push({
      name: 'ridingStartYear',
      message: `L'année doit être entre 1950 et ${currentYear}`
    })
  }

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

  formErrors.value = errors
  return errors
}

const getError = (path: string) => {
  return formErrors.value.find((e) => e.name === path)?.message
}

const uploadImage = async (file: File, name: string): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', 'image')
  formData.append('directory', 'users')
  formData.append('name', name)

  await $fetch<{ url: string }>('/api/uploadFile', {
    method: 'POST',
    body: formData
  })
  return name + '.' + file.name.split('.').pop()
}

const handleSave = async () => {
  try {
    validate()
    if (formErrors.value.length > 0) return

    isLoading.value = true

    const formData = new FormData()
    formData.append('firstname', state.firstname)
    formData.append('lastname', state.lastname)
    formData.append('pseudo', state.pseudo)
    formData.append(
      'experience',
      {
        Débutant: 'beginner',
        Confirmé: 'confirmed',
        Expert: 'expert',
        Autre: 'other'
      }[state.experience] as 'beginner' | 'confirmed' | 'expert' | 'other'
    )
    formData.append('ridingStartYear', state.ridingStartYear.toString())
    formData.append('email', state.email)
    if (state.password) {
      formData.append('password', state.password)
    }

    // Upload de l'image si une nouvelle a été sélectionnée
    if (state.file) {
      const imageUrl = await uploadImage(state.file, Date.now().toString())
      formData.append('image', imageUrl)
    }

    await updateProfile(formData)
    formErrors.value = []
    close()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
  } finally {
    isLoading.value = false
  }
}

const handleCancel = () => {
  state.file = undefined
  imagePreview.value = ''
  formErrors.value = []
  close()
}

watch(
  () => isOpen.value,
  (newVal) => {
    if (newVal) {
      formErrors.value = []
      fillProfil()
    }
  }
)
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <div
        class="flex flex-col p-8 overflow-y-auto max-h-[80vh]"
      >
        <h3>Modifier mon profil</h3>

        <UForm
          ref="form"
          :state="state"
          :errors="formErrors"
          class="flex flex-col gap-6 flex-1"
          @submit="handleSave"
        >
          <div
            class="flex flex-col items-center gap-4 mb-2"
          >
            <UFormField
              name="file"
              class="flex flex-col items-center text-center"
            >
              <UFileUpload
                v-model="state.file"
                accept="image/*"
                label="Changer la photo"
                description="PNG ou JPG"
              />
            </UFormField>
          </div>

          <div class="flex flex-col gap-6">
            <div class="grid grid-cols-2 gap-4">
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

            <UFormField
              label="Pseudo"
              name="pseudo"
              :error="getError('pseudo')"
              required
            >
              <UInput
                v-model="state.pseudo"
                placeholder="Jack22"
                variant="soft"
                class="w-full"
              >
                <template #leading>
                  <span class="text-gray-500">@</span>
                </template>
              </UInput>
            </UFormField>

            <div class="flex flex-col gap-3">
              <label class="block text-sm font-medium">Expérience :</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="option in experienceOptions"
                  :key="option"
                  type="button"
                  class="flex-1 min-w-fit cursor-pointer rounded-full border-2 border-solid bg-transparent px-4 py-2 text-sm transition-all duration-200 ease-in-out"
                  :class="
                    state.experience === option
                      ? 'border-[var(--ui-color-error-500)] text-[var(--ui-color-error-500)]'
                      : 'border-gray-300 text-gray-700 hover:border-gray-500'
                  "
                  @click="state.experience = option"
                >
                  {{ option }}
                </button>
              </div>
            </div>

            <UFormField
              label="Année de début"
              name="ridingStartYear"
              :error="getError('ridingStartYear')"
            >
              <UInput
                v-model.number="state.ridingStartYear"
                type="number"
                :min="1950"
                :max="new Date().getFullYear()"
                placeholder="2020"
                variant="soft"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="E-mail"
              name="email"
              :error="getError('email')"
              required
            >
              <UInput
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

          <div class="flex gap-3 pt-4 mt-auto">
            <UButton
              type="button"
              label="Annuler"
              variant="soft"
              color="neutral"
              class="w-1/2"
              @click="handleCancel"
            />
            <UButton
              type="submit"
              label="Sauvegarder"
              color="neutral"
              class="font-bold w-1/2"
              :loading="isLoading"
              :disabled="isLoading"
            />
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
