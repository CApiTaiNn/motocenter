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
    class="w-full max-w-275 border-[0.5px] border-l-4 border-(--border-gray) border-l-(--category-accent)"
    :style="{ '--category-accent': categoryAccent(props.post.category) }"
    @click="handleOpenAPost(post._id)"
  >
    <div class="flex w-full items-start gap-6 px-6 py-3">
      <USkeleton v-if="props.loading" class="size-12 rounded-full" />
      <UAvatar
        v-else
        :src="props.post.user.image"
        size="3xl"
        loading="lazy"
      />
      <div class="flex flex-1 flex-col justify-center">
        <div class="flex w-full flex-row items-start justify-between">
          <h4>{{ props.post.title }}</h4>
          <ForumEditAPost
            :post="post"
            :is-new-post="false"
            @edited-post="handlePostChange"
          />
        </div>
        <div class="mt-2 flex w-full items-center justify-between max-lg:flex-wrap">
          <div>
            <div class="my-4 flex flex-row items-center gap-6">
              <UBadge size="lg">{{
                props.post.brand.name
              }}</UBadge>
              <UBadge size="lg">{{
                POST_CATEGORY_META[props.post.category]?.label
              }}</UBadge>
            </div>
            <p>
              Par {{ props.post.user.pseudo }},
              {{ formatTimeAgo(props.post.createdAt) }}
            </p>
          </div>
          <div class="flex max-lg:flex-row max-lg:gap-2 lg:flex-col lg:items-start lg:justify-end">
            <div class="mt-4 flex items-center justify-start gap-1">
              <UIcon class="size-7" name="i-lucide-messages-square" />
              <div class="flex flex-row">
                <p>{{ props.post.responses.length || 0 }}&nbsp;</p>
                <p class="max-lg:hidden">
                  {{
                    props.post.responses.length > 1 ? ' réponses' : ' réponse'
                  }}
                </p>
              </div>
            </div>
            <div class="mt-4 flex items-center justify-start gap-1">
              <UIcon class="size-7" name="i-lucide-eye" />
              <div class="flex flex-row">
                <p>{{ props.post.views }}&nbsp;</p>
                <p class="max-lg:hidden">
                  {{ props.post.views > 1 ? 'vues' : ' vue' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
