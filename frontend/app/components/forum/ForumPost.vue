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
    class="w-full max-w-275 border-[0.5px] border-(--border-gray) category-accent"
    :style="{ '--category-accent': categoryAccent(props.post.category) }"
    @click="handleOpenAPost(post._id)"
  >
    <div class="postCard w-full flex items-start gap-6 py-3 px-6">
      <USkeleton v-if="props.loading" class="size-12 rounded-full" />
      <UAvatar
        v-else
        :src="props.post.user.image"
        size="3xl"
        loading="lazy"
        class="margin-2"
      />
      <div class="main flex-1 flex flex-col justify-center">
        <div class="top flex flex-row items-start justify-between w-full">
          <h4>{{ props.post.title }}</h4>
          <ForumEditAPost
            :post="post"
            :is-new-post="false"
            @edited-post="handlePostChange"
          />
        </div>
        <div class="flex justify-between items-center w-full mt-2 max-lg:flex-wrap">
          <div>
            <div class="flex flex-row items-center gap-6 my-4">
              <UBadge size="lg" class="margin-2">{{
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
          <div class="statsContainer flex max-lg:flex-row max-lg:gap-2 lg:flex-col lg:items-start lg:justify-end">
            <div class="flex items-center justify-start gap-1 mt-4">
              <UIcon class="size-7 margin-2" name="i-lucide-messages-square" />
              <div class="flex flex-row">
                <p>{{ props.post.responses.length || 0 }}&nbsp;</p>
                <p class="number max-lg:hidden">
                  {{
                    props.post.responses.length > 1 ? ' réponses' : ' réponse'
                  }}
                </p>
              </div>
            </div>
            <div class="flex items-center justify-start gap-1 mt-4">
              <UIcon class="size-7 margin-2" name="i-lucide-eye" />
              <div class="flex flex-row">
                <p>{{ props.post.views }}&nbsp;</p>
                <p class="number max-lg:hidden">
                  {{ props.post.views.length > 1 ? 'vues' : ' vue' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
<style scoped>
/* Dynamic accent color set via the inline --category-accent style binding */
.category-accent {
  border-left: 4px solid var(--category-accent, var(--border-gray));
}
</style>
