<script setup lang="ts">
import ForumMyFavoritesPost from '~/components/forum/ForumMyFavoritesPost.vue'
import HeaderInfo from '~/components/global/HeaderInfo.vue'
import type { IPost } from '~/types/post'

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
      brand: { $in: filters.value.brandIds }
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

  return JSON.stringify({
    $or: conditions
  })
})

const getPosts = async () => {
  const res = await $fetch<{ posts: IPost[] }>(
    `${useRuntimeConfig().public.apiBase}posts`,
    {
      params: {
        deep: true,
        project: 'content,title,id,createdAt,views,image',
        filter: filter.value
      }
    }
  )
  posts.value = await Promise.all(
    res.posts.map(async (post: IPost) => {
      post.responses = await getResponseOfPost(post._id)
      return post
    })
  )
}

const getResponseOfPost = async (postId: string) => {
  const res = await fetch(
    `${useRuntimeConfig().public.apiBase}posts/${postId}/responses`
  )
  const data = await res.json()
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
        <h1 class="h1-mobile">
          Bienvenue sur le <br />
          <span style="color: red">Forum</span>
        </h1>
      </template>
      <template #subtitle>
        <p class="p-mobile">
          Échanger librement sur votre sujet favori en lien avec la moto.
        </p>
      </template>
    </HeaderInfo>
    <div id="forum" class="forum-filters flex flex-row items-start m-[2em] gap-[0.5em] md:gap-[1.25em] lg:gap-[2em]">
      <div class="sticky top-17.5">
        <ForumPanel :loading :active-filter="filters" @filters="handleFilter" />
      </div>
      <div class="flex-1 min-w-0 flex flex-col gap-6">
        <USkeleton v-if="loading" class="size-12 rounded-full" />
        <UCard
          v-if="loading === false && posts.length === 0"
          class="empty-state"
        >
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
      <div class="panel hidden lg:flex lg:flex-col lg:gap-6 lg:w-75 lg:sticky lg:top-17.5 lg:right-0">
        <ForumMyPosts @new-post="getPosts()" />
        <ForumMyFavoritesPost />
      </div>
    </div>
  </div>
</template>
