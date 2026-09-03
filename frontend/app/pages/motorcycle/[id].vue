<script setup lang="ts">
import { onMounted, ref, computed, watch, nextTick, reactive } from 'vue'
import type { IMotorcycle } from '~/types/motorcycles'
import CountUp from 'vue-countup-v3'
import type { IMessage } from '~/types/messages'
import Comment from '~/components/forum/Comment.vue'
import { useAuth } from '~/composables/useAuth'
import { useConnexionModal } from '~/composables/useConnexionModal'

interface ICommentInput {
  motorcycleId: string
  motorcycleName: string
  brand: string
  content: string
  user: string
}

interface IMaxStats {
  maxYear: number
  maxEngineSize: number
  maxHorsePower: number
  maxTorque: number
  maxWeight: number
  maxConsumption: number
  maxAcceleration: number
  maxSpeedMax: number
  maxPrice: number
}

const route = useRoute()
const id = route.params.id as string
const apiBase = useRuntimeConfig().public.apiBase
const m = ref<IMotorcycle | null>(null)
const commentsMotorcycle = ref<IMessage[]>([])
const comment = ref<ICommentInput>({
  motorcycleId: id,
  motorcycleName: '',
  brand: '',
  content: '',
  user: ''
})
const messagePosted = ref<boolean>(false)
const { isAuthenticated, user } = useAuth()
const { open } = useConnexionModal()

const statsRef = ref<HTMLElement | null>(null)
const countStarted = ref(false)

const fieldCategories = {
  numbers: [
    'year',
    'engine_size',
    'horsePower',
    'torque',
    'weight',
    'consumption',
    'acceleration',
    'speedMax',
    'price'
  ],
  sound: 'soundLink',
  image: 'imageUrl'
}

const fieldMaxRef = reactive<Record<string, number>>({
  year: 2030,
  engine_size: 2000,
  horsePower: 200,
  torque: 200,
  weight: 300,
  consumption: 15,
  acceleration: 15,
  speedMax: 320,
  price: 30000
})

const fieldLabels: Record<string, string> = {
  year: 'Année',
  engine_size: 'Cylindrée (cc)',
  horsePower: 'Puissance (ch)',
  torque: 'Couple (Nm)',
  weight: 'Poids (kg)',
  consumption: 'Consommation (L/100km)',
  acceleration: 'Accélération (0-100)',
  speedMax: 'Vitesse max (km/h)',
  price: 'Prix (€)'
}

const statsNumbers = computed(() => {
  if (!m.value) return []
  return fieldCategories.numbers
    .filter((key) => m.value![key as keyof IMotorcycle] !== undefined)
    .map((key) => {
      const raw = Number(m.value![key as keyof IMotorcycle])
      const ref = fieldMaxRef[key] ?? raw
      const normalized = key === 'year' ? raw - 1950 : raw
      const refNorm = key === 'year' ? ref - 1950 : ref
      return {
        key,
        label: fieldLabels[key] ?? key,
        value: raw,
        percent: Math.min((normalized / refNorm) * 100, 100)
      }
    })
})

const statsGroups = computed(() => {
  const groups: Record<string, string[]> = {
    Moteur: ['engine_size', 'horsePower', 'torque'],
    Performances: ['acceleration', 'speedMax', 'consumption'],
    'Caractéristiques générales': ['year', 'weight', 'price']
  }
  return Object.entries(groups)
    .map(([label, keys]) => ({
      label,
      stats: statsNumbers.value.filter((s) => keys.includes(s.key))
    }))
    .filter((g) => g.stats.length > 0)
})

function getCountUpOptions(key: string) {
  return {
    useEasing: true,
    separator: key === 'year' ? '' : ' '
  }
}

async function fetchData() {
  const data = await $fetch<{ motorcycles: IMotorcycle[] }>(
    `${apiBase}motorcycles`,
    {
      params: {
        filter: JSON.stringify({ _id: id }),
        project: 'all'
      }
    }
  )
  m.value = data.motorcycles?.[0] ?? null
}

async function fetchMax() {
  const data = await $fetch<IMaxStats>(`${apiBase}motorcycles/max-stats`)
  fieldMaxRef.year = data.maxYear
  fieldMaxRef.engine_size = data.maxEngineSize
  fieldMaxRef.horsePower = data.maxHorsePower
  fieldMaxRef.torque = data.maxTorque
  fieldMaxRef.weight = data.maxWeight
  fieldMaxRef.consumption = data.maxConsumption
  fieldMaxRef.acceleration = data.maxAcceleration
  fieldMaxRef.speedMax = data.maxSpeedMax
  fieldMaxRef.price = data.maxPrice
}

async function fetchMessages() {
  const post1 = m.value?.post
  if (post1) {
    const data = await $fetch<{ messages: IMessage[] }>(
      `${apiBase}posts/${post1}/responses`,
      {
        params: {
          project: 'content, user, createdAt, like, dislike,usersLikeId,usersDislikeId',
          deep: true,
          limit: 5
        }
      }
    )
    commentsMotorcycle.value = data.messages
  }
}

async function postComment() {
  if (!comment.value.content || !comment.value.motorcycleId) return

  let postId = m.value?.post
  if (!postId && user.value) {
    try {
      const newPost = await $fetch<{ _id: string }>(`${apiBase}posts`, {
        method: 'POST',
        credentials: 'include',
        body: {
          title: m.value?.name,
          brand: m.value?.brand.name,
          category: 'model',
          content: `Discussion autour de la ${m.value?.brand.name} ${m.value?.name}`,
          isNewMotoComment: true,
          motorcycleId: m.value?._id
        }
      })

      postId = newPost._id

      if (m.value) {
        m.value.post = postId
      }
    } catch (error) {
      console.error('Error creating post:', error)
      return
    }
  }

  try {
    await $fetch(`${apiBase}messages`, {
      method: 'POST',
      credentials: 'include',
      body: {
        content: comment.value.content,
        reference: postId,
        referenceModel: 'Post'
      }
    })
    messagePosted.value = true
  } catch (error) {
    console.error('Error posting comment:', error)
  }
  await fetchMessages()
}

onMounted(async () => {
  await Promise.all([fetchData(), fetchMax()])
  await fetchMessages()
})

watch(
  m,
  async () => {
    await nextTick()

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          countStarted.value = true
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    if (statsRef.value) observer.observe(statsRef.value)
  },
  { once: true }
)
</script>

<template>
  <div v-if="m" class="main-content flex flex-col items-center gap-8 pb-16">
    <h1 class="title flex items-center justify-center mt-4">{{ m.name }}</h1>
    <img :src="m.imageUrl" :alt="`Image de la moto ${m.name}`" class="img-cover moto-left flex-1 w-1/2 min-w-[38%] h-full object-cover object-center max-md:w-[90%]! max-lg:w-[70%]!" />

    <div class="detail flex flex-col gap-2 border border-solid border-(--border-gray) rounded-lg p-4 w-1/2 max-md:w-[90%]! max-lg:w-[70%]!">
      <p><span class="font-bold">Marque:</span> {{ m.brand.name }}</p>
      <p><span class="font-bold">Modèle:</span> {{ m.name }}</p>
      <p><span class="font-bold">Année:</span> {{ m.year }}</p>
      <p><span class="font-bold">Moteur:</span> {{ m.engine_size }} m3</p>
    </div>

    <div ref="statsRef" class="stats-section w-3/5 max-md:w-[90%]! max-lg:w-[75%]!">
      <h3 class="text-center mb-4">Caractéristiques</h3>
      <div v-for="group in statsGroups" :key="group.label" class="stats-group mb-8">
        <h4 class="stats-group-label mb-3 pl-1 border-l-[3px] border-solid border-primary uppercase text-sm text-gray-500 tracking-[0.08em] font-['Krona_One',sans-serif]">{{ group.label }}</h4>
        <div class="stats-grid grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          <div v-for="stat in group.stats" :key="stat.label" class="stat-card flex flex-col items-center p-4 border border-solid border-gray-300 rounded-lg gap-2">
            <span class="stat-label text-sm text-gray-500 text-center font-bold">{{ stat.label }}</span>
            <CountUp
              v-if="countStarted"
              class="stat-value text-2xl font-bold"
              :end-val="Number(stat.value)"
              :duration="3.5"
              :options="getCountUpOptions(stat.key)"
            />
            <span v-else class="stat-value text-2xl font-bold">0</span>
            <div class="bar-outer w-full h-2.5 bg-(--color-track-bg) rounded-lg overflow-hidden">
              <div class="bar-fill h-full rounded-lg" :style="{ width: stat.percent + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <UCard class="sound-section w-3/5 mt-8 flex flex-col items-center gap-2 max-md:w-[90%]! max-lg:w-[75%]!">
      <div class="sound-header flex items-center gap-2 mb-4">
        <UIcon name="i-lucide-audio-waveform" class="size-6 text-primary" />
        <h4>Son moteur</h4>
      </div>
      <AudioPlayer v-if="m.soundLink" :src="m.soundLink" />
      <p v-else class="sound-empty text-gray-500 italic text-center py-4">Aucun extrait audio disponible pour cette moto.</p>
    </UCard>

    <h4>Commentaires présents sur la moto</h4>
    <div v-if="commentsMotorcycle.length > 0" class="display-comment flex-1 border border-solid border-gray-300 rounded-[20px] p-8 max-w-1/2 h-fit max-md:max-w-[95%]! max-lg:max-w-[72%]!">
      <div v-for="motoComment in commentsMotorcycle" :key="motoComment._id">
        <Comment :response="motoComment" />
      </div>
    </div>
    <p v-else>Aucun commentaire sur la moto, ajouter le premier.</p>

    <UCard v-if="!isAuthenticated" class="input-comment-box relative my-12 mx-[25%] w-1/2 min-h-100 border border-solid border-gray-500 rounded-[20px] max-lg:mx-[12%] max-lg:w-[76%] max-lg:min-h-auto max-md:my-6 max-md:mx-4 max-md:w-auto">
      <div class="auth-prompt flex flex-col items-center gap-4 p-8 text-center">
        <UIcon name="i-lucide-users" class="size-12 text-primary" />
        <h3>Rejoignez la communauté</h3>
        <p class="auth-prompt-text text-gray-500 max-w-112">
          Connectez-vous pour débattre et partager vos avis sur cette moto.
        </p>
        <UButton color="primary" size="xl" class="text-white! cursor-pointer" @click="open()">
          Se connecter
        </UButton>
      </div>
    </UCard>
    <div v-else class="input-comment-box relative my-12 mx-[25%] w-1/2 min-h-100 border border-solid border-gray-500 rounded-[20px] max-lg:mx-[12%] max-lg:w-[76%] max-lg:min-h-auto max-md:my-6 max-md:mx-4 max-md:w-auto">
      <div v-if="!messagePosted" class="input-comment-container flex flex-col justify-between h-full min-h-100 p-8 max-lg:min-h-auto max-lg:p-4">
        <h4 class="text-center">
          Déjà roulé sur cette moto ?<br />
          Faite le savoir à la communauté !
        </h4>
        <div class="comment-input flex flex-col gap-4">
          <UTextarea
v-model="comment.content" size="xl"
            placeholder="Un retour d'expérience, un conseil d'entretien ou encore une question" />
        </div>
        <UButton class="rounded-4xl self-end text-xs m-1" size="xl" @click="postComment">Poster</UButton>
      </div>
      <div v-else class="input-posted-container flex flex-col justify-center h-fit min-h-100 p-8 gap-8 max-lg:min-h-auto max-lg:p-4">
        <h4 class="text-center">Merci pour votre contribution !</h4>
        <p class="text-center">
          Votre commentaire a été posté avec succès. Il apparaîtra dans la
          section des commentaires correspondante.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Kept: gradient background (var(--gradient-primary)) + keyframe animation
   don't map to a single Tailwind utility. */
.bar-fill {
  background: var(--gradient-primary);
  animation: slide-in 2s ease-in-out;
}

@keyframes slide-in {
  from {
    width: 0;
  }
}
</style>
