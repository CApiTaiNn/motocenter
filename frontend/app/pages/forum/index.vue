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

// Toolbar search owns filters.searchBar; debounce so we don't refetch on every
// keystroke.
let searchTimer: ReturnType<typeof setTimeout> | undefined
const handleSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => getPosts(), 300)
}

// Client-side sort/filter of the already-fetched posts.
const SORT_TABS = [
  { key: 'recent', label: 'Récents' },
  { key: 'popular', label: 'Populaires' },
  { key: 'unanswered', label: 'Sans réponse' }
] as const
const sortBy = ref<(typeof SORT_TABS)[number]['key']>('recent')

const displayedPosts = computed(() => {
  let list = [...posts.value]
  if (sortBy.value === 'unanswered') {
    list = list.filter((p) => (p.responses?.length || 0) === 0)
  }
  if (sortBy.value === 'popular') {
    list.sort((a, b) => (b.views || 0) - (a.views || 0))
  } else {
    list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }
  return list
})

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
      <div class="flex min-w-0 flex-1 flex-col gap-4">
        <!-- Toolbar: search + new discussion -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <UInput
            v-model="filters.searchBar"
            icon="i-lucide-search"
            size="lg"
            placeholder="Rechercher une discussion, un modèle, un sujet…"
            class="flex-1 [&_input]:rounded-full"
            @update:model-value="handleSearch"
          >
            <template v-if="filters.searchBar?.length" #trailing>
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                icon="i-lucide-circle-x"
                aria-label="Effacer la recherche"
                class="cursor-pointer"
                @click="
                  filters.searchBar = '';
                  getPosts();
                "
              />
            </template>
          </UInput>
          <ForumNewDiscussionButton size="lg" @new-post="getPosts()" />
        </div>

        <!-- Sort tabs + result count -->
        <div class="flex items-center justify-between gap-3 border-b border-solid border-(--border-gray)">
          <div class="flex gap-1">
            <button
              v-for="tab in SORT_TABS"
              :key="tab.key"
              type="button"
              class="-mb-px cursor-pointer border-b-2 border-transparent px-3 py-2 text-sm font-semibold transition-colors"
              :class="
                sortBy === tab.key
                  ? 'border-(--ui-primary) text-(--text-color)'
                  : 'text-(--label-text) hover:text-(--text-color)'
              "
              @click="sortBy = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>
          <span v-if="!loading" class="text-sm text-(--label-text)">
            {{ displayedPosts.length }}
            discussion{{ displayedPosts.length > 1 ? 's' : '' }}
          </span>
        </div>

        <!-- Thread list -->
        <div v-if="loading" class="flex flex-col gap-4">
          <USkeleton v-for="n in 3" :key="n" class="h-28 w-full rounded-xl" />
        </div>
        <UCard v-else-if="displayedPosts.length === 0">
          <div class="flex flex-col items-center gap-4 py-8 text-center">
            <UIcon
              name="i-lucide-message-square-plus"
              class="size-16 text-gray-400"
            />
            <div class="flex flex-col gap-1">
              <h4>Aucun post pour le moment</h4>
              <p class="text-sm text-gray-400">
                Soyez le premier à lancer la discussion.
              </p>
            </div>
          </div>
        </UCard>
        <template v-else>
          <ForumPost
            v-for="post in displayedPosts"
            :key="post._id"
            :post="post"
            :loading
            @post-change="getPosts()"
          />
        </template>
      </div>
      <div class="hidden lg:sticky lg:top-[70px] lg:right-0 lg:flex lg:w-[260px] lg:flex-col lg:gap-6">
        <UCard class="border-[0.5px] border-(--border-gray) text-center">
          <div class="flex flex-col items-center gap-3 py-2">
            <h3>Une question ?</h3>
            <p class="text-sm text-(--label-text)">
              Lancez une discussion, la communauté vous répond.
            </p>
            <ForumNewDiscussionButton
              label="Lancer une discussion"
              block
              @new-post="getPosts()"
            />
          </div>
        </UCard>
        <ForumMyFavoritesPost />
      </div>
    </div>
  </div>
</template>
