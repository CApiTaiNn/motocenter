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
    const response = await $fetch<{ posts: IPost[] }>(`${apiBase}posts`, {
      params: {
        project: 'title,user',
        deep: true
      }
    })

    postOfUser.value = response.posts.filter(
      (post) => post.user._id === user.value?._id
    )
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
        <div class="header">
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
            class="cursor-pointer border-bottom"
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

<style scoped>
.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.5em;
}

.cursor-pointer {
  cursor: pointer;
}

.border-bottom {
  margin-bottom: 1em;
  border-bottom: 1px solid var(--border-gray);
}
</style>
