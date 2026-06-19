<script setup lang="ts">
import type { IPost } from '~/types/post'
import { POST_CATEGORY_META } from '~/utils/postCategory'

const props = defineProps<{
  post: IPost
  loading: boolean
}>()

const emit = defineEmits(['post-change'])

const apiBase = useRuntimeConfig().public.apiBase

const addViewInAPost = async (id: string) => {
  await $fetch(`${apiBase}posts/add-view`, {
    method: 'POST',
    params: {
      filter: JSON.stringify({ id: id })
    }
  })
}

const handleOpenAPost = async (id: string) => {
  await addViewInAPost(id)
  navigateTo(`/forum/${id}`)
}

const handlePostChange = () => {
  emit('post-change')
}
</script>
<template>
  <UCard
    class="group w-full cursor-pointer border-[0.5px] border-l-4 border-(--border-gray) border-l-(--ui-primary) transition-colors hover:border-(--ui-primary)/50"
    :ui="{ body: 'p-4 sm:p-5' }"
    @click="handleOpenAPost(post._id)"
  >
    <div class="flex w-full items-start gap-4">
      <USkeleton v-if="props.loading" class="size-12 shrink-0 rounded-full" />
      <UAvatar
        v-else
        :src="props.post.user.image"
        :alt="props.post.user.pseudo"
        size="xl"
        loading="lazy"
        class="shrink-0"
      />
      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <!-- tags: colored category badge + brand -->
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full border border-(--ui-primary)/35 bg-(--ui-primary)/10 px-2.5 py-0.5 text-xs font-medium tracking-wide text-(--ui-primary) uppercase"
              >
                {{ POST_CATEGORY_META[props.post.category]?.label }}
              </span>
              <UBadge color="neutral" variant="subtle" size="sm">
                {{ props.post.brand.name }}
              </UBadge>
            </div>
            <p class="mt-1.5 line-clamp-2 text-lg/snug font-semibold transition-colors group-hover:text-(--ui-primary)">
              {{ props.post.title }}
            </p>
          </div>
          <ForumEditAPost
            :post="post"
            :is-new-post="false"
            @edited-post="handlePostChange"
          />
        </div>
        <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-(--label-text)">
          <span>
            Par
            <b class="font-medium text-(--text-color)">{{ props.post.user.pseudo }}</b>
            · {{ formatTimeAgo(props.post.createdAt) }}
          </span>
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1.5">
              <UIcon class="size-4" name="i-lucide-messages-square" />
              {{ props.post.responses.length || 0 }}
              <span class="max-sm:hidden">{{ props.post.responses.length > 1 ? 'réponses' : 'réponse' }}</span>
            </span>
            <span class="flex items-center gap-1.5">
              <UIcon class="size-4" name="i-lucide-eye" />
              {{ props.post.views }}
              <span class="max-sm:hidden">{{ props.post.views > 1 ? 'vues' : 'vue' }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
