<script setup lang="ts">
import ForumMyFavoritesPost from '~/components/forum/ForumMyFavoritesPost.vue'
import HeaderInfo from '~/components/global/HeaderInfo.vue'
import type { IPost } from '~/types/post'
import type { IMessage } from '~/types/messages'

const posts = ref<IPost[]>([])
const loading = ref(true)
const filters = ref({
  brandIds: [] as string[],
  categoryIds: [] as string[],
  onlyMyPost: true,
  searchBar: ''
})

const filter = computed(() => {
  const conditions = []

  if (filters.value.brandIds.length) {
    conditions.push({
      // brand is an embedded snapshot; filter on its source id
      'brand._id': { $in: filters.value.brandIds }
    })
  }

  if (filters.value.categoryIds.length) {
    conditions.push({
      category: { $in: filters.value.categoryIds }
    })
  }

  if (filters.value.searchBar && filters.value.searchBar.trim().length !== 0) {
    conditions.push({
      title: { $regex: filters.value.searchBar, $options: 'i' }
    })
  }

  if (!conditions.length) return undefined

  // Combine brand/category/search with AND so each filter narrows the results
  // (an $or here returned the union — selecting a brand AND typing a search
  // widened instead of restricting).
  return JSON.stringify({
    $and: conditions
  })
})

const apiBase = useRuntimeConfig().public.apiBase

const getPosts = async () => {
  try {
    const res = await $fetch<{ posts: IPost[] }>(`${apiBase}posts`, {
      params: {
        deep: true,
        project: 'content,title,id,createdAt,views,image',
        filter: filter.value
      }
    })
    posts.value = await Promise.all(
      res.posts.map(async (post: IPost) => {
        post.responses = await getResponseOfPost(post._id)
        return post
      })
    )
  } catch (error) {
    // Surface nothing to the user here, but never leave the page stuck in the
    // loading state on a failed fetch.
    console.error('Failed to load posts', error)
    posts.value = []
  } finally {
    loading.value = false
  }
}

const getResponseOfPost = async (postId: string) => {
  const data = await $fetch<{ messages: IMessage[] }>(
    `${apiBase}posts/${postId}/responses`
  )
  return data.messages
}

const handleFilter = async (updateFilter: any) => {
  filters.value = {
    ...filters.value,
    ...updateFilter
  }
  await getPosts()
}

onMounted(async () => {
  await Promise.all([getPosts()])
  loading.value = false
})
</script>

<template>
  <div>
    <HeaderInfo :scroll-to-element-id="'forum'">
      <template #title>
        <h1>
          Bienvenue sur le <br />
          <span class="text-(--ui-primary)">Forum</span>
        </h1>
      </template>
      <template #subtitle>
        <p>
          Échanger librement sur votre sujet favori en lien avec la moto.
        </p>
      </template>
    </HeaderInfo>
    <div id="forum" class="m-[2em] flex flex-row items-start gap-[0.5em] md:gap-[1.25em] lg:gap-[2em]">
      <div class="sticky top-[70px]">
        <ForumPanel :loading :active-filter="filters" @filters="handleFilter" />
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-6">
        <USkeleton v-if="loading" class="size-12 rounded-full" />
        <UCard v-if="loading === false && posts.length === 0">
          <div class="flex flex-col items-center gap-4 py-8 text-center">
            <UIcon
              name="i-lucide-message-square-plus"
              class="size-16 text-(--color-gray-mid)"
            />
            <div class="flex flex-col gap-1">
              <h4>Aucun post pour le moment</h4>
              <p class="text-sm text-(--color-gray-mid)">
                Soyez le premier à lancer la discussion.
              </p>
            </div>
          </div>
        </UCard>
        <div v-for="post in posts" :key="post._id">
          <ForumPost
            :post="post"
            class="cursor-pointer"
            :loading
            @post-change="getPosts()"
          />
        </div>
      </div>
      <div class="hidden lg:sticky lg:top-[70px] lg:right-0 lg:flex lg:w-[300px] lg:flex-col lg:gap-6">
        <ForumMyPosts @new-post="getPosts()" />
        <ForumMyFavoritesPost />
      </div>
    </div>
  </div>
</template>
