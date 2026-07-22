<script setup lang="ts">
import type { IRide } from '~/types/ride'
import { computed } from 'vue'
import { useAuth } from '~/composables/useAuth'
import type { IUserPublic } from '~/types/users.js'
import { useConnexionModal } from '~/composables/useConnexionModal.js'

interface IProps {
  ride: IRide
}

const { user } = useAuth()
const props = defineProps<IProps>()
// Server-derived per-viewer flag — no need to scan a raw liker array.
const isLikedCurrent = ref<boolean>(props.ride.likedByMe ?? false)
const { open } = useConnexionModal()
const creator = ref<any>(null)

const dateEvent = computed(() => {
  if (!props.ride?.date_event || !props.ride?.hour_event) return new Date()

  try {
    const [hours, minutes] = props.ride.hour_event.split(':').map(Number)
    const d = new Date(props.ride.date_event)
    d.setHours(hours || 0, minutes || 0, 0, 0)
    return d
  } catch (e) {
    console.error('Erreur formatage date:', e)
    return new Date()
  }
})

const isParticipating = computed(() =>
  user.value
    ? props.ride.participating_user?.some(
        (p: any) => (p._id || p) === user?.value?._id
      )
    : false
)

const participatingCount = computed(
  () => props.ride.participating_user?.length ?? 0
)

// Propriété calculée pour transformer les données participants en format UAvatar
const participantsAvatars = computed(() => {
  if (!props.ride.participating_user) return []

  return props.ride.participating_user.map((participant: any) => {
    return {
      src: participant.image || '/images/users/default.svg',
      alt: participant.pseudo,
      label: participant.pseudo?.substring(0, 2).toUpperCase()
    }
  })
})

const emit = defineEmits(['update:like', 'update:participants'])

const srcAvatarCreator = computed<string>(() => {
  return creator.value?.image || '/images/users/default.svg'
})

const hour = computed<number>(() => {
  return Math.floor(props.ride.duration)
})

const minutes = computed<number>(() => {
  return Math.round((props.ride.duration - hour.value) * 60)
})

const imageUrl = computed(() => {
  const link = props.ride.image_link
  return link
    ? `${link}`
    : 'https://images.unsplash.com/photo-1515777315835-281b94c9589f'
})

const likeGestion = async () => {
  const runtimeConfig = useRuntimeConfig()

  try {
    const userId = user.value?._id

    // Si pas d'ID, on arrête et on ouvre la modal de connexion
    if (!userId) {
      open()
      return
    }

    // Si on est connecté, on met le like
    const res = await $fetch<{ like: number; isLiked: boolean }>(
      `${runtimeConfig.public.apiBase}rides/${props.ride._id}/like`,
      {
        method: 'PATCH',
        credentials: 'include'
      }
    )

    emit('update:like', res.like)
    isLikedCurrent.value = res.isLiked
  } catch (error) {
    console.error('Utilisateur non connecté ou erreur serveur', error)
  }
}

const participateGestion = async () => {
  const runtimeConfig = useRuntimeConfig()
  const userId = user.value?._id

  if (!userId) {
    open()
    return
  }

  try {
    const res = await $fetch<{
      participatingCount: number
      isParticipating: boolean
      updatedParticipants: any[]
    }>(`${runtimeConfig.public.apiBase}rides/${props.ride._id}/participate`, {
      method: 'PATCH',
      credentials: 'include'
    })

    emit('update:participants', res.updatedParticipants)
  } catch (error) {
    console.error('Erreur participation:', error)
  }
}

// Fonction pour charger les infos de l'auteur
const fetchCreatorInfos = async () => {
  const runtimeConfig = useRuntimeConfig()
  if (!props.ride.user_id) return

  try {
    const data = await $fetch<{ users: IUserPublic }>(
      `${runtimeConfig.public.apiBase}users/${props.ride.user_id}`
    )

    creator.value = data.users
  } catch (e) {
    console.error("Erreur lors de la récupération de l'auteur", e)
  }
}

onMounted(async () => {
  // The connected user is already in shared auth state; no per-card refetch.
  await fetchCreatorInfos()
  isLikedCurrent.value = props.ride.likedByMe ?? false
})
</script>

<template>
  <article
    class="flex w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-(--background) text-(--text-color) shadow-(--shadow-md) dark:border-gray-800"
  >
    <!-- Bandeau image : porte les seules actions flottantes -->
    <div
      class="relative h-32 w-full bg-cover bg-center"
      :style="{ backgroundImage: `url(${imageUrl})` }"
    >
      <div class="absolute inset-0 bg-linear-to-t from-black/50 to-transparent"></div>

      <UButton
        :icon="
          isLikedCurrent
            ? 'i-heroicons-hand-thumb-up-solid'
            : 'i-heroicons-hand-thumb-up'
        "
        :label="props.ride.like?.toString() || '0'"
        color="neutral"
        size="sm"
        class="absolute top-2 right-2 cursor-pointer bg-black/40 font-semibold text-white! backdrop-blur-sm transition-transform active:scale-110"
        @click="likeGestion"
      />

      <UBadge
        v-if="props.ride.is_event"
        size="md"
        icon="i-lucide-calendar-days"
        class="absolute bottom-2 left-2 bg-black/55 text-xs whitespace-nowrap text-white backdrop-blur-sm"
      >
        {{ dateEvent.toLocaleDateString('fr-FR') }}
        •
        {{
          dateEvent.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          })
        }}
      </UBadge>
    </div>

    <!-- Corps : surface pleine, lisible en clair comme en sombre -->
    <div class="flex flex-col gap-3 p-4">
      <div class="flex items-center gap-2">
        <span
          class="size-3 shrink-0 rounded-full"
          :style="{ backgroundColor: props.ride.color || '#3b82f6' }"
          aria-hidden="true"
        ></span>
        <h2 class="m-0 truncate text-lg font-bold">{{ props.ride.title }}</h2>
      </div>

      <p v-if="props.ride.description" class="line-clamp-2 text-sm text-gray-500">
        {{ props.ride.description }}
      </p>

      <div class="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-500">
        <span class="inline-flex items-center gap-1.5">
          <UIcon name="i-lucide-map-pinned" class="size-4 text-(--ui-primary)" />
          {{ props.ride.distance }} km
        </span>
        <span class="inline-flex items-center gap-1.5">
          <UIcon name="i-lucide-clock" class="size-4 text-(--ui-primary)" />
          {{ hour }} h {{ minutes }} min
        </span>
        <span class="inline-flex items-center gap-1.5">
          <UIcon name="i-lucide-map-pin" class="size-4 text-(--ui-primary)" />
          {{ props.ride.start_town }} → {{ props.ride.end_town }}
        </span>
        <span class="inline-flex items-center gap-1.5">
          <UIcon name="i-lucide-route" class="size-4 text-(--ui-primary)" />
          {{ props.ride.ride_type }}
        </span>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 pt-1 text-sm max-[480px]:flex-col! max-[480px]:items-stretch! max-[480px]:gap-3!">
        <div class="flex items-center gap-2 max-[480px]:w-full max-[480px]:flex-wrap max-[480px]:justify-start">
          <template v-if="creator">
            <UAvatar
              size="sm"
              :alt="`Avatar de ${creator.pseudo || 'MotoCenter'}`"
              :src="srcAvatarCreator"
            />
            <p class="text-gray-500">
              Créée par
              <strong class="text-(--text-color)">{{ creator.pseudo }}</strong>
            </p>
          </template>

          <template v-else>
            <UIcon name="i-lucide-loader-2" class="animate-spin text-gray-500" />
            <p class="text-gray-500">Chargement...</p>
          </template>
        </div>

        <div v-if="ride.is_event" class="flex items-center gap-3 max-[480px]:w-full max-[480px]:flex-wrap max-[480px]:justify-start">
          <UButton
            :label="isParticipating ? 'Ne plus participer' : 'Participer'"
            :color="isParticipating ? 'neutral' : 'error'"
            :variant="isParticipating ? 'subtle' : 'solid'"
            size="md"
            class="cursor-pointer px-4 font-semibold max-[480px]:flex-1 max-[480px]:justify-center"
            :class="!isParticipating ? 'text-white!' : ''"
            @click="participateGestion"
          />

          <div
            v-if="participatingCount > 0"
            class="flex items-center gap-2 rounded-full bg-gray-100 py-1 pr-3 pl-2 dark:bg-gray-800"
          >
            <UAvatarGroup size="xs" :max="3">
              <UAvatar
                v-for="(avatar, index) in participantsAvatars"
                :key="index"
                v-bind="avatar"
              />
            </UAvatarGroup>
            <span class="text-xs font-extrabold">
              {{ participatingCount }}
            </span>
          </div>

          <span v-else class="text-xs text-gray-500 italic">Aucun participant</span>
        </div>
      </div>
    </div>
  </article>
</template>
