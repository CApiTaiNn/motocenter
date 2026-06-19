<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
import { useConnexionModal } from '~/composables/useConnexionModal'

withDefaults(
  defineProps<{
    label?: string
    block?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { label: 'Nouvelle discussion', block: false, size: 'md' }
)

const emit = defineEmits(['new-post'])

const { isAuthenticated } = useAuth()
const { open } = useConnexionModal()
const openAddPost = ref(false)

const handleNewPost = () => {
  emit('new-post')
}
</script>

<template>
  <!-- Authenticated riders open the create-post modal; the trigger slot lets us
       style it as a full "Nouvelle discussion" button instead of the default + icon. -->
  <ForumModalAddPost
    v-if="isAuthenticated"
    v-model:open="openAddPost"
    :is-new-post="true"
    @added-post="handleNewPost"
  >
    <template #trigger>
      <UButton
        icon="i-lucide-plus"
        color="primary"
        variant="solid"
        :size="size"
        :block="block"
        :label="label"
        class="cursor-pointer rounded-full"
      />
    </template>
  </ForumModalAddPost>
  <!-- Guests are routed through the connexion modal first. -->
  <UButton
    v-else
    icon="i-lucide-plus"
    color="primary"
    variant="solid"
    :size="size"
    :block="block"
    :label="label"
    class="cursor-pointer rounded-full"
    @click="open()"
  />
</template>
