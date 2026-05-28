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
  // SportsBikes for Carrousel
  const sportBikesData = await $fetch<{ motorcycles: IMotorcycle[] }>(
    `${apiBase}motorcycles`,
    {
      params: {
        filter: JSON.stringify({
          category: 'sportsbike'
        }),
        project,
        limit
      }
    }
  )
  // Beginners Bikes for Carrousel
  const beginnerBikesData = await $fetch<{ motorcycles: IMotorcycle[] }>(
    `${apiBase}motorcycles`,
    {
      params: {
        filter: JSON.stringify({
          isAvailableA2: true
        }),
        project,
        limit
      }
    }
  )
  // Adventure Bikes for Carrousel
  const adventureBikesData = await $fetch<{ motorcycles: IMotorcycle[] }>(
    `${apiBase}motorcycles`,
    {
      params: {
        filter: JSON.stringify({
          category: 'adventure'
        }),
        project,
        limit
      }
    }
  )
  carousselSportBikes.value = sportBikesData.motorcycles
  carousselBeginnerBikes.value = beginnerBikesData.motorcycles
  carousselAdventureBikes.value = adventureBikesData.motorcycles
}

async function fetchMessages() {
  const post1 = motorcycle1.value?.post
  const post2 = motorcycle2.value?.post

  if (post1) {
    const data = await $fetch<{ messages: IMessage[] }>(
      `${apiBase}posts/${post1}/responses`,
      {
        params: {
          project:
            'content, user, createdAt, like, dislike,usersLikeId,usersDislikeId',
          deep: true,
          limit: 5
        }
      }
    )
    commentsMotorcycle1.value = data.messages
  }

  if (post2) {
    const data = await $fetch<{ messages: IMessage[] }>(
      `${apiBase}posts/${post2}/responses`,
      {
        params: {
          project:
            'content, user, createdAt, like, dislike,usersLikeId,usersDislikeId',
          deep: true,
          limit: 5
        }
      }
    )
    commentsMotorcycle2.value = data.messages
  }
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
</script>

<template>
  <div>
    <HeaderInfo :scroll-to-element-id="'form'">
      <template #title>
        <h1 class="h1-mobile">
          Comparez. Choisissez. <br />
          <span class="text-red">Pilotez</span>
        </h1>
      </template>
      <template #subtitle>
        <p class="p-mobile">
          Comparez facilement les performances, prix et caractéristiques de vos
          motos préférées.
        </p>
      </template>
    </HeaderInfo>
    <div class="container-form">
      <div id="form" class="form-button">
        <div class="form max-lg:flex-col! max-lg:items-center">
          <MotocyclesForm v-model="motorcycle1Id" form-title="Moto 1" />
          <MotocyclesForm v-model="motorcycle2Id" form-title="Moto 2" />
        </div>
        <UButton
          icon="i-lucide-arrow-left-right"
          class="w-fit rounded-4xl text-white"
          :disabled="!motorcycle1Id || !motorcycle2Id"
          @click="fetchMotocycles"
          >Comparer</UButton
        >
      </div>
      <Transition>
        <div v-if="showResultat" ref="resultat" class="resultat-section">
          <div v-if="resultatNumber.length > 0">
            <h3>Résultats</h3>
            <div v-for="field in resultatNumber" :key="field.fieldName">
              <ResultatFieldNumber
                :field-name="field.fieldName"
                :first-value="field.firstValue"
                :second-value="field.secondValue"
              />
              <br />
            </div>
          </div>
          <div v-if="resultatImg.length > 0">
            <h3>Images</h3>
            <div v-for="field in resultatImg" :key="field.fieldName">
              <ResultatFieldImg
                :field-name="field.fieldName"
                :first-value="field.firstValue"
                :second-value="field.secondValue"
              />
            </div>
          </div>
          <div v-if="resultatSound.length > 0">
            <h3>Sons</h3>
            <div v-for="field in resultatSound" :key="field.fieldName">
              <ResultatFieldSound
                :field-name="field.fieldName"
                :first-value="field.firstValue"
                :second-value="field.secondValue"
              />
            </div>
          </div>
          <div class="display-comment-container max-lg:flex-col!">
            <div class="left-display-comment max-lg:max-w-full!">
              <h4>Commentaires sur la {{ motorcycle1?.name }}</h4>
              <template v-if="commentsMotorcycle1.length > 0">
                <div
                  v-for="comment1 in commentsMotorcycle1"
                  :key="comment1._id"
                >
                  <Comment :response="comment1" />
                </div>
              </template>
              <p v-else>Postez le premier commentaire !</p>
            </div>
            <div class="right-display-comment max-lg:max-w-full!">
              <h4>Commentaires sur la {{ motorcycle2?.name }}</h4>
              <template v-if="commentsMotorcycle2.length > 0">
                <div
                  v-for="comment2 in commentsMotorcycle2"
                  :key="comment2._id"
                >
                  <Comment :response="comment2" />
                </div>
              </template>
              <p v-else>Postez le premier commentaire !</p>
            </div>
          </div>
          <div class="input-comment-box max-lg:m-[1.5rem_1rem]! max-lg:w-auto! max-lg:min-h-[auto]!">
            <div v-if="!isAuthenticated" class="need-connection max-lg:w-[90%]! max-lg:flex! max-lg:flex-col max-lg:items-center! max-lg:gap-4">
              <h3 class="h3-mobile max-lg:w-auto! max-lg:text-lg!">
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
              class="input-comment-container max-lg:min-h-[auto]! max-lg:p-4!"
              :class="{ blurred: !isAuthenticated }"
            >
              <h4>
                Déjà roulé une de ces motos ?<br />
                Faite le savoir à la communauté !
              </h4>
              <div class="comment-input">
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
              class="input-posted-container max-lg:min-h-[auto]! max-lg:p-4!"
              :class="{ blurred: !isAuthenticated }"
            >
              <h4>Merci pour votre contribution !</h4>
              <p>
                Votre commentaire a été posté avec succès. Il apparaîtra dans la
                section des commentaires correspondante.
              </p>
            </div>
          </div>
        </div>
      </Transition>
      <div class="caroussel-container max-lg:mx-4!">
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
        <div class="dual-container">
          <DualMotorcycle
            :left-motorcycle-url="motorcycle1PreviewUrl"
            :right-motorcycle-url="motorcycle2PreviewUrl"
            :left-name="motorcycle1?.name"
            :right-name="motorcycle2?.name"
            @compare="fetchMotocycles"
            @delete="handleDelete"
          />
        </div>
      </div>
      <br />
    </div>
  </div>
</template>

<style scoped>
/* Layout principal */
.container-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-top: 6rem;
  justify-content: center;
}

.container-form h3 {
  text-align: center;
  margin: 1.25rem;
}

/* Formulaire */
.form-button {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 3rem;
}

.form {
  display: flex;
  justify-content: center;
  gap: 2rem;
}

/* Résultats */
.resultat-section {
  scroll-margin-top: 6rem;
}

/* Carrousel */
.caroussel-container {
  display: flex;
  flex-direction: column;
  gap: 5rem;
  margin: 0 10%;
}

.caroussel-container h3 {
  text-align: left;
}

/* Commentaires Display */
.display-comment-container {
  display: flex;
  gap: 2rem;
  margin: 3rem 10%;
  justify-content: center;
}

.left-display-comment,
.right-display-comment {
  flex: 1;
  border: var(--border-thin) solid var(--color-gray-light);
  border-radius: var(--radius-lg);
  padding: 2rem;
  max-width: 50%;
  height: fit-content;
}

.left-display-comment h4,
.right-display-comment h4 {
  text-align: center;
  margin-bottom: 1.5rem;
}

.left-display-comment p,
.right-display-comment p {
  text-align: center;
}

/* Commentaires Input */
.input-comment-box {
  position: relative;
  margin: 3rem 25%;
  width: 50%;
  min-height: 25rem;
  border: var(--border-thin) solid var(--color-gray-mid);
  border-radius: var(--radius-lg);
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

.comment-input {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.blurred {
  filter: blur(3px);
  pointer-events: none;
  user-select: none;
}

.dual-container {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: center;
}

/* Utilitaires */
.text-red {
  color: red;
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
