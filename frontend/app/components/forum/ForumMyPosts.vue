<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
import { useConnexionModal } from '~/composables/useConnexionModal'
import type { IPost } from '~/types/post'

const { isAuthenticated, user } = useAuth()
const { open } = useConnexionModal()
const emits = defineEmits(['new-post'])
const openAddPost = ref(false)
const apiBase = useRuntimeConfig().public.apiBase
const postOfUser = ref<IPost[]>([])

const getMyPost = async () => {
  if (user.value) {
    // Filter server-side by author instead of downloading every post and
    // filtering on the client.
    const response = await $fetch<{ posts: IPost[] }>(`${apiBase}posts`, {
      params: {
        project: 'title,user',
        deep: true,
        filter: JSON.stringify({ user: user.value._id })
      }
    })

    postOfUser.value = response.posts
  }
}

const handleAddPost = () => {
  open()
  if (isAuthenticated.value) {
    openAddPost.value = true
  }
}

const handleHaveANewPost = async () => {
  await getMyPost()
  emits('new-post')
}

watch(
  user,
  async (newUser) => {
    if (newUser?._id) {
      await getMyPost()
    } else {
      postOfUser.value = []
    }
  },
  { immediate: true }
)
</script>

<template>
  <div>
    <UCard
      variant="outline"
      class="w-full border-[0.5px] border-(--border-gray)"
    >
      <template #header>
        <div class="flex flex-row items-center justify-between gap-2">
          <h3>Mes posts</h3>
          <UButton
            v-if="!isAuthenticated"
            icon="i-lucide-plus"
            size="sm"
            color="primary"
            variant="solid"
            @click="handleAddPost"
          />
          <LazyForumModalAddPost
            v-else
            v-model:open="openAddPost"
            :is-new-post="true"
            @added-post="handleHaveANewPost"
          />
        </div>
      </template>
      <template #default>
        <div v-if="postOfUser.length">
          <div
            v-for="post in postOfUser"
            :key="post._id"
            class="mb-4 cursor-pointer border-b border-solid border-(--border-gray)"
            @click="navigateTo(`/forum/${post._id}`)"
          >
            {{ post.title }}
          </div>
        </div>
        <p v-else>Aucun post ajouté, vous pouvez ajouter le premier</p>
      </template>
    </UCard>
  </div>
</template>
