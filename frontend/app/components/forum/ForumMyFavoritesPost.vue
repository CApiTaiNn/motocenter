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

    if (user.value?._id) {
      myFavoritesPosts.value = response.posts.filter((post) =>
        post.userFavoritePost?.includes(user.value._id)
      )
    }
  } catch {
    toast.add({
      title: 'Erreur',
      description: "Les favoris n'ont pas été chargé.",
      color: 'success'
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
            class="cursor-pointer border-bottom"
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

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.border-bottom {
  margin-bottom: var(--space-md);
  border-bottom: var(--border-thin) solid var(--border-gray);
}
</style>
