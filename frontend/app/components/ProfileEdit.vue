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

const isValidEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

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
      <div class="content">
        <h3>Modifier mon profil</h3>

        <UForm
          ref="form"
          :state="state"
          :errors="formErrors"
          class="form-container"
          @submit="handleSave"
        >
          <div class="avatar-section">
            <UFormField name="file" class="avatar-upload">
              <UFileUpload
                v-model="state.file"
                accept="image/*"
                label="Changer la photo"
                description="PNG ou JPG"
              />
            </UFormField>
          </div>

          <div class="form-fields">
            <div class="form-row">
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

            <div class="experience-section">
              <label class="experience-label">Expérience :</label>
              <div class="experience-buttons">
                <button
                  v-for="option in experienceOptions"
                  :key="option"
                  type="button"
                  class="experience-button"
                  :class="{ active: state.experience === option }"
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

          <div class="button-group">
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

<style scoped>
.content {
  display: flex;
  flex-direction: column;
  padding: 2rem;
  overflow-y: auto;
  max-height: 80vh;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  flex: 1;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.avatar:hover {
  opacity: 0.8;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.experience-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.experience-label {
  font-size: 0.875rem;
  font-weight: 500;
  display: block;
}

.experience-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.experience-button {
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 0.875rem;
  border: 2px solid #d1d5db;
  background-color: transparent;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: fit-content;
}

.experience-button:hover {
  border-color: #9ca3af;
}

.experience-button.active {
  border-color: #ef4444;
  color: #ef4444;
}

.button-group {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  margin-top: auto;
}
</style>
