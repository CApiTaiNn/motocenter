<script setup lang="ts">
import type { IRide } from '~/types/ride'
import { computed } from 'vue'
import { useAuth } from '~/composables/useAuth'
import type { IUser } from '~/types/users.js'
import { useConnexionModal } from '~/composables/useConnexionModal.js'

interface IProps {
  ride: IRide
}

const { user } = useAuth()
const props = defineProps<IProps>()
const isLikedCurrent = ref<boolean>(
  props.ride.liked_id?.includes(user.value?._id ?? '') ?? false
)
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
        body: { userId: userId }
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
      body: { userId }
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
    const data: any = await $fetch<{ user: IUser }>(
      `${runtimeConfig.public.apiBase}users`,
      {
        params: {
          filter: JSON.stringify({ _id: props.ride.user_id }),
          project: 'pseudo,image'
        }
      }
    )

    creator.value = data.users[0] || data
  } catch (e) {
    console.error("Erreur lors de la récupération de l'auteur", e)
  }
}

onMounted(async () => {
  await fetchCreatorInfos()

  const runtimeConfig = useRuntimeConfig()
  const currentUser: any = await $fetch(
    `${runtimeConfig.public.apiBase}users/account`,
    { credentials: 'include' }
  )
  if (currentUser.users && props.ride.liked_id) {
    isLikedCurrent.value = props.ride.liked_id.includes(currentUser.users._id)
  }
})
</script>

<template>
  <div class="card-image" :style="{ backgroundImage: `url(${imageUrl})` }">
    <div class="overlay"></div>

    <div class="card-content md:p-6!">
      <header class="card-header">
        <div class="title-wrapper">
          <span
            class="dot"
            :style="{ backgroundColor: props.ride.color || '#3b82f6' }"
            aria-hidden="true"
          ></span>

          <h2 class="title md:text-2xl!">{{ props.ride.title }}</h2>

          <UBadge
            v-if="props.ride.is_event"
            variant="subtle"
            size="md"
            icon="i-lucide-calendar-days"
            class="bg-white/15 backdrop-blur-xs text-white border border-white/20 text-[0.7rem] py-0.5 px-2 whitespace-nowrap shrink-0"
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
          :icon="
            isLikedCurrent
              ? 'i-heroicons-hand-thumb-up-solid'
              : 'i-heroicons-hand-thumb-up'
          "
          :label="props.ride.like?.toString() || '0'"
          variant="subtle"
          color="neutral"
          size="md"
          class="text-white! font-bold transition-transform active:scale-120 cursor-pointer"
          @click="likeGestion"
        />
      </header>

      <p class="description">{{ props.ride.description }}</p>

      <footer>
        <div class="info-grid">
          <UBadge
            variant="subtle"
            size="lg"
            icon="i-lucide-map-pinned"
            class="invisible-background"
          >
            {{ props.ride.distance }} km
          </UBadge>
          <UBadge
            variant="subtle"
            size="lg"
            icon="i-lucide-clock"
            class="invisible-background"
          >
            {{ hour }} h {{ minutes }} min
          </UBadge>
          <UBadge
            variant="subtle"
            size="lg"
            icon="i-lucide-map-pin"
            class="invisible-background"
          >
            {{ props.ride.start_town }} → {{ props.ride.end_town }}
          </UBadge>
          <UBadge
            variant="subtle"
            size="lg"
            icon="i-lucide-route"
            class="invisible-background"
          >
            {{ props.ride.ride_type }}
          </UBadge>
        </div>

        <div class="card-footer-container max-[480px]:flex-col! max-[480px]:items-stretch! max-[480px]:gap-3!">
          <div class="card-footer-item max-[480px]:w-full max-[480px]:justify-start max-[480px]:flex-wrap">
            <template v-if="creator">
              <UAvatar
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

          <div v-if="ride.is_event" class="card-footer-item max-[480px]:w-full max-[480px]:justify-start max-[480px]:flex-wrap">
            <UButton
              :label="isParticipating ? 'Ne plus participer' : 'Participer'"
              :color="isParticipating ? 'neutral' : 'error'"
              :variant="isParticipating ? 'subtle' : 'solid'"
              size="lg"
              class="px-5 font-bold max-[480px]:flex-1 max-[480px]:justify-center cursor-pointer"
              :class="!isParticipating ? 'text-white!' : ''"
              @click="participateGestion"
            />

            <div v-if="participatingCount > 0" class="participants-list">
              <UAvatarGroup size="xs" :max="3">
                <UAvatar
                  v-for="(avatar, index) in participantsAvatars"
                  :key="index"
                  v-bind="avatar"
                />
              </UAvatarGroup>
              <span class="participants-count">
                {{ participatingCount }}
              </span>
            </div>

            <span v-else class="no-participants">Aucun participant </span>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* --- CONTENEUR GLOBAL & OVERLAY --- */
.card-image {
  position: relative;
  width: 100%;
  height: auto;
  min-height: 220px;
  background-size: cover;
  background-position: center;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.overlay {
  position: absolute;
  border-radius: var(--radius-md);
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.95) 0%,
    rgba(0, 0, 0, 0.7) 50%,
    rgba(0, 0, 0, 0.4) 100%
  );
  z-index: var(--z-base);
}

.card-content {
  position: relative;
  z-index: 2;
  padding: var(--space-md);
  color: white;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

/* --- HEADER : TITRE & LIKE --- */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
  width: 100%;
}

.title-wrapper {
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
  flex: 1;
}

.title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
}

.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

/* --- CORPS : DESCRIPTION & GRILLE D'INFOS --- */
.description {
  font-size: 0.9rem;
  opacity: 0.85;
  margin: var(--space-2xs) 0 var(--space-sm) 0;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2xs) var(--space-sm);
  margin-bottom: var(--space-sm);
}

/* Style partagé pour tous les badges d'info */
.invisible-background,
:deep(.invisible-background) {
  background-color: transparent !important;
  color: white !important;
  border: none !important;
  box-shadow: none !important;
  padding-left: 0 !important;
  padding-right: var(--space-sm) !important;
}

:deep(.invisible-background .pointer-events-none) {
  color: white !important;
}

/* --- FOOTER : CREATEUR & PARTICIPATION --- */
.card-footer-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: var(--border-thin) solid rgba(255, 255, 255, 0.1);
  font-size: 0.85rem;
}

.card-footer-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.no-participants {
  font-size: 0.75rem;
  opacity: 0.7;
  font-style: italic;
}

.participants-list {
  background-color: rgba(255, 255, 255, 0.9);
  padding: var(--space-2xs) var(--space-sm) var(--space-2xs) var(--space-xs);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--color-gray-dark);
}

.participants-count {
  font-size: 0.75rem;
  font-weight: 800;
}

</style>
