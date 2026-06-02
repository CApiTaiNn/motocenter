<script setup lang="ts">
import type { IMotorcycle } from '~/types/motorcycles'
import ResultatFieldNumber from '~/components/card/ResultatFieldNumber.vue'
import ResultatFieldImg from '~/components/card/ResultatFieldImg.vue'
import ResultatFieldSound from '~/components/card/ResultatFieldSound.vue'
import MotocyclesForm from '~/components/form/MotocyclesForm.vue'
import CarrouselMotorcycles from '~/components/CarrouselMotorcycles.vue'
import Comment from '~/components/forum/Comment.vue'
import type { IMessage } from '~/types/messages'
import DualMotorcycle from '~/components/card/DualMotorcycle.vue'
import { useAuth } from '~/composables/useAuth'
import { useConnexionModal } from '~/composables/useConnexionModal'

interface ICommentInput {
  motorcycleId: string
  motorcycleName: string
  brand: string
  content: string
  user: string
}

const apiBase = useRuntimeConfig().public.apiBase
const showResultat = ref(false)
const motorcycle1 = ref<IMotorcycle>()
const motorcycle2 = ref<IMotorcycle>()
const motorcycle1Id = ref<string>('')
const motorcycle2Id = ref<string>('')
const toast = useToast()
const { open } = useConnexionModal()
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
  Image: 'imageUrl'
}
const resultatTemplate = useTemplateRef('resultat')
const carousselBeginnerBikes = ref<IMotorcycle[]>([])
const carousselSportBikes = ref<IMotorcycle[]>([])
const carousselAdventureBikes = ref<IMotorcycle[]>([])
const { isAuthenticated, user } = useAuth()
const messagePosted = ref<boolean>(false)
const optionMotorcycles = computed(() => {
  if (!motorcycle1.value || !motorcycle2.value) return []
  return [
    { label: motorcycle1.value.name, value: motorcycle1.value._id },
    { label: motorcycle2.value.name, value: motorcycle2.value._id }
  ]
})
const comment = ref<ICommentInput>({
  motorcycleId: '',
  motorcycleName: '',
  brand: '',
  content: '',
  user: ''
})
// Tableau pour chaque Categories
const resultatNumber = reactive<
  {
    fieldName: string
    firstValue: number
    secondValue: number
  }[]
>([])
const resultatSound = reactive<
  {
    fieldName: string
    firstValue: string
    secondValue: string
  }[]
>([])
const resultatImg = reactive<
  {
    fieldName: string
    firstValue: string
    secondValue: string
  }[]
>([])
const motorcycle1PreviewUrl = ref<string>('')
const motorcycle2PreviewUrl = ref<string>('')
const commentsMotorcycle1 = ref<IMessage[]>([])
const commentsMotorcycle2 = ref<IMessage[]>([])

function createResultat() {
  resultatNumber.length = 0
  resultatSound.length = 0
  resultatImg.length = 0
  if (motorcycle1.value && motorcycle2.value) {
    const allKeys = new Set([
      ...Object.keys(motorcycle1.value),
      ...Object.keys(motorcycle2.value)
    ])
    for (const key of allKeys) {
      const fieldName = key as keyof IMotorcycle
      if (fieldCategories.numbers.includes(fieldName)) {
        resultatNumber.push({
          fieldName,
          firstValue: Number(motorcycle1.value[fieldName] ?? 0),
          secondValue: Number(motorcycle2.value[fieldName] ?? 0)
        })
      } else if (fieldCategories.sound === fieldName) {
        resultatSound.push({
          fieldName,
          firstValue: String(motorcycle1.value[fieldName] ?? ''),
          secondValue: String(motorcycle2.value[fieldName] ?? '')
        })
      } else if (fieldCategories.Image === fieldName) {
        resultatImg.push({
          fieldName,
          firstValue: String(motorcycle1.value[fieldName] ?? ''),
          secondValue: String(motorcycle2.value[fieldName] ?? '')
        })
      }
    }
  }
  fetchMessages()
}

async function fetchMotocycles() {
  const data = await $fetch<{ motorcycles: IMotorcycle[] }>(
    `${apiBase}motorcycles`,
    {
      params: {
        filter: JSON.stringify({
          _id: { $in: [motorcycle1Id.value, motorcycle2Id.value] }
        }),
        project: 'all'
      }
    }
  )
  motorcycle1.value = data.motorcycles.find(
    (m) => m._id === motorcycle1Id.value
  )
  motorcycle2.value = data.motorcycles.find(
    (m) => m._id === motorcycle2Id.value
  )

  createResultat()
  showResultat.value = true
  await nextTick()
  resultatTemplate.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function fetchCarrouselMotorcycles() {
  const project = 'name,horsePower,torque,price, imageUrl'
  const limit = 10
  const groups = [
    { target: carousselSportBikes, filter: { category: 'sportsbike' } },
    { target: carousselBeginnerBikes, filter: { isAvailableA2: true } },
    { target: carousselAdventureBikes, filter: { category: 'adventure' } }
  ]
  await Promise.all(
    groups.map(async ({ target, filter }) => {
      const data = await $fetch<{ motorcycles: IMotorcycle[] }>(
        `${apiBase}motorcycles`,
        { params: { filter: JSON.stringify(filter), project, limit } }
      )
      target.value = data.motorcycles
    })
  )
}

async function fetchMessages() {
  const loadComments = (postId: string) =>
    $fetch<{ messages: IMessage[] }>(`${apiBase}posts/${postId}/responses`, {
      params: {
        project:
          'content, user, createdAt, like, dislike,usersLikeId,usersDislikeId',
        deep: true,
        limit: 5
      }
    })

  const post1 = motorcycle1.value?.post
  const post2 = motorcycle2.value?.post
  const [data1, data2] = await Promise.all([
    post1 ? loadComments(post1) : null,
    post2 ? loadComments(post2) : null
  ])
  if (data1) commentsMotorcycle1.value = data1.messages
  if (data2) commentsMotorcycle2.value = data2.messages
}

async function postComment() {
  if (!comment.value.content || !comment.value.motorcycleId) return

  const selectedMotorcycle =
    motorcycle1.value?._id === comment.value.motorcycleId
      ? motorcycle1.value
      : motorcycle2.value
  if (!selectedMotorcycle) return

  let postId = selectedMotorcycle.post

  if (!postId) {
    try {
      const newPost = await $fetch<{ _id: string }>(`${apiBase}posts`, {
        method: 'POST',
        body: {
          title: selectedMotorcycle.name,
          brand: selectedMotorcycle.brand.name,
          category: 'Modèle',
          content: `Discussion autour de la ${selectedMotorcycle.brand.name} ${selectedMotorcycle.name}`,
          isNewMotoComment: true
        }
      })

      postId = newPost._id
      await $fetch(`${apiBase}motorcycles/${selectedMotorcycle._id}`, {
        method: 'PUT',
        body: {
          post: postId
        }
      })

      selectedMotorcycle.post = postId
    } catch (error) {
      console.error('Error creating post:', error)
      return
    }
  }

  try {
    const newMessage = await $fetch.raw(`${apiBase}messages`, {
      method: 'POST',
      body: {
        content: comment.value.content,
        user: user.value?._id,
        reference: postId,
        referenceModel: 'Post'
      }
    })
    if (newMessage.ok) {
      toast.add({
        title: 'Succès',
        description: 'Votre commentaire a été ajouté.',
        color: 'success'
      })
    }
    messagePosted.value = true
  } catch (error) {
    console.error('Error posting comment:', error)
    toast.add({
      title: 'Erreur',
      description: "Votre commentaire n'a pas pu être ajouté.",
      color: 'error'
    })
  }

  await fetchMessages()
}

function handleCaroussel(_id: string, imgUrl: string) {
  if (motorcycle1Id.value && motorcycle2Id.value) {
    handleDelete()
  }
  if (!motorcycle1Id.value) {
    motorcycle1Id.value = _id
    motorcycle1PreviewUrl.value = imgUrl
  } else if (!motorcycle2Id.value) {
    motorcycle2Id.value = _id
    motorcycle2PreviewUrl.value = imgUrl
  }
}

function handleDelete(side?: 'left' | 'right') {
  if (side === 'left' || !side) {
    motorcycle1Id.value = ''
    motorcycle1.value = undefined
    motorcycle1PreviewUrl.value = ''
  }
  if (side === 'right' || !side) {
    motorcycle2Id.value = ''
    motorcycle2.value = undefined
    motorcycle2PreviewUrl.value = ''
  }
  showResultat.value = false
}

onMounted(() => {
  fetchCarrouselMotorcycles()
})

// Auto-trigger comparison the moment both motorcycles are picked
watch([motorcycle1Id, motorcycle2Id], ([id1, id2]) => {
  if (id1 && id2) {
    fetchMotocycles()
  } else {
    showResultat.value = false
  }
})

const resultTabs = computed(() => {
  const tabs: { label: string; key: 'stats' | 'images' | 'sons' | 'comments' }[] = []
  if (resultatNumber.length > 0) tabs.push({ label: 'Performances', key: 'stats' })
  if (resultatImg.length > 0) tabs.push({ label: 'Look', key: 'images' })
  if (resultatSound.length > 0) tabs.push({ label: 'Son', key: 'sons' })
  tabs.push({ label: 'Avis', key: 'comments' })
  return tabs
})

const activeResultTab = ref<'stats' | 'images' | 'sons' | 'comments'>('stats')
</script>

<template>
  <div>
    <HeaderInfo :scroll-to-element-id="'form'">
      <template #title>
        <h1 class="h1-mobile">
          Comparez. Choisissez. <br />
          <span class="text-[red]">Pilotez</span>
        </h1>
      </template>
      <template #subtitle>
        <p class="p-mobile">
          Comparez facilement les performances, prix et caractéristiques de vos
          motos préférées.
        </p>
      </template>
    </HeaderInfo>
    <div class="container-form flex flex-col gap-16 mt-24 justify-center">
      <div id="form" class="flex flex-col justify-center items-center gap-6">
        <div class="flex justify-center gap-8 max-lg:flex-col! max-lg:items-center">
          <MotocyclesForm v-model="motorcycle1Id" form-title="Moto 1" />
          <UIcon
            name="i-lucide-arrow-left-right"
            class="size-8 text-(--ui-primary) self-center max-lg:rotate-90"
            aria-hidden="true"
          />
          <MotocyclesForm v-model="motorcycle2Id" form-title="Moto 2" />
        </div>
        <p v-if="!motorcycle1Id || !motorcycle2Id" class="text-gray-500 text-sm italic">
          Sélectionnez deux motos pour lancer la comparaison.
        </p>
      </div>
      <Transition>
        <div v-if="showResultat" ref="resultat" class="scroll-mt-24">
          <nav class="flex flex-wrap gap-1 w-fit max-w-full mx-auto mb-12 p-1 bg-[var(--input-background)] rounded-full justify-center" role="tablist">
            <button
              v-for="tab in resultTabs"
              :key="tab.key"
              type="button"
              :class="[
                'px-6 py-2 bg-transparent border-none rounded-full cursor-pointer font-[\'Poppins\',sans-serif] text-base font-medium whitespace-nowrap transition-[background-color,color] duration-200 ease-[ease]',
                activeResultTab === tab.key
                  ? 'bg-[var(--ui-primary)] text-white font-semibold'
                  : 'text-gray-500 hover:text-[var(--text-color)]'
              ]"
              role="tab"
              :aria-selected="activeResultTab === tab.key"
              @click="activeResultTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </nav>

          <div v-show="activeResultTab === 'stats'" class="tab-panel">
            <div v-for="field in resultatNumber" :key="field.fieldName">
              <ResultatFieldNumber
                :field-name="field.fieldName"
                :first-value="field.firstValue"
                :second-value="field.secondValue"
              />
              <br />
            </div>
          </div>
          <div v-show="activeResultTab === 'images'" class="tab-panel">
            <div v-for="field in resultatImg" :key="field.fieldName">
              <ResultatFieldImg
                :field-name="field.fieldName"
                :first-value="field.firstValue"
                :second-value="field.secondValue"
              />
            </div>
          </div>
          <div v-show="activeResultTab === 'sons'" class="tab-panel">
            <div v-for="field in resultatSound" :key="field.fieldName">
              <ResultatFieldSound
                :field-name="field.fieldName"
                :first-value="field.firstValue"
                :second-value="field.secondValue"
              />
            </div>
          </div>
          <div v-show="activeResultTab === 'comments'" class="tab-panel">
            <div class="flex gap-8 items-start max-lg:flex-col">
              <div class="flex-1 min-w-0 flex flex-col gap-3">
                <h4 class="text-center mb-2">
                  {{ motorcycle1?.name ?? 'Moto 1' }}
                </h4>
                <template v-if="commentsMotorcycle1.length > 0">
                  <Comment
                    v-for="comment1 in commentsMotorcycle1"
                    :key="comment1._id"
                    :response="comment1"
                  />
                </template>
                <p v-else class="text-gray-500 italic text-center py-4">
                  Postez le premier commentaire !
                </p>
              </div>
              <div class="flex-1 min-w-0 flex flex-col gap-3">
                <h4 class="text-center mb-2">
                  {{ motorcycle2?.name ?? 'Moto 2' }}
                </h4>
                <template v-if="commentsMotorcycle2.length > 0">
                  <Comment
                    v-for="comment2 in commentsMotorcycle2"
                    :key="comment2._id"
                    :response="comment2"
                  />
                </template>
                <p v-else class="text-gray-500 italic text-center py-4">
                  Postez le premier commentaire !
                </p>
              </div>
            </div>
          </div>
          <div class="relative my-12 mx-[25%] w-1/2 min-h-[25rem] border border-solid border-gray-500 rounded-[20px] max-lg:mx-[12%]! max-lg:w-[76%]! max-lg:min-h-[auto]! max-md:my-6! max-md:mx-4! max-md:w-auto!">
            <div v-if="!isAuthenticated" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center max-lg:w-[90%]! max-lg:flex! max-lg:flex-col max-lg:items-center! max-lg:gap-4">
              <h3 class="h3-mobile w-[400px] max-lg:w-auto! max-lg:text-lg!">
                Rejoignez la communauté pour débattre et partager vos avis sur
                ces motos !
              </h3>
              <UButton
                color="neutral"
                class="rounded-4xl self-end text-xs p-2"
                size="xl"
                @click="open()"
                >Se connecter
              </UButton>
            </div>
            <div
              v-if="!messagePosted"
              class="flex flex-col justify-between h-full min-h-[25rem] p-8 max-lg:min-h-[auto]! max-lg:p-4!"
              :class="{ 'blur-[3px] pointer-events-none select-none': !isAuthenticated }"
            >
              <h4 class="text-center">
                Déjà roulé une de ces motos ?<br />
                Faite le savoir à la communauté !
              </h4>
              <div class="flex flex-col gap-4">
                <USelect
                  v-model="comment.motorcycleId"
                  size="lg"
                  class="w-50"
                  :items="optionMotorcycles"
                  :placeholder="motorcycle1?.name"
                />
                <UTextarea
                  v-model="comment.content"
                  size="xl"
                  placeholder="Un retour d'expérience, un conseil d'entretient ou encore une question"
                />
              </div>
              <UButton
                class="rounded-4xl self-end text-xs m-1"
                size="xl"
                @click="postComment"
                >Poster</UButton
              >
            </div>
            <div
              v-else
              class="flex flex-col justify-center h-fit min-h-[25rem] p-8 gap-8 max-lg:min-h-[auto]! max-lg:p-4!"
              :class="{ 'blur-[3px] pointer-events-none select-none': !isAuthenticated }"
            >
              <h4 class="text-center">Merci pour votre contribution !</h4>
              <p class="text-center">
                Votre commentaire a été posté avec succès. Il apparaîtra dans la
                section des commentaires correspondante.
              </p>
            </div>
          </div>
        </div>
      </Transition>
      <div class="caroussel-container flex flex-col gap-20 mx-[10%] max-md:mx-4! max-lg:mx-[6%]!">
        <div>
          <h3 class="h3-mobile">Pour la performance</h3>
          <CarrouselMotorcycles
            :items="carousselSportBikes"
            @selected="handleCaroussel"
          />
        </div>
        <div>
          <h3 class="h3-mobile">Pour le A2</h3>
          <CarrouselMotorcycles
            :items="carousselBeginnerBikes"
            @selected="handleCaroussel"
          />
        </div>
        <div>
          <h3 class="h3-mobile">Pour l'aventure</h3>
          <CarrouselMotorcycles
            :items="carousselAdventureBikes"
            @selected="handleCaroussel"
          />
        </div>
        <div class="dual-container sticky bottom-0 flex justify-center pointer-events-none">
          <DualMotorcycle
            :left-motorcycle-url="motorcycle1PreviewUrl"
            :right-motorcycle-url="motorcycle2PreviewUrl"
            :left-name="motorcycle1?.name"
            :right-name="motorcycle2?.name"
            @delete="handleDelete"
          />
        </div>
      </div>
      <br />
    </div>
  </div>
</template>

<style scoped>
/* Bare-element descendant rules: apply to all section headings */
.container-form h3 {
  text-align: center;
  margin: 1.5rem;
}

.caroussel-container h3 {
  text-align: left;
}

/* Animation on tab switch */
.tab-panel {
  animation: tab-fade 0.2s ease-out;
}

@keyframes tab-fade {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Container lets clicks pass through its empty zones; only the panel is interactive */
.dual-container > * {
  pointer-events: auto;
}

/* Transitions */
.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
