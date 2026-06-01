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
    <div id="post" class="post-filters max-lg:m-[0.5em]! max-lg:gap-0!">
      <div>
        <ForumPanel />
      </div>
      <USkeleton v-if="isLoading === false" class="size-20 rounded-full" />
      <div v-else>
        <div class="icon-and-text title-mobile-version title-row">
          <UAvatar
            :src="post?.user.image"
            size="3xl"
            loading="lazy"
            class="mr-2"
          />
          <h2 class="flex-1">{{ post?.title }}</h2>
          <UButton
            :icon="isSolidStar ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
            color="neutral"
            variant="ghost"
            size="xl"
            :aria-label="isSolidStar ? 'Retirer des favoris' : 'Ajouter aux favoris'"
            class="cursor-pointer text-(--ui-primary)"
            @click="handleAddFavorite"
          />
        </div>
        <div>
          <div class="meta-bar">
            <UBadge size="lg">{{ post?.brand.name }}</UBadge>
            <UBadge size="lg" variant="subtle">{{ post?.category.name }}</UBadge>
            <span class="meta-dot" aria-hidden="true">·</span>
            <div class="meta-item">
              <UIcon name="i-lucide-messages-square" class="size-5" />
              <span>{{ responses.length || 0 }} {{ responses.length > 1 ? 'réponses' : 'réponse' }}</span>
            </div>
            <div class="meta-item">
              <UIcon name="i-lucide-eye" class="size-5" />
              <span>{{ post?.views }} vues</span>
            </div>
            <span class="meta-dot" aria-hidden="true">·</span>
            <span class="meta-author">Par {{ post?.user.pseudo }}, {{ formatTimeAgo(post?.createdAt) }}</span>
          </div>
          <img
            :src="`${post?.image}`"
            :alt="`Image du post ${post?.title} par ${post?.user.pseudo}`"
            :title="`Image du post ${post?.title} par ${post?.user.pseudo}`"
            class="img mb-4 w-full md:w-5/6 lg:w-3/4"
          />
        </div>
        <h4 class="mb-4">{{ post?.content }}</h4>
        <div class="add-comment">
          <UFormField label="Ecrire un commentaire" required>
            <UTextarea v-model="newReponseOfPost" />
          </UFormField>
          <UButton
            :disabled="newReponseOfPost === ''"
            size="sm"
            class="button-comment w-3/4 md:w-1/2 lg:w-1/4"
            @click="handleAddComment"
          >
            Ajouter mon commentaire</UButton
          >
        </div>
        <p v-if="responses.length === 0">
          Aucun commentaire à ce post, ajouter le premier
        </p>
        <div v-else class="mb-4 w-5/6 comments">
          <div v-for="response in responses" :key="response._id">
            <Comment :response="response" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.put-in-favorite {
  display: flex;
  flex-direction: row;
  gap: var(--space-xs);
  align-items: center;
}

.comments {
  margin-top: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.icon-and-text {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.title-row {
  gap: var(--space-sm);
  margin: var(--space-md) 0;
}

.meta-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
  margin: var(--space-lg) 0 var(--space-md);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  color: var(--color-gray-mid);
  font-size: 0.95rem;
}

.meta-author {
  color: var(--color-gray-mid);
  font-size: 0.95rem;
}

.meta-dot {
  color: var(--color-gray-light);
  font-size: 1.25rem;
  line-height: 1;
}

.post-filters {
  display: flex;
  flex-direction: row;
  align-items: start;
  gap: var(--space-2xl);
  margin: var(--space-xl) var(--space-4xl);
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
  gap: var(--space-xs);
  align-items: flex-start;
}
</style>
