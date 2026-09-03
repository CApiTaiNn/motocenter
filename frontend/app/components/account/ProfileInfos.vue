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
      <div class="flex flex-col items-center p-12 overflow-y-auto">
        <h3>Mon Profil</h3>

        <div class="flex items-center justify-center w-25 h-25 rounded-full text-4xl font-bold text-error-500 bg-error-50 mb-6 overflow-hidden">
          <img v-if="state.image" :src="state.image" alt="Avatar" class="w-full h-full object-cover" />
          <span v-else>{{ getInitials }}</span>
        </div>

        <div class="text-center mb-8">
          <h2>{{ state.firstname }} {{ state.lastname }}</h2>
          <p class="text-gray-500 text-sm">@{{ state.pseudo }}</p>
        </div>

        <div class="w-full max-w-100">
          <div class="flex justify-between py-3 border-b border-solid border-gray-300 last:border-b-0">
            <span class="text-gray-500 text-sm">Expérience</span>
            <span class="value">{{ state.experience }}</span>
          </div>

          <div class="flex justify-between py-3 border-b border-solid border-gray-300 last:border-b-0">
            <span class="text-gray-500 text-sm">Années de pratique</span>
            <span class="value">{{ ridingYears }} ans</span>
          </div>

          <div class="flex justify-between py-3 border-b border-solid border-gray-300 last:border-b-0">
            <span class="text-gray-500 text-sm">Email</span>
            <span class="value">{{ state.email }}</span>
          </div>
        </div>
        <UButton
          label="Modifier mon profil"
          class="rounded-full mt-6 w-full justify-center"
          variant="soft"
          color="neutral"
          @click="useProfileEditModal().open"
        />
        <UButton
          label="Se déconnecter"
          class="rounded-full mt-6 w-full justify-center text-white"
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
