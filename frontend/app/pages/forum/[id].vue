<script setup lang="ts">
import Comment from '~/components/forum/Comment.vue'
import HeaderInfo from '~/components/global/HeaderInfo.vue'
import { useAuth } from '~/composables/useAuth'
import { useConnexionModal } from '~/composables/useConnexionModal'
import type { IMessage } from '~/types/messages'
import type { IPost } from '~/types/post'

const route = useRoute()

const post = ref<IPost>()
const responses = ref<IMessage[]>([])
const apiBase = useRuntimeConfig().public.apiBase
const { user } = useAuth()
const { open } = useConnexionModal()
const newReponseOfPost = ref('')
const toast = useToast()
const isLoading = ref(false)
const isSolidStar = computed(
  () => user.value && post.value?.userFavoritePost?.includes(user.value._id)
)

const getPost = async () => {
  const data = await $fetch<{ data: IPost }>(`${apiBase}posts`, {
    params: {
      filter: JSON.stringify({ _id: route.params.id }),
      project: 'image,content,title,createdAt,views,userFavoritePost',
      deep: true
    }
  })

  post.value = data.posts[0]
}

const getResponsesOfPost = async () => {
  const res = await $fetch<{ messages: IMessage[] }>(
    `${apiBase}posts/${route.params.id}/responses`,
    {
      params: {
        project:
          'like,dislike,user,content,description,createdAt,usersLikeId,usersDislikeId',
        deep: true
      }
    }
  )
  responses.value = res.messages
}

const handleAddComment = async () => {
  if (!user.value) {
    open()
  } else {
    const newMessage = await $fetch.raw(`${apiBase}messages`, {
      method: 'POST',
      body: {
        content: newReponseOfPost.value,
        user: user.value._id,
        reference: route.params.id,
        referenceModel: 'Post'
      }
    })

    if (newMessage.ok) {
      toast.add({
        title: 'Succès',
        description: 'Votre commentaire a été ajouté.',
        color: 'success'
      })
      newReponseOfPost.value = ''
      getResponsesOfPost()
    } else {
      toast.add({
        title: 'Erreur',
        description: "Votre commentaire n'a pas pu être ajouté.",
        color: 'error'
      })
    }
  }
}

const handleAddFavorite = async () => {
  if (!user.value) {
    open()
  } else {
    const response = await $fetch<{ isAdded: boolean }>(
      `${apiBase}posts/add-favorite`,
      {
        method: 'POST',
        body: {
          userId: user.value._id
        },
        params: {
          filter: JSON.stringify({ _id: post.value?._id })
        }
      }
    )

    if (response.isAdded === true) {
      toast.add({
        title: 'Succès',
        description: 'Votre post a été ajouté aux favoris.',
        color: 'success'
      })
      await getPost()
    } else if (response.isAdded === false) {
      toast.add({
        title: 'Succès',
        description: 'Votre post a été supprimé de vos favoris.',
        color: 'success'
      })
      await getPost()
    } else {
      toast.add({
        title: 'Erreur',
        description: "Votre post n'a pas été ajouté aux favoris.",
        color: 'error'
      })
    }
  }
}

onMounted(async () => {
  await Promise.all([getPost(), getResponsesOfPost()])
  isLoading.value = true
  scrollToMap('post')
})
</script>

<template>
  <div>
    <HeaderInfo :scroll-to-element-id="'post'">
      <template #title>
        <h1 class="h1-mobile">
          Bienvenue sur le <br />
          <span style="color: red">Forum</span>
        </h1>
      </template>
      <template #subtitle>
        <p>Échanger librement sur votre sujet favori en lien avec la moto.</p>
      </template>
    </HeaderInfo>
    <div id="post" class="post-filters">
      <div>
        <ForumPanel />
      </div>
      <USkeleton v-if="isLoading === false" class="size-20 rounded-full" />
      <div v-else>
        <div class="icon-and-text title-mobile-version">
          <UAvatar
            :src="post?.user.image"
            size="3xl"
            loading="lazy"
            class="margin-2"
          />
          <h2>{{ post?.title }}</h2>
        </div>
        <div>
          <div class="grid margin-1_5">
            <div>
              <UBadge size="xl" class="margin-2">{{ post?.brand.name }}</UBadge>
              <UBadge size="xl">{{ post?.category.name }}</UBadge>
            </div>
            <div class="icon-and-text right">
              <UIcon class="size-7 margin-2" name="i-lucide-messages-square" />
              <p>
                {{ responses.length || 0 }}
                {{ responses.length > 1 ? 'réponses' : 'réponse' }}
              </p>
            </div>
            <p>
              Par {{ post?.user.pseudo }},
              {{ formatTimeAgo(post?.createdAt) }}
            </p>
            <div class="icon-and-text right">
              <UIcon class="size-7 margin-2" name="i-lucide-eye" />
              <p>{{ post?.views }} vues</p>
            </div>
          </div>
          <div
            class="icon-and-text margin-bottom-1 margin-top-0_5 put-in-favorite"
            @click="handleAddFavorite"
          >
            <UIcon
              :name="
                isSolidStar ? 'i-heroicons-star-solid' : 'i-heroicons-star'
              "
              class="size-7"
            />
            <p>Mettre ce post en favori</p>
          </div>
          <img
            :src="`${post?.image}`"
            :alt="`Image du post ${post?.title} par ${post?.user.pseudo}`"
            :title="`Image du post ${post?.title} par ${post?.user.pseudo}`"
            class="img margin-1_5 margin-bottom-1"
          />
        </div>
        <h4 class="margin-bottom-1">{{ post?.content }}</h4>
        <div class="add-comment">
          <UFormField label="Ecrire un commentaire" required>
            <UTextarea v-model="newReponseOfPost" />
          </UFormField>
          <UButton
            :disabled="newReponseOfPost === ''"
            size="sm"
            class="button-comment"
            @click="handleAddComment"
          >
            Ajouter mon commentaire</UButton
          >
        </div>
        <p v-if="responses.length === 0">
          Aucun commentaire à ce post, ajouter le premier
        </p>
        <div v-else class="margin-bottom-1 w-5/6 comments">
          <div v-for="response in responses" :key="response._id">
            <Comment :response="response" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/** Style version mobile */
@media (max-width: 1024px) {
  #post {
    margin: 0.5em;
    gap: 0;
  }

  .title-mobile-version {
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .img {
    width: 100%;
  }

  .button-comment {
    width: 75%;
  }
}

/** Style version PC */
@media (min-width: 1024px) {
  .img {
    width: 75%;
  }

  .button-comment {
    width: 25%;
  }
}

.margin-2 {
  margin-right: 0.5em;
}

.put-in-favorite {
  display: flex;
  flex-direction: row;
  gap: 0.5em;
  align-items: center;
}

.comments {
  margin-top: 1.5em;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.icon-and-text {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.post-filters {
  display: flex;
  flex-direction: row;
  align-items: start;
  gap: 3rem;
  margin: 2rem 5rem;
}

.post-filters > div:first-child {
  flex-shrink: 0;
}

.post-filters > div:nth-child(2) {
  flex: 1;
  min-width: 0;
}

.flex.row.end {
  display: flex;
  flex-direction: row;
  align-items: end;
  justify-content: space-between;
  margin-right: 20em;
}

w .margin-1_5 {
  margin-top: 1.5em;
}

.margin-top-0_5 {
  margin-top: 0.5em;
}

.margin-bottom-1 {
  margin-bottom: 1em;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: 0.5em;
}

.right {
  justify-self: end;
}

.add-comment {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  align-items: flex-start;
}
</style>
