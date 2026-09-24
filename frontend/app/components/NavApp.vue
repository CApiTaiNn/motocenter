<script setup lang="ts">
import LogoApp from './LogoApp.vue'
import ToggleSwitch from './ToggleSwitch.vue'
import { navItems } from '~/utils/navItems'
import { useAuth } from '~/composables/useAuth'
import { useConnexionModal } from '~/composables/useConnexionModal'
import { useProfileModal } from '~/composables/useProfileModal'

const { isAuthenticated, user, logout } = useAuth()
const route = useRoute()

const isOpen = ref(false)

// Condense the header into a translucent, blurred bar once the page scrolls,
// the way Apple's nav settles on scroll.
const scrolled = ref(false)
const onScroll = () => {
  scrolled.value = window.scrollY > 8
}
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

const connexionModal = useConnexionModal()
const profileModal = useProfileModal()

const colorMode = useColorMode()
const mode = ref<boolean>(colorMode.value === 'dark')

watch(
  () => colorMode.value,
  (newVal) => {
    mode.value = newVal === 'dark'
  }
)

watch(mode, (newVal) => {
  colorMode.preference = newVal ? 'dark' : 'light'
})

watch(() => route.path, () => {
  isOpen.value = false
})

function isActive(to: string): boolean {
  // Root only matches exactly, otherwise '/' would highlight on every page.
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}

function toggleOpen() {
  isOpen.value = !isOpen.value
}

// Account dropdown shown on the avatar when the user is signed in.
const userMenuItems = computed(() => [
  [
    {
      label: 'Mon profil',
      icon: 'i-lucide-user',
      onSelect: () => profileModal.open()
    },
    {
      label: 'Se déconnecter',
      icon: 'i-lucide-log-out',
      onSelect: () => handleLogout()
    }
  ]
])

async function handleLogout() {
  await logout()
  await navigateTo('/')
}
</script>

<template>
  <header
    class="sticky top-0 z-9999 w-full transition-[background-color,box-shadow,backdrop-filter] duration-300"
    :class="
      scrolled
        ? 'bg-(--background)/75 shadow-sm backdrop-blur-xl'
        : 'bg-(--background)'
    "
  >
    <!-- Desktop -->
    <nav
      class="hidden flex-row justify-between transition-[padding] duration-300 lg:flex"
      :class="scrolled ? 'py-1.5' : 'p-[10px]'"
    >
      <div class="mx-[2%] flex flex-row items-center gap-[10px]">
        <LogoApp />
        <ToggleSwitch v-model="mode" />
      </div>
      <div class="mx-[2%] flex flex-row items-center gap-4">
        <div
          v-for="item in navItems"
          :key="item.to"
          class="relative flex flex-col items-center"
        >
          <UButton
            size="md"
            color="neutral"
            variant="ghost"
            :to="item.to"
            :class="isActive(item.to) ? 'font-semibold text-(--ui-primary)!' : ''"
          >
            {{ item.label }}
          </UButton>
          <span
            class="absolute -bottom-1 left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-(--ui-primary) transition-opacity duration-200"
            :class="isActive(item.to) ? 'opacity-100' : 'opacity-0'"
          />
        </div>
        <UButton
          v-if="!isAuthenticated"
          trailing-icon="i-lucide-arrow-right"
          size="xl"
          color="neutral"
          class="rounded-full px-10! py-[10px]! text-sm!"
          @click="connexionModal.open()"
        >
          Connexion
        </UButton>
        <UDropdownMenu
          v-else
          :items="userMenuItems"
          :content="{ align: 'end' }"
        >
          <UButton
            color="neutral"
            variant="ghost"
            class="rounded-full p-0!"
            aria-label="Menu du compte"
            :avatar="{
              icon: 'i-lucide-user',
              src: user?.image,
              size: 'xl',
              loading: 'lazy'
            }"
          />
        </UDropdownMenu>
      </div>
    </nav>

    <!-- Mobile -->
    <nav class="flex flex-col bg-(--background) lg:hidden">
      <div class="flex flex-row items-center justify-between p-[10px]">
        <div class="mx-[2%] flex flex-row items-center gap-[10px]">
          <LogoApp />
          <ToggleSwitch v-model="mode" />
        </div>
        <button
          type="button"
          class="cursor-pointer"
          :aria-label="isOpen ? 'Fermer le menu' : 'Ouvrir le menu'"
          :aria-expanded="isOpen"
          aria-controls="mobile-menu"
          @click="toggleOpen"
        >
          <UIcon
            :name="isOpen ? 'i-lucide-chevron-down' : 'i-lucide-menu'"
            class="size-10"
          />
        </button>
      </div>
      <div
        v-if="isOpen"
        id="mobile-menu"
        class="flex flex-col gap-[10px] pb-2 text-center"
      >
        <UButton
          v-for="item in navItems"
          :key="item.to"
          size="md"
          color="neutral"
          variant="ghost"
          :to="item.to"
          class="justify-center border-l-4 transition-colors"
          :class="
            isActive(item.to)
              ? 'border-(--ui-primary) font-semibold text-(--ui-primary)!'
              : 'border-transparent'
          "
        >
          {{ item.label }}
        </UButton>
        <UButton
          v-if="!isAuthenticated"
          size="md"
          color="neutral"
          variant="ghost"
          class="justify-center"
          @click="connexionModal.open()"
        >
          Connexion
        </UButton>
        <template v-else>
          <UButton
            size="md"
            color="neutral"
            variant="ghost"
            class="justify-center"
            @click="profileModal.open()"
          >
            Mon profil
          </UButton>
          <UButton
            size="md"
            color="neutral"
            variant="ghost"
            class="justify-center"
            @click="handleLogout()"
          >
            Se déconnecter
          </UButton>
        </template>
      </div>
    </nav>
  </header>
</template>
