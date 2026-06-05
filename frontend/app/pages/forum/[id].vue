<script setup lang="ts">
import Comment from '~/components/forum/Comment.vue'
import HeaderInfo from '~/components/global/HeaderInfo.vue'
import { useAuth } from '~/composables/useAuth'
import { useConnexionModal } from '~/composables/useConnexionModal'
import type { IMessage } from '~/types/messages'
import type { IPost } from '~/types/post'
import { POST_CATEGORY_META } from '~/utils/postCategory'

const route = useRoute()

const post = ref<IPost>()
const responses = ref<IMessage[]>([])
const apiBase = useRuntimeConfig().public.apiBase
const { user } = useAuth()
const { open } = useConnexionModal()
const newReponseOfPost = ref('')
const toast = useToast()
const isLoaded = ref(false)
const isSolidStar = computed(
  () => user.value && post.value?.userFavoritePost?.includes(user.value._id)
)

const getPost = async () => {
  const data = await $fetch<{ posts: IPost[] }>(`${apiBase}posts`, {
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
      credentials: 'include',
      body: {
        content: newReponseOfPost.value,
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
        credentials: 'include',
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
  try {
    await Promise.all([getPost(), getResponsesOfPost()])
  } catch {
    toast.add({
      title: 'Erreur',
      description: "Le post n'a pas pu être chargé.",
      color: 'error'
    })
  } finally {
    isLoaded.value = true
    scrollToMap('post')
  }
})
</script>

<template>
  <div>
    <HeaderInfo :scroll-to-element-id="'post'">
      <template #title>
        <h1>
          Bienvenue sur le <br />
          <span style="color: red">Forum</span>
        </h1>
      </template>
      <template #subtitle>
        <p>Échanger librement sur votre sujet favori en lien avec la moto.</p>
      </template>
    </HeaderInfo>
    <div id="post" class="mx-20 my-8 flex flex-row items-start gap-12 max-lg:m-[0.5em]! max-lg:gap-0!">
      <div class="shrink-0">
        <ForumPanel />
      </div>
      <USkeleton v-if="!isLoaded" class="size-20 min-w-0 flex-1 rounded-full" />
      <div v-else class="min-w-0 flex-1">
        <div class="my-4 flex flex-row items-center gap-3">
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
          <div class="mt-6 mb-4 flex flex-wrap items-center gap-[0.75rem_1rem]">
            <UBadge size="lg">{{ post?.brand.name }}</UBadge>
            <UBadge size="lg" variant="subtle">{{
              post?.category ? POST_CATEGORY_META[post.category]?.label : ''
            }}</UBadge>
            <span class="text-xl leading-none text-gray-300" aria-hidden="true">·</span>
            <div class="flex items-center gap-1 text-sm text-gray-500">
              <UIcon name="i-lucide-messages-square" class="size-5" />
              <span>{{ responses.length || 0 }} {{ responses.length > 1 ? 'réponses' : 'réponse' }}</span>
            </div>
            <div class="flex items-center gap-1 text-sm text-gray-500">
              <UIcon name="i-lucide-eye" class="size-5" />
              <span>{{ post?.views }} vues</span>
            </div>
            <span class="text-xl leading-none text-gray-300" aria-hidden="true">·</span>
            <span class="text-sm text-gray-500">Par {{ post?.user.pseudo }}, {{ formatTimeAgo(post?.createdAt) }}</span>
          </div>
          <img
            :src="`${post?.image}`"
            :alt="`Image du post ${post?.title} par ${post?.user.pseudo}`"
            :title="`Image du post ${post?.title} par ${post?.user.pseudo}`"
            class="mb-4 w-full md:w-5/6 lg:w-3/4"
          />
        </div>
        <h4 class="mb-4">{{ post?.content }}</h4>
        <div class="flex flex-col items-start gap-2">
          <UFormField label="Ecrire un commentaire" required>
            <UTextarea v-model="newReponseOfPost" />
          </UFormField>
          <UButton
            :disabled="newReponseOfPost === ''"
            size="sm"
            class="w-3/4 md:w-1/2 lg:w-1/4"
            @click="handleAddComment"
          >
            Ajouter mon commentaire</UButton
          >
        </div>
        <p v-if="responses.length === 0">
          Aucun commentaire à ce post, ajouter le premier
        </p>
        <div v-else class="mt-6 mb-4 flex w-5/6 flex-col gap-2">
          <div v-for="response in responses" :key="response._id">
            <Comment :response="response" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
