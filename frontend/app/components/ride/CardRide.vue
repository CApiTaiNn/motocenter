<script setup lang="ts">
import type { IRide } from '~/types/ride'
import { computed } from 'vue'
import { RIDE_FALLBACK_COLOR } from '~/utils/ride'
import { useAuth } from '~/composables/useAuth'
import type { IUserPublic } from '~/types/users.js'
import { useConnexionModal } from '~/composables/useConnexionModal.js'

const toast = useToast()

interface IProps {
  ride: IRide
  // Couleur attribuée par rang de longueur (vert → rouge), fournie par la carte
  // pour rester identique au pin et au tracé.
  color?: string
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

const emit = defineEmits(['update:like', 'update:participants', 'select'])

const dotColor = computed(() => props.color ?? RIDE_FALLBACK_COLOR)

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
    toast.add({
      title: 'Erreur',
      description: "Votre participation n'a pas pu être enregistrée.",
      color: 'error'
    })
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
  <div
    class="relative flex h-auto min-h-[124px] w-full cursor-pointer flex-col overflow-visible rounded-xl bg-cover bg-center shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-shadow hover:shadow-[0_6px_18px_rgba(0,0,0,0.28)]"
    :style="{ backgroundImage: `url(${imageUrl})` }"
    role="button"
    tabindex="0"
    @click="emit('select', props.ride._id)"
    @keydown.enter="emit('select', props.ride._id)"
  >
    <div class="absolute inset-0 z-1 rounded-xl bg-linear-to-t from-black/95 via-black/70 to-black/40"></div>

    <div class="relative z-2 flex flex-col gap-1 p-2 text-white md:p-3!">
      <header class="flex w-full flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 flex-1 flex-row flex-wrap items-center gap-2">
          <span
            class="size-[10px] rounded-full shadow-[0_0_10px_rgba(255,255,255,0.3)]"
            :style="{ backgroundColor: dotColor }"
            aria-hidden="true"
          ></span>

          <h2 class="m-0 shrink overflow-hidden text-base font-bold text-ellipsis whitespace-normal [text-shadow:0_2px_4px_rgba(0,0,0,0.5)] md:text-lg!">{{ props.ride.title }}</h2>

          <UBadge
            v-if="props.ride.is_event"
            variant="subtle"
            size="sm"
            icon="i-lucide-calendar-days"
            class="shrink-0 border border-white/20 bg-white/15 px-1.5 py-0.5 text-xs whitespace-nowrap text-white backdrop-blur-xs"
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

        <UButton
          icon="i-lucide-thumbs-up"
          :label="props.ride.like?.toString() || '0'"
          variant="ghost"
          color="neutral"
          size="xs"
          class="cursor-pointer font-bold transition-transform hover:bg-white/15 active:scale-120"
          :class="isLikedCurrent ? 'text-(--ui-primary)!' : 'text-white!'"
          @click.stop="likeGestion"
        />
      </header>

      <p class="mt-0.5 mb-1.5 line-clamp-2 text-xs opacity-85">{{ props.ride.description }}</p>

      <footer>
        <div class="mb-1.5 flex flex-wrap gap-x-3 gap-y-1">
          <UBadge
            variant="subtle"
            size="sm"
            icon="i-lucide-map-pinned"
            class="invisible-background"
          >
            {{ props.ride.distance }} km
          </UBadge>
          <UBadge
            variant="subtle"
            size="sm"
            icon="i-lucide-clock"
            class="invisible-background"
          >
            {{ hour }} h {{ minutes }} min
          </UBadge>
          <UBadge
            variant="subtle"
            size="sm"
            icon="i-lucide-map-pin"
            class="invisible-background"
          >
            {{ props.ride.start_town }} → {{ props.ride.end_town }}
          </UBadge>
          <UBadge
            variant="subtle"
            size="sm"
            icon="i-lucide-route"
            class="invisible-background"
          >
            {{ props.ride.ride_type }}
          </UBadge>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 pt-1.5 text-xs max-[480px]:flex-col! max-[480px]:items-stretch! max-[480px]:gap-3!">
          <div class="flex items-center gap-3 max-[480px]:w-full max-[480px]:flex-wrap max-[480px]:justify-start">
            <template v-if="creator">
              <UAvatar
                size="xs"
                :alt="`Avatar de ${creator.pseudo || 'MotoCenter'}`"
                :src="srcAvatarCreator"
              />
              <p>
                Créée par <strong>{{ creator.pseudo }}</strong>
              </p>
            </template>

            <template v-else>
              <UIcon name="i-lucide-loader-2" class="animate-spin" />
              <p>Chargement...</p>
            </template>
          </div>

          <div v-if="ride.is_event" class="flex items-center gap-3 max-[480px]:w-full max-[480px]:flex-wrap max-[480px]:justify-start">
            <UButton
              :label="isParticipating ? 'Ne plus participer' : 'Participer'"
              :color="isParticipating ? 'neutral' : 'error'"
              :variant="isParticipating ? 'subtle' : 'solid'"
              size="sm"
              class="cursor-pointer px-4 font-bold max-[480px]:flex-1 max-[480px]:justify-center"
              :class="!isParticipating ? 'text-white!' : ''"
              @click.stop="participateGestion"
            />

            <div v-if="participatingCount > 0" class="flex items-center gap-2 rounded-[20px] bg-white/90 py-1 pr-3 pl-2 text-gray-700">
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

            <span v-else class="text-xs italic opacity-70">Aucun participant </span>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Style partagé pour tous les badges d'info : override des internes Nuxt UI */
.invisible-background,
:deep(.invisible-background) {
  background-color: transparent !important;
  color: white !important;
  border: none !important;
  box-shadow: none !important;
  padding-left: 0 !important;
  padding-right: 0.75rem !important;
}

:deep(.invisible-background .pointer-events-none) {
  color: white !important;
}
</style>
