<script setup lang="ts">
import type { IPost } from '~/types/post'

const apiBase = useRuntimeConfig().public.apiBase
const { user } = useAuth()

const myFavoritesPosts = ref<IPost[]>([])
const toast = useToast()

const getFavoritesPostsOfUser = async () => {
  try {
    const response = await $fetch<{ posts: IPost[] }>(`${apiBase}posts`, {
      params: {
        project:
          'image,content,title,createdAt,views,userFavoritePost,brand,user,brand,category',
        deep: true
      }
    })

    const userId = user.value?._id
    if (userId) {
      myFavoritesPosts.value = response.posts.filter((post) =>
        post.userFavoritePost?.includes(userId)
      )
    }
  } catch {
    toast.add({
      title: 'Erreur',
      description: "Les favoris n'ont pas pu être chargés.",
      color: 'error'
    })
  }
}

watch(user, async (newUser) => {
  if (newUser?._id) {
    await getFavoritesPostsOfUser()
  } else {
    myFavoritesPosts.value = []
  }
}, { immediate: true })
</script>

<template>
  <div>
    <UCard variant="outline" class="w-full border-[0.5px] border-(--border-gray)">
      <template #header>
        <h3>Mes favoris</h3>
      </template>
      <template #default>
        <div v-if="myFavoritesPosts.length">
          <div
            v-for="post in myFavoritesPosts"
            :key="post._id"
            class="cursor-pointer mb-4 border-b border-solid border-[var(--border-gray)]"
            @click="navigateTo(`/forum/${post._id}`)"
          >
            {{ post.title }}
          </div>
        </div>
        <p v-else>Aucun post en favori</p>
      </template>
    </UCard>
  </div>
</template>
