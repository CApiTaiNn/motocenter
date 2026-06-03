<script setup lang="ts">
import * as v from 'valibot'
import { useAuth } from '~/composables/useAuth'
import type { IBrand } from '~/types/brand'
import type { PostCategory} from '~/utils/postCategory';
import { POST_CATEGORY_OPTIONS } from '~/utils/postCategory'
import type { IPost } from '~/types/post'

const props = defineProps<{
  isNewPost: boolean
  post?: IPost
  isSameUser?: boolean
}>()

const categories = POST_CATEGORY_OPTIONS
const brands = ref<IBrand[]>([])
const toast = useToast()
const { user } = useAuth()
const emit = defineEmits(['added-post'])
const displayModal = defineModel<boolean>('open', { default: false })
const isHover = ref(false)
const initialState = ref({
  title: '',
  category: '',
  brand: '',
  description: ''
})

const getBrands = async () => {
  const res = await $fetch<{ brands: IBrand[] }>(
    `${useRuntimeConfig().public.apiBase}brands`,
    {
      params: {
        project: 'name,_id'
      }
    }
  )
  brands.value = res.brands
}

const schema = v.object({
  title: v.pipe(v.string(), v.minLength(1, 'Le titre est requis'), v.check(val => val.trim().length > 0, 'Le titre ne peut pas contenir uniquement des espaces')),
  category: v.pipe(v.string(), v.minLength(1, 'La catégorie est requise')),
  brand: v.pipe(v.string(), v.minLength(1, 'La marque est requise')),
  description: v.pipe(v.string(), v.minLength(1, 'La description est requise'), v.check(val => val.trim().length > 0, 'La description ne peut pas contenir uniquement des espaces')),
  file: v.optional(
    v.union([
      v.pipe(
        v.instance(File, 'Image requise'),
        v.mimeType(['image/jpeg', 'image/png'], 'Format invalide')
      ),
      v.pipe(v.string(), v.minLength(1))
    ])
  )
})

const state = reactive({
  title: props.post?.title || '',
  category: props.post?.category as PostCategory | undefined,
  brand: props.post?.brand.name || '',
  description: props.post?.content || '',
  file: undefined as File | undefined
})

const currentImageUrl = ref(props.post?.image || '')

const uploadImage = async (file: File, name: string): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', 'image')
  formData.append('directory', 'posts')
  formData.append('name', name)

  const res = await $fetch<{ url: string }>('/api/uploadFile', {
    method: 'POST',
    body: formData
  })
  return res.url
}

const onSubmit = async () => {
  const payload = {
    brand: state.brand,
    title: state.title,
    category: state.category,
    content: state.description,
    url: currentImageUrl.value,
    user: user.value?._id,
    isNewMotoComment: false
  }

  try {
    if (state.file instanceof File) {
      const regex = /([^/]+)(?=\.\w+$)/
      const match = props.post?.image?.match(regex)
      const fileName = match ? match[0] : Date.now().toString()
      payload.url = await uploadImage(state.file, fileName)
    }

    try {
      const method = props.isNewPost ? 'POST' : 'PUT'
      const response = await $fetch.raw(
        `${useRuntimeConfig().public.apiBase}posts`,
        {
          method,
          body: payload,
          ...(!props.isNewPost && {
            params: { filter: JSON.stringify({ id: props.post?._id }) }
          })
        }
      )

      if (response.ok) {
        toast.add({
          title: 'Succès',
          description: `Votre post a été ${props.isNewPost ? 'ajouté' : 'modifié'}.`,
          color: 'success'
        })
        resetForm()
        displayModal.value = false
        emit('added-post')
      }
    } catch {
      toast.add({
        title: 'Erreur',
        description: `Votre post n'a pas pu être ${props.isNewPost ? 'ajouté' : 'modifié'}`,
        color: 'error'
      })
    }
  } catch {
    toast.add({
      title: 'Erreur',
      description: `Votre post n'a pas pu être ${props.isNewPost ? 'ajouté' : 'modifié'}`,
      color: 'error'
    })
  }
}

const handleCloseModal = () => {
  displayModal.value = false
}

const resetForm = () => {
  state.brand = props.post?.brand.name || ''
  state.title = props.post?.title || ''
  state.category = props.post?.category
  state.description = props.post?.content || ''
  state.file = undefined
}

const modalTitle = () => {
  return props.isNewPost ? 'Ajouter post' : 'Modifier un post'
}

const onImageTitle = () => {
  return props.isNewPost ? 'Ajouter une image' : 'Image associée à mon post'
}

const getPreviewUrl = () => {
  if (state.file instanceof File) {
    return URL.createObjectURL(state.file)
  }

  return currentImageUrl.value
}

const setInitialState = () => {
  initialState.value = {
    title: props.post?.title || '',
    category: props.post?.category || '',
    brand: props.post?.brand.name || '',
    description: props.post?.content || ''
  }
}

const isSameValues = computed(() => {
  const hasFormChanged =
    state.title !== initialState.value.title ||
    state.category !== initialState.value.category ||
    state.brand !== initialState.value.brand ||
    state.description !== initialState.value.description

  const hasNewPost = state.file instanceof File

  return hasFormChanged || hasNewPost
})

onMounted(async () => {
  await getBrands()
  setInitialState()
})
</script>

<template>
  <div>
    <UModal v-model:open="displayModal" :close="true">
      <UIcon v-if="isSameUser && isNewPost === false" class="size-6" name="i-lucide-square-pen" @click.stop />
      <UButton
v-if="isNewPost === true" icon="i-lucide-plus" size="sm" color="primary" variant="solid"
        class="cursor-pointer" />
      <template #header>
        <div class="w-full flex justify-between items-center">
          <h3>{{ modalTitle() }}</h3>
          <UButton
color="primary" variant="outline" icon="i-lucide-x" class="rounded-full cursor-pointer"
            @click="handleCloseModal" />
        </div>
      </template>
      <template #body>
        <div>
          <UForm :schema :state="state" class="w-full flex flex-col gap-2" @submit="onSubmit">
            <UFormField label="Titre du post" required name="title">
              <UInput v-model="state.title" placeholder="Titre du post" size="md" class="w-full" />
            </UFormField>
            <UFormField label="Catégorie" required name="category">
              <USelectMenu
v-model="state.category" placeholder="Sélectionnez la catégorie du post" :items="categories"
                value-key="value" label-key="label" :search-input="{
                  placeholder: 'Rechercher',
                  icon: 'i-lucide-search'
                }" size="md" class="w-full">
                <template #empty>
                  <span class="text-gray-500 text-sm p-2">
                    Aucune catégorie trouvée
                  </span>
                </template>
              </USelectMenu>
            </UFormField>
            <UFormField label="Marque" required name="brand">
              <USelectMenu
v-model="state.brand" placeholder="Sélectionnez la marque du post" :items="brands"
                value-key="name" label-key="name" :search-input="{
                  placeholder: 'Rechercher',
                  icon: 'i-lucide-search'
                }" size="md" class="w-full">
                <template #empty>
                  <span class="text-gray-500 text-sm p-2">
                    Aucune marque trouvée
                  </span>
                </template>
              </USelectMenu>
            </UFormField>
            <UFormField label="Description" required name="description">
              <UTextarea v-model="state.description" size="md" placeholder="Ecrivez votre description" class="w-full" />
            </UFormField>
            <UFormField required :label="onImageTitle()" name="file">
              <UFileUpload v-model="state.file" accept="image/*" label="Déposez votre image" description="PNG ou JPG">
                <template #default="{ open }">
                  <div @click="() => open()" @mouseover="isHover = true" @mouseleave="isHover = false">
                    <div class="cursor-pointer" :class="isHover ? 'blur-[2px]' : ''">
                      <img :src="getPreviewUrl()" class="max-w-[80%]" />
                    </div>
                    <div
v-if="props.isNewPost && getPreviewUrl() === ''"
                      class="cursor-pointer text-center min-h-[100px] max-h-[100px] border-2 border-dashed border-[var(--border-gray)] rounded-xl">
                      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                        <UIcon name="i-lucide-cloud-upload" class="size-10" />
                        <p class="text-base">Sélectionner votre fichier</p>
                      </div>
                    </div>
                    <div
v-if="isHover && getPreviewUrl() !== ''"
                      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center cursor-pointer"
                      @click="() => open()">
                      <h4 class="text-sm p-2 text-[var(--background)] bg-[rgba(128,128,128,0.865)]">Cliquer pour modifier la photo</h4>
                    </div>
                  </div>
                </template>
              </UFileUpload>
            </UFormField>
            <div class="flex gap-2 mt-8">
              <UButton v-if="isNewPost" class="cursor-pointer" type="submit">
                Ajouter
              </UButton>
              <UButton v-else class="cursor-pointer" type="submit" :disabled="!isSameValues">
                Modifier
              </UButton>
              <UButton class="cursor-pointer" variant="outline" @click="resetForm">
                Réinitialiser
              </UButton>
            </div>
          </UForm>
        </div>
      </template>
    </UModal>
  </div>
</template>
