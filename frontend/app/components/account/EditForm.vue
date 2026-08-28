<script setup lang="ts">
import * as v from 'valibot'
import { reactive, ref, watch } from 'vue'
import { useProfileEditModal } from '~/composables/useProfileEditModal'
import { useAuth } from '~/composables/useAuth'

const { user, updateProfile } = useAuth()
const { isOpen, close } = useProfileEditModal()
const show = ref(false)
const isLoading = ref(false)
const submitError = ref('')

const currentYear = new Date().getFullYear()

const state = reactive({
  firstname: '',
  lastname: '',
  pseudo: '',
  experience: 'Confirmé',
  ridingStartYear: currentYear,
  email: '',
  currentPassword: '',
  password: '',
  confirmPassword: '',
  file: undefined as File | undefined
})

// Same policy as signup. Password is optional here: when left blank the account
// keeps its current one, so the password rules only apply once a value is typed,
// and changing it requires the current password (verified server-side too).
const schema = v.pipe(
  v.object({
    firstname: v.pipe(v.string(), v.minLength(1, 'Le prénom est requis')),
    lastname: v.pipe(v.string(), v.minLength(1, 'Le nom est requis')),
    pseudo: v.pipe(v.string(), v.minLength(1, 'Le pseudo est requis')),
    email: v.pipe(
      v.string(),
      v.minLength(1, "L'email est requis"),
      v.email("L'email n'est pas valide")
    ),
    ridingStartYear: v.pipe(
      // v-model.number yields '' when the field is cleared, so guard the type
      // with a French message instead of valibot's default English one.
      v.number("L'année de début est requise"),
      v.minValue(1950, `L'année doit être entre 1950 et ${currentYear}`),
      v.maxValue(currentYear, `L'année doit être entre 1950 et ${currentYear}`)
    ),
    currentPassword: v.string(),
    password: v.string(),
    confirmPassword: v.string()
  }),
  v.forward(
    v.check(
      (input) => !input.password || !!input.currentPassword,
      'Le mot de passe actuel est requis'
    ),
    ['currentPassword']
  ),
  v.forward(
    v.rawCheck(({ dataset, addIssue }) => {
      if (!dataset.typed || !dataset.value.password) return
      const message = validatePasswordRules(dataset.value.password, {
        email: dataset.value.email,
        pseudo: dataset.value.pseudo
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
  state.ridingStartYear = user.value?.ridingStartYear || currentYear
  state.email = user.value?.email || ''

  state.currentPassword = ''
  state.password = ''
  state.confirmPassword = ''

  imagePreview.value = user.value?.image || ''
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

const applyApiError = (err: any) => {
  switch (err?.data?.code) {
    case 'CURRENT_PASSWORD_INVALID':
      submitError.value = 'Le mot de passe actuel est incorrect'
      break
    case 'CURRENT_PASSWORD_REQUIRED':
      submitError.value = 'Le mot de passe actuel est requis'
      break
    case 'WEAK_PASSWORD':
      submitError.value =
        'Le mot de passe ne respecte pas les règles de sécurité'
      break
    case 'PSEUDO_TAKEN':
      submitError.value = 'Ce pseudo est déjà utilisé'
      break
    default:
      submitError.value = 'La sauvegarde a échoué. Réessayez.'
  }
}

const handleSave = async () => {
  try {
    submitError.value = ''
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
      formData.append('currentPassword', state.currentPassword)
    }

    if (state.file) {
      const imageUrl = await uploadImage(state.file, Date.now().toString())
      formData.append('image', imageUrl)
    }

    await updateProfile(formData)
    close()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    applyApiError(error)
  } finally {
    isLoading.value = false
  }
}

const handleCancel = () => {
  state.file = undefined
  imagePreview.value = ''
  submitError.value = ''
  close()
}

watch(
  () => isOpen.value,
  (newVal) => {
    if (newVal) {
      submitError.value = ''
      fillProfil()
    }
  }
)
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex w-full items-center justify-between">
        <h3>Modifier mon profil</h3>
        <UButton
          color="primary"
          variant="outline"
          icon="i-lucide-x"
          class="cursor-pointer rounded-full"
          aria-label="Fermer"
          @click="handleCancel"
        />
      </div>
    </template>

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="flex flex-col gap-6"
        @submit="handleSave"
      >
        <div class="mb-2 flex flex-col items-center gap-4">
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
            <UFormField label="Prénom" name="firstname" required>
              <UInput
                v-model="state.firstname"
                placeholder="Jean"
                variant="soft"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Nom" name="lastname" required>
              <UInput
                v-model="state.lastname"
                placeholder="Bihan"
                variant="soft"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField label="Pseudo" name="pseudo" required>
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
                class="min-w-fit flex-1 cursor-pointer rounded-full border-2 border-solid bg-transparent px-4 py-2 text-sm transition-all duration-200 ease-in-out"
                :class="
                  state.experience === option
                    ? 'border-(--ui-color-error-500) text-(--ui-color-error-500)'
                    : 'border-gray-300 text-gray-700 hover:border-gray-500'
                "
                @click="state.experience = option"
              >
                {{ option }}
              </button>
            </div>
          </div>

          <UFormField label="Année de début" name="ridingStartYear">
            <UInput
              v-model.number="state.ridingStartYear"
              type="number"
              :min="1950"
              :max="currentYear"
              placeholder="2020"
              variant="soft"
              class="w-full"
            />
          </UFormField>

          <UFormField label="E-mail" name="email" required>
            <UInput
              v-model="state.email"
              type="email"
              placeholder="john.doe@gmail.com"
              variant="soft"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Mot de passe actuel"
            name="currentPassword"
            help="Requis seulement pour changer de mot de passe"
          >
            <UInput
              v-model="state.currentPassword"
              :type="show ? 'text' : 'password'"
              placeholder="Mot de passe actuel ..."
              variant="soft"
              class="w-full"
              autocomplete="current-password"
            />
          </UFormField>

          <UFormField label="Nouveau mot de passe" name="password">
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
          </UFormField>
          <UFormField label="Confirmer le mot de passe" name="confirmPassword">
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

        <div class="mt-auto flex gap-3 pt-4">
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
            class="w-1/2 font-bold"
            :loading="isLoading"
            :disabled="isLoading"
          />
        </div>

        <p v-if="submitError" class="text-center text-xs text-(--ui-error)">
          {{ submitError }}
        </p>
      </UForm>
    </template>
  </UModal>
</template>
