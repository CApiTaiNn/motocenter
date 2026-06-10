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
  () => user.value && message.value.likedByMe === true
)
const isSolidThumbDown = computed(
  () => user.value && message.value.dislikedByMe === true
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
        credentials: 'include',
        body: {
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
      credentials: 'include',
      body: {
        content: isResponseOfAcommentValue.value,
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
  <div class="ml-4 flex flex-col max-lg:ml-2! max-md:ml-1!">
    <div
      class="relative mb-4 flex flex-row gap-4 max-lg:min-w-0"
      :class="responsesOfComment.length === 0 ? 'ml-4' : ''"
    >
      <div class="flex h-fit flex-row items-center gap-2">
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
      <div class="flex flex-1 flex-col gap-2">
        <div class="flex items-center gap-2">
          <p class="font-bold">{{ message.user.pseudo }},&nbsp;</p>
          <p>{{ formatTimeAgo(message.createdAt) }}</p>
        </div>
        <p class="m-0 leading-normal">{{ message.content }}</p>
        <div class="mt-1 flex items-center gap-6">
          <div
            class="flex cursor-pointer items-center gap-2"
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
            class="flex cursor-pointer items-center gap-2"
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
            class="flex cursor-pointer items-center gap-2"
            @click="handleSeeInputToAddResponseOfComment"
          >
            <UIcon name="i-lucide-messages-square" class="size-6" />
            <p>Répondre</p>
          </div>
        </div>
        <div v-if="isResponseOfAcomment" class="flex w-full flex-col gap-2">
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
              ? 'mt-4 ml-2 border-l-0 pl-0 max-lg:ml-1! max-lg:pl-3! max-md:ml-0! max-md:pl-2!'
              : 'mt-3 ml-4 border-l-2 border-solid border-(--border-gray) pl-4 max-lg:ml-3! max-lg:border-l-2! max-lg:pl-3! max-md:ml-2! max-md:pl-2!'
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
