<script setup lang="ts">
import ToggleSwitch from './ToggleSwitch.vue'
import LogoApp from './LogoApp.vue'
import { useAuth } from '~/composables/useAuth'
import { useConnexionModal } from '~/composables/useConnexionModal'
import { useProfileModal } from '~/composables/useProfileModal'

const { isAuthenticated, user } = useAuth()

const isOpen = ref(false)
const mode = ref(false)
const colorMode = useColorMode()

const connexionModal = useConnexionModal()
const profileModal = useProfileModal()

function toggle_open() {
  isOpen.value = !isOpen.value
}

// In the loading of the page
watch(
  () => colorMode.value,
  (newVal) => {
    mode.value = newVal === 'dark'
  },
  { immediate: true }
)

// To update the color mode when the toggle switch is changed
colorMode.preference = computed(() => (mode.value ? 'dark' : 'light'))
</script>

<template>
  <div id="navbar-pc">
    <div class="navbar">
      <div class="list-left">
        <LogoApp />
        <ToggleSwitch v-model="mode" />
      </div>
      <div class="list-right">
        <UButton size="md" color="neutral" variant="ghost" to="/comparo"
          >Comparateur</UButton
        >
        <UButton size="md" color="neutral" variant="ghost" to="/forum"
          >Forum</UButton
        >
        <UButton size="md" color="neutral" variant="ghost" to="/ride"
          >Balades</UButton
        >
        <UButton size="md" color="neutral" variant="ghost" to="/knowUs"
          >Nous connaitre</UButton
        >
        <UButton
          v-if="!isAuthenticated"
          trailing-icon="i-lucide-arrow-right"
          size="xl"
          color="neutral"
          class="rounded-full button"
          @click="connexionModal.open()"
          >Connexion
        </UButton>
        <UAvatar
          v-else
          icon="i-lucide-user"
          :src="user?.image"
          size="xl"
          loading="lazy"
          @click="profileModal.open()"
        />
      </div>
    </div>
  </div>
  <div id="navbar-mobile">
    <div class="navbar">
      <div class="list-left">
        <LogoApp />
        <ToggleSwitch v-model="mode" />
      </div>
      <UIcon
        :name="isOpen ? 'i-lucide-chevron-down' : 'i-lucide-menu'"
        class="size-10"
        @click="toggle_open"
      />
    </div>
    <div v-if="isOpen" class="list-mobile">
      <UButton
        size="md"
        color="neutral"
        variant="ghost"
        style="justify-content: center"
        to="/comparo"
        >Comparateur</UButton
      >
      <UButton
        size="md"
        color="neutral"
        variant="ghost"
        style="justify-content: center"
        to="/forum"
        >Forum</UButton
      >
      <UButton
        size="md"
        color="neutral"
        variant="ghost"
        style="justify-content: center"
        to="/ride"
        >Balades</UButton
      >
      <UButton
        size="md"
        color="neutral"
        variant="ghost"
        style="justify-content: center"
        to="/knowUs"
        >Nous connaitre</UButton
      >
      <UButton
        v-if="!isAuthenticated"
        size="md"
        color="neutral"
        variant="ghost"
        style="justify-content: center"
        @click="connexionModal.open()"
        >Connexion</UButton
      >
      <UButton
        v-if="isAuthenticated"
        size="md"
        color="neutral"
        variant="ghost"
        style="justify-content: center"
        @click="profileModal.open()"
        >Mon profil</UButton
      >
    </div>
  </div>
</template>

<style scoped>
.navbar {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  background-color: var(--background);

  padding: 10px;
}

#navbar-mobile,
#navbar-pc {
  position: sticky;
  top: 0;
  width: 100%;
  z-index: 9999;
}

.logo {
  font-size: 1rem;
  font-weight: bold;
  font-family: 'Krona-one';

  padding: 10px 25px;

  color: white;
}

.list-left {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;

  margin: 0 2%;
}

.list-right {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 40px;

  margin: 0 2%;
}

/** Style version PC */
@media (max-width: 1024px) {
  #navbar-pc {
    display: none;
  }
}

/** Style version mobile */

@media (min-width: 1024px) {
  #navbar-mobile {
    display: none;
  }
}

.list-mobile {
  display: flex;
  flex-direction: column;
  gap: 10px;

  text-align: center;

  background-color: var(--background);
}

:deep(.button) {
  font-size: small;
  padding: 10px 40px;
}
</style>
