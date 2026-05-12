<script setup lang="ts">
import type { IPost } from '~/types/post'

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
  <UCard class="card-forum custom-border" @click="handleOpenAPost(post._id)">
    <div class="postCard">
      <USkeleton v-if="props.loading" class="size-12 rounded-full" />
      <UAvatar
        v-else
        :src="props.post.user.image"
        size="3xl"
        loading="lazy"
        class="margin-2"
      />
      <div class="main">
        <div class="top">
          <h4>{{ props.post.title }}</h4>
          <ForumEditAPost
            :post="post"
            :is-new-post="false"
            @edited-post="handlePostChange"
          />
        </div>
        <div class="grid">
          <div>
            <div class="badges">
              <UBadge size="lg" class="margin-2">{{
                props.post.brand.name
              }}</UBadge>
              <UBadge size="lg">{{ props.post.category.name }}</UBadge>
            </div>
            <p>
              Par {{ props.post.user.pseudo }},
              {{ formatTimeAgo(props.post.createdAt) }}
            </p>
          </div>
          <div class="statsContainer">
            <div class="stats">
              <UIcon class="size-7 margin-2" name="i-lucide-messages-square" />
              <div class="responses">
                <p>{{ props.post.responses.length || 0 }}&nbsp;</p>
                <p class="number">
                  {{
                    props.post.responses.length > 1 ? ' réponses' : ' réponse'
                  }}
                </p>
              </div>
            </div>
            <div class="stats">
              <UIcon class="size-7 margin-2" name="i-lucide-eye" />
              <div class="responses">
                <p>{{ props.post.views }}&nbsp;</p>
                <p class="number">
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
/** Style version mobile */
@media (max-width: 1024px) {
  .number {
    display: none;
  }

  .statsContainer {
    display: flex;
    flex-direction: row;
    gap: 0.5em;
  }

  .grid {
    flex-wrap: wrap;
  }
}

/** Style version PC */
@media (min-width: 1024px) {
  .statsContainer {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
  }
}

.card-forum {
  width: 100%;
  max-width: 1100px;
}

.responses {
  display: flex;
  flex-direction: row;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.postCard {
  width: 100%;
  padding: 0.75rem 1.25rem;
  display: flex;
  gap: 1.5em;
  align-items: flex-start;
}

.top {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
}

.top h3 {
  margin: 0;
}

.badges {
  display: flex;
  flex-direction: row;
  gap: 1.5rem;
  align-items: center;
  margin-bottom: 1em;
  margin-top: 1em;
}

.stats:nth-child(2) {
  margin-bottom: 0;
}

.stats {
  display: flex;
  gap: 0.3em;
  margin-top: 1em;
  align-items: center;
  justify-content: flex-start;
}

.grid {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5em;
  width: 100%;
}

.custom-border {
  border: 0.5px solid var(--border-gray);
}
</style>
