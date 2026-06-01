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
      <div class="content">
        <h3>Mon Profil</h3>

        <div class="avatar">
          <img v-if="state.image" :src="state.image" alt="Avatar" />
          <span v-else>{{ getInitials }}</span>
        </div>

        <div class="user-info">
          <h2>{{ state.firstname }} {{ state.lastname }}</h2>
          <p class="pseudo">@{{ state.pseudo }}</p>
        </div>

        <div class="info-section">
          <div class="info-item">
            <span class="label">Expérience</span>
            <span class="value">{{ state.experience }}</span>
          </div>

          <div class="info-item">
            <span class="label">Années de pratique</span>
            <span class="value">{{ ridingYears }} ans</span>
          </div>

          <div class="info-item">
            <span class="label">Email</span>
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

<style scoped>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-2xl);

  overflow-y: auto;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--ui-color-error-500);
  background-color: var(--ui-color-error-50);
  margin-bottom: var(--space-lg);
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.pseudo {
  color: var(--color-gray-mid);
  font-size: 0.9rem;
}

.info-section {
  width: 100%;
  max-width: 400px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-sm) 0;
  border-bottom: var(--border-thin) solid var(--color-gray-light);
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  color: var(--color-gray-mid);
  font-size: 0.9rem;
}
</style>
