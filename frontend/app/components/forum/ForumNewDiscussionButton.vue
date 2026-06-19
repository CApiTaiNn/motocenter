<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
import { useConnexionModal } from '~/composables/useConnexionModal'

const props = withDefaults(
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

// Shared button presentation — bound to both the modal trigger (authenticated)
// and the connexion-gated button (guest) so the two stay in sync.
const buttonProps = computed(() => ({
  icon: 'i-lucide-plus',
  color: 'primary' as const,
  variant: 'solid' as const,
  size: props.size,
  block: props.block,
  label: props.label,
  class: 'cursor-pointer rounded-full'
}))

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
      <UButton v-bind="buttonProps" />
    </template>
  </ForumModalAddPost>
  <!-- Guests are routed through the connexion modal first. -->
  <UButton v-else v-bind="buttonProps" @click="open()" />
</template>
