<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useProfileModal } from '~/composables/useProfileModal'
import { useProfileEditModal } from '~/composables/useProfileEditModal'
import { useAuth } from '~/composables/useAuth'

const { user, logout } = useAuth()
const { isOpen, close } = useProfileModal()

const state = reactive({
  firstname: '',
  lastname: '',
  pseudo: '',
  experience: 'Confirmé',
  yearsExperience: 0,
  email: '',
  image: ''
})

const fillProfil = () => {
  state.firstname = user.value?.firstname || '__'
  state.lastname = user.value?.lastname || '__'
  state.pseudo = user.value?.pseudo || '__'
  state.experience = {
    beginner: 'Débutant',
    confirmed: 'Confirmé',
    expert: 'Expert',
    other: 'Autre'
  }[user.value?.userType || 'confirmed'] as string
  state.yearsExperience = user.value?.ridingStartYear || 0
  state.email = user.value?.email || '__.__@__.__'
  state.image = user.value?.image || ''
}

const getInitials = computed(() => {
  return `${state.firstname.charAt(0)}${state.lastname.charAt(0)}`.toUpperCase()
})

const ridingYears = computed(() => {
  const currentYear = new Date().getFullYear()
  return currentYear - state.yearsExperience
})

watch(
  isOpen,
  (open) => {
    if (open) {
      fillProfil()
    }
  }
)
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <div class="flex flex-col items-center overflow-y-auto p-12">
        <h3>Mon Profil</h3>

        <div class="mb-6 flex size-[100px] items-center justify-center overflow-hidden rounded-full bg-(--ui-color-error-50) text-4xl font-bold text-(--ui-color-error-500)">
          <img v-if="state.image" :src="state.image" alt="Avatar" class="size-full object-cover" />
          <span v-else>{{ getInitials }}</span>
        </div>

        <div class="mb-8 text-center">
          <h2>{{ state.firstname }} {{ state.lastname }}</h2>
          <p class="text-sm text-gray-500">@{{ state.pseudo }}</p>
        </div>

        <div class="w-full max-w-[400px]">
          <div class="flex justify-between border-b border-solid border-gray-300 py-3 last:border-b-0">
            <span class="text-sm text-gray-500">Expérience</span>
            <span>{{ state.experience }}</span>
          </div>

          <div class="flex justify-between border-b border-solid border-gray-300 py-3 last:border-b-0">
            <span class="text-sm text-gray-500">Années de pratique</span>
            <span>{{ ridingYears }} ans</span>
          </div>

          <div class="flex justify-between border-b border-solid border-gray-300 py-3 last:border-b-0">
            <span class="text-sm text-gray-500">Email</span>
            <span>{{ state.email }}</span>
          </div>
        </div>
        <UButton
          label="Modifier mon profil"
          class="mt-6 w-full justify-center rounded-full"
          variant="soft"
          color="neutral"
          @click="useProfileEditModal().open"
        />
        <UButton
          label="Se déconnecter"
          class="mt-6 w-full justify-center rounded-full text-white"
          @click="
            () => {
              logout()
              close()
            }
          "
        />
      </div>
    </template>
  </UModal>
</template>
