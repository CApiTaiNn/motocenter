<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
import { useConnexionModal } from '~/composables/useConnexionModal'
import type { IMessage } from '~/types/messages'

const props = withDefaults(
  defineProps<{
    response: IMessage
    isAmotoComment?: boolean
    deep?: number
  }>(),
  {
    deep: 0,
    isAmotoComment: false
  }
)

const MAX_DEEP = 3

const { user } = useAuth()
const { open } = useConnexionModal()
const toast = useToast()
const apiBase = useRuntimeConfig().public.apiBase

const responsesOfComment = ref<IMessage[]>([])
const isResponseOfAcomment = ref(false)
const isResponseOfAcommentValue = ref('')

const message = ref<IMessage>({ ...props.response })
const isSolidThumbUp = computed(
  () => user.value && message.value.usersLikeId.includes(user.value._id)
)
const isSolidThumbDown = computed(
  () => user.value && message.value.usersDislikeId.includes(user.value._id)
)
const isOpen = ref(false)

const handleAddLikeOrDislike = async (isLike: boolean, messageId: string) => {
  if (!user.value) {
    open()
  } else {
    const updateMessage = await $fetch<{ populatedMessage: IMessage }>(
      `${apiBase}messages`,
      {
        method: 'PATCH',
        body: {
          userId: user.value?._id,
          messageId: messageId,
          like: isLike
        }
      }
    )
    message.value = updateMessage.populatedMessage
  }
}

const handleSeeInputToAddResponseOfComment = () => {
  if (props.isAmotoComment) {
    return navigateTo('/forum')
  } else {
    isResponseOfAcomment.value = !isResponseOfAcomment.value
  }
}

const handleAddResponseOfComment = async (commentId: string) => {
  if (!user.value) {
    open()
  } else {
    const newMessage = await $fetch.raw(`${apiBase}messages`, {
      method: 'POST',
      body: {
        content: isResponseOfAcommentValue.value,
        user: user.value._id,
        reference: commentId,
        referenceModel: 'Message'
      }
    })

    if (newMessage.ok) {
      toast.add({
        title: 'Succès',
        description: 'Votre commentaire a été ajouté.',
        color: 'success'
      })
      isResponseOfAcommentValue.value = ''
      getResponseOfComment(commentId)
      isResponseOfAcomment.value = false
    } else {
      toast.add({
        title: 'Erreur',
        description: "Votre commentaire n'a pas pu être ajouté.",
        color: 'error'
      })
    }
  }
}

const getResponseOfComment = async (commentId: string) => {
  const response = await $fetch<{ messages: IMessage[] }>(
    `${apiBase}messages/${commentId}/responses`,
    {
      method: 'GET'
    }
  )

  responsesOfComment.value = response.messages
}

watch(
  () => props.response,
  (newVal) => {
    message.value = { ...newVal }
  },
  { deep: true }
)

onMounted(async () => {
  await getResponseOfComment(message.value._id)
})
</script>

<template>
  <div class="comment-wrapper max-md:ml-[var(--space-2xs)]! max-lg:ml-[var(--space-xs)]!">
    <div
      class="comment max-lg:min-w-0"
      :class="responsesOfComment.length === 0 ? 'no-responses-indent' : ''"
    >
      <div class="avatar">
        <div>
          <UIcon
            v-if="responsesOfComment.length !== 0"
            :name="isOpen ? 'i-lucide-circle-minus' : 'i-lucide-circle-plus'"
            class="cursor-pointer"
            @click="isOpen = !isOpen"
          />
        </div>
        <UAvatar
          :src="message.user.image"
          :alt="message.user.pseudo"
          size="3xl"
          :title="message.user.pseudo"
          class="mr-2"
        />
      </div>
      <div class="comment-content">
        <div class="comment-header">
          <p class="bold">{{ message.user.pseudo }},&nbsp;</p>
          <p>{{ formatTimeAgo(message.createdAt) }}</p>
        </div>
        <p class="comment-text">{{ message.content }}</p>
        <div class="comment-actions">
          <div
            class="action-button cursor-pointer"
            @click="handleAddLikeOrDislike(true, message._id)"
          >
            <UIcon
              :name="
                isSolidThumbUp
                  ? 'i-heroicons-hand-thumb-up-solid'
                  : 'i-heroicons-hand-thumb-up'
              "
              class="size-6"
            />
            <p>{{ message.like }}</p>
          </div>
          <div
            class="action-button cursor-pointer"
            @click="handleAddLikeOrDislike(false, message._id)"
          >
            <UIcon
              :name="
                isSolidThumbDown
                  ? 'i-heroicons-hand-thumb-down-solid'
                  : 'i-heroicons-hand-thumb-down'
              "
              class="size-6"
            />
            <p>{{ message.dislike }}</p>
          </div>
          <div
            class="action-button cursor-pointer"
            @click="handleSeeInputToAddResponseOfComment"
          >
            <UIcon name="i-lucide-messages-square" class="size-6" />
            <p>Répondre</p>
          </div>
        </div>
        <div v-if="isResponseOfAcomment" class="add-reponse-comment w-full">
          <UTextarea
            v-model="isResponseOfAcommentValue"
            placeholder="Ecrivez votre réponse"
          >
          </UTextarea>
          <UButton
            label="Envoyer ma réponse"
            class="cursor-pointer"
            size="sm"
            :disabled="isResponseOfAcommentValue.length === 0"
            @click="handleAddResponseOfComment(message._id)"
          />
        </div>
      </div>
    </div>
    <template v-if="responsesOfComment.length !== 0 && isOpen">
      <div
        v-for="responseOfComment in responsesOfComment"
        :key="responseOfComment._id"
      >
        <div
          :class="
            props.deep >= MAX_DEEP
              ? 'responses-container-flat max-md:ml-0! max-lg:ml-[var(--space-2xs)]! max-md:pl-[var(--space-xs)]! max-lg:pl-[var(--space-sm)]!'
              : 'responses-container max-md:ml-[var(--space-xs)]! max-lg:ml-[var(--space-sm)]! max-md:pl-[var(--space-xs)]! max-lg:pl-[var(--space-sm)]! max-lg:border-l-[length:var(--border-thick)]!'
          "
        >
          <Comment
            :response="responseOfComment"
            :deep="props.deep >= MAX_DEEP ? props.deep : props.deep + 1"
          />
        </div>
      </div>
    </template>
  </div>
</template>
<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.comment-wrapper {
  display: flex;
  flex-direction: column;
  margin-left: var(--space-md);
}

.responses-container {
  margin-left: var(--space-md);
  border-left: var(--border-thick) solid var(--border-gray);
  padding-left: var(--space-md);
  margin-top: var(--space-sm);
}

.responses-container-flat {
  margin-left: 0;
  padding-left: 0;
  border-left: none;
  margin-top: var(--space-md);
  margin-left: var(--space-xs);
}

.add-reponse-comment {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.avatar {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-xs);
  height: fit-content;
}

.comment {
  display: flex;
  flex-direction: row;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
  position: relative;
}

.comment-item {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.comment-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  flex: 1;
}

.comment-header,
.comment-actions,
.action-button {
  display: flex;
  align-items: center;
}

.comment-header {
  gap: var(--space-xs);
}

.comment-text {
  margin: 0;
  line-height: 1.5;
}

.comment-actions {
  gap: var(--space-lg);
  margin-top: var(--space-2xs);
}

.action-button {
  gap: var(--space-xs);
}

.icon {
  width: 1.25rem;
  height: 1.25rem;
}

.bold {
  font-weight: bold;
}

.no-responses-indent {
  margin-left: var(--space-md);
}
</style>
