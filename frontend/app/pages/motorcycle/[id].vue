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
        body: {
          title: m.value?.name,
          brand: m.value?.brand.name,
          category: 'Modèle',
          content: `Discussion autour de la ${m.value?.brand.name} ${m.value?.name}`,
          isNewMotoComment: true
        }
      })

      postId = newPost._id
      await $fetch(`${apiBase}motorcycles/${m.value?._id}`, {
        method: 'PUT',
        body: {
          post: postId
        }
      })

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
      body: {
        content: comment.value.content,
        user: user.value?._id,
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
  await fetchData()
  await fetchMax()
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
  <div v-if="m" class="main-content">
    <h1 class="title">{{ m.name }}</h1>
    <img :src="m.imageUrl" :alt="`Image de la moto ${m.name}`" class="img-cover moto-left" />

    <div class="detail">
      <p><span>Marque:</span> {{ m.brand.name }}</p>
      <p><span>Modèle:</span> {{ m.name }}</p>
      <p><span>Année:</span> {{ m.year }}</p>
      <p><span>Moteur:</span> {{ m.engine_size }} m3</p>
    </div>

    <div ref="statsRef" class="stats-section">
      <h3>Caractéristiques</h3>
      <div class="stats-grid">
        <div v-for="stat in statsNumbers" :key="stat.label" class="stat-card">
          <span class="stat-label">{{ stat.label }}</span>
          <CountUp :key="countStarted ? stat.label : ''" class="stat-value" :end-val="Number(stat.value)" :duration="2"
            :options="getCountUpOptions(stat.key)" :autoplay="true" />
          <div class="bar-outer">
            <div class="bar-fill" :style="{ width: stat.percent + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="sound-section">
      <AudioPlayer v-if="m.soundLink" :src="m.soundLink" />
      <p v-else>Pas d'audio</p>
    </div>

    <h4>Commentaires présents sur la moto</h4>
    <div v-if="commentsMotorcycle.length > 0" class="display-comment">
      <div v-for="comment in commentsMotorcycle" :key="comment._id">
        <Comment :response="comment" />
      </div>
    </div>
    <p v-else>Aucun commentaire sur la moto, ajouter le premier.</p>

    <div class="input-comment-box">
      <div v-if="!isAuthenticated" class="need-connection">
        <h3>
          Rejoignez la communauté pour débattre et partager vos avis sur ces
          motos !
        </h3>
        <UButton color="neutral" class="rounded-4xl self-end text-xs p-2" size="xl" @click="open()">Se connecter
        </UButton>
      </div>
      <div v-if="!messagePosted" class="input-comment-container" :class="{ blurred: !isAuthenticated }">
        <h4>
          Déjà roulé sur cette moto ?<br />
          Faite le savoir à la communauté !
        </h4>
        <div class="comment-input">
          <UTextarea v-model="comment.content" size="xl"
            placeholder="Un retour d'expérience, un conseil d'entretien ou encore une question" />
        </div>
        <UButton class="rounded-4xl self-end text-xs m-1" size="xl" @click="postComment">Poster</UButton>
      </div>
      <div v-else class="input-posted-container">
        <h4>Merci pour votre contribution !</h4>
        <p>
          Votre commentaire a été posté avec succès. Il apparaîtra dans la
          section des commentaires correspondante.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.title {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1em;
}

.main-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2em;
  padding-bottom: 4em;
}

.detail {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  border: var(--border-thin) solid var(--border-gray);
  border-radius: var(--radius-sm);
  padding: 1em;
  width: 50%;
}

span {
  font-weight: bold;
}

.stats-section {
  width: 60%;
}

.stats-section h3 {
  text-align: center;
  margin-bottom: 1em;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1em;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1em;
  border: var(--border-thin) solid var(--color-gray-light);
  border-radius: var(--radius-sm);
  gap: 0.5em;
}

.stat-label {
  font-size: 0.85em;
  color: var(--color-gray-mid);
  text-align: center;
}

.stat-value {
  font-size: 1.4em;
  font-weight: bold;
}

.sound-section {
  margin-top: 2em;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5em;
}

.motorcycle-image {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
}

.display-comment {
  flex: 1;
  border: var(--border-thin) solid var(--color-gray-light);
  border-radius: var(--radius-lg);
  padding: 2rem;
  max-width: 50%;
  height: fit-content;
}

.bar-outer {
  width: 100%;
  height: 10px;
  background-color: var(--color-track-bg);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--gradient-primary);
  border-radius: var(--radius-sm);
  animation: slide-in 2s ease-in-out;
}

@keyframes slide-in {
  from {
    width: 0;
  }
}

.input-comment-box {
  position: relative;
  margin: 3rem 25%;
  width: 50%;
  min-height: 25rem;
  border: var(--border-thin) solid var(--color-gray-mid);
  border-radius: var(--radius-lg);
}

.need-connection {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: var(--z-elevated);
  text-align: center;
}

.need-connection h3 {
  width: 400px;
}

.input-comment-container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  min-height: 25rem;
  padding: 2rem;
}

.input-comment-container h4 {
  text-align: center;
}

.comment-input {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-posted-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: fit-content;
  min-height: 25rem;
  padding: 2rem;
  gap: 30px;
}

.input-posted-container h4 {
  text-align: center;
}

.input-posted-container p {
  text-align: center;
}

.blurred {
  filter: blur(3px);
  pointer-events: none;
  user-select: none;
}

.img-cover {
  flex: 1;

  width: 50%;
  min-width: 38%;
  height: 100%;

  object-fit: cover;

  object-position: center;
}
</style>
