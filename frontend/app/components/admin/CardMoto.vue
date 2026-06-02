<script setup lang="ts">
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { IBrand } from '~/types/brand'
import { MotorcycleCategory, type IMotorcycle } from '~/types/motorcycles'

const apiBase = useRuntimeConfig().public.apiBase

async function uploadFile(
  file: File,
  type: 'image' | 'sound',
  directory: string
): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)
  formData.append('directory', directory)
  formData.append('name', `${state.name}_${String(state.year)}`)

  const res = await $fetch<{ url: string }>('/api/uploadFile', {
    method: 'POST',
    body: formData
  })
  return res.url
}

async function onImageChange(file: File | null | undefined) {
  if (!file) return
  const directory = 'motorcycles'
  const url = await uploadFile(file, 'image', directory)
  state.imageUrl = `${url}?t=${Date.now()}` // timestamp pour refresh l'image -_-
}

async function onSoundChange(file: File | null | undefined) {
  if (!file) return
  const directory = 'motorcycles'
  const url = await uploadFile(file, 'sound', directory)

  state.soundLink = `${url}?t=${Date.now()}` // meme que l'image
}
const props = defineProps({
  mode: { type: String, default: 'create' },
  moto: { type: Object as () => IMotorcycle | null, default: null },
  onClosePanel: { type: Function, required: true },
  onRefresh: { type: Function, required: true }
})

async function fetchMotoDetails(_id: string) {
  const data = await $fetch<{ motorcycles: IMotorcycle[] }>(
    `${apiBase}motorcycles`,
    {
      params: {
        filter: JSON.stringify({ _id: _id }),
        project: 'all'
      }
    }
  )

  const m = data.motorcycles[0]

  const brand = brandList.value.find((b) => b._id === m.brand._id)
  state.brand = brand?.name ?? ''
  state.name = m.name ?? ''
  state.year = m.year ?? 2026
  state.category = m.category ?? ''
  state.engine_size = m.engine_size
  state.horsePower = m.horsePower
  state.torque = m.torque
  state.weight = m.weight
  state.consumption = m.consumption
  state.soundLink = m.soundLink ?? ''
  state.imageUrl = m.imageUrl ?? ''
  state.isAvailableA2 = m.isAvailableA2 ?? false
  state.is_public = m.is_public ?? false
  state.speedMax = m.speedMax
  state.withAllField = m.withAllField ?? false
  state.price = m.price
  state.acceleration = {
    time_0_100: m.acceleration?.time_0_100,
    time_100_200: m.acceleration?.time_100_200,
    time_200_300: m.acceleration?.time_200_300
  }
}

const listMotorcycleCategory = Object.values(MotorcycleCategory).filter(
  (item) => {
    return isNaN(Number(item))
  }
)

const schema = v.object({
  brand: v.pipe(v.string(), v.minLength(1, 'La marque est requise')),
  name: v.pipe(
    v.string(),
    v.minLength(3, 'Le modèle doit contenir au moins 3 caractères')
  ),
  year: v.pipe(
    v.number("L'année est requise"),
    v.minValue(1900, 'Année invalide')
  ),
  category: v.pipe(v.enum(MotorcycleCategory, 'La catégorie est requise')),
  engine_size: v.pipe(
    v.number('La cylindrée est requise'),
    v.minValue(1, 'Cylindrée invalide')
  ),
  horsePower: v.pipe(
    v.number('Les chevaux sont requis'),
    v.minValue(1, 'Valeur invalide')
  ),
  torque: v.pipe(
    v.number('Le couple est requis'),
    v.minValue(1, 'Valeur invalide')
  ),
  weight: v.pipe(
    v.number('Le poids est requis'),
    v.minValue(1, 'Valeur invalide')
  ),
  consumption: v.pipe(
    v.number('La consommation est requise'),
    v.minValue(0.1, 'Valeur invalide')
  ),
  soundLink: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  isAvailableA2: v.boolean(),
  is_public: v.boolean(),
  acceleration: v.object({
    time_0_100: v.optional(v.number()),
    time_100_200: v.optional(v.number()),
    time_200_300: v.optional(v.number())
  }),
  speedMax: v.optional(v.number()),
  withAllField: v.optional(v.boolean()),
  price: v.optional(v.number())
})

type Schema = v.InferOutput<typeof schema>

const state = reactive<Schema>({
  brand: '',
  name: '',
  year: 2026,
  category: undefined as unknown as MotorcycleCategory,
  engine_size: undefined,
  horsePower: undefined,
  torque: undefined,
  weight: undefined,
  consumption: undefined,
  soundLink: '',
  imageUrl: '',
  isAvailableA2: false,
  is_public: false,
  acceleration: {
    time_0_100: undefined,
    time_100_200: undefined,
    time_200_300: undefined
  },
  speedMax: undefined,
  withAllField: false,
  price: undefined
})

const brandList = ref<IBrand[]>([])
const brandItems = ref<string[]>([])

async function fetchData() {
  const data = await $fetch<{ brands: IBrand[] }>(
    `${apiBase}brands?project=name`
  )
  brandList.value = data.brands
  brandItems.value = data.brands.map((b) => b.name)
}

onMounted(async () => {
  await fetchData()

  if (props.mode === 'edit' && props.moto?._id) {
    await fetchMotoDetails(props.moto._id)
  }
})

const toast = useToast()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    const selectedBrand = brandList.value.find(
      (b) => b.name === event.data.brand
    )
    if (!selectedBrand?._id) {
      return
    }
    const { brand, ...rest } = event.data
    const allFieldCompleted = !!(
      rest.name &&
      rest.year &&
      rest.category &&
      rest.engine_size &&
      rest.horsePower &&
      rest.torque &&
      rest.weight &&
      rest.consumption &&
      rest.speedMax &&
      rest.price &&
      rest.imageUrl &&
      rest.soundLink &&
      rest.acceleration?.time_0_100 &&
      rest.acceleration?.time_100_200 &&
      rest.acceleration?.time_200_300
    )
    const motorcycleData = {
      brand: selectedBrand._id,
      ...rest,
      withAllField: allFieldCompleted
    }
    if (props.mode === 'edit' && props.moto?._id) {
      // Put edit
      await $fetch(`${apiBase}motorcycles/${props.moto._id}`, {
        method: 'PUT',
        body: motorcycleData
      })
    } else {
      // Post creation
      await $fetch(`${apiBase}motorcycles`, {
        method: 'POST',
        body: { ...motorcycleData }
      })
    }

    toast.add({
      title: 'Succès',
      description: 'Moto enregistrée',
      color: 'success'
    })
    props.onClosePanel()
    props.onRefresh()
  } catch {
    toast.add({
      title: 'Erreur',
      description: 'Échec de la sauvegarde',
      color: 'error'
    })
  }
}

async function removeMotorcycle() {
  if (!props.moto?._id) return

  try {
    await $fetch(`${apiBase}motorcycles/${props.moto._id}`, {
      method: 'DELETE'
    })
    toast.add({
      title: 'Supprimée',
      description: 'La moto a bien été supprimée',
      color: 'success'
    })
    props.onClosePanel()
    props.onRefresh()
  } catch {
    toast.add({
      title: 'Erreur',
      description: 'Échec de la suppression',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="flex justify-between items-center">
    <h3>{{ mode === 'edit' ? 'Modifier la moto' : "Ajout d'une moto" }}</h3>
    <UIcon
      name="i-lucide-x"
      class="cursor-pointer size-6"
      @click="props.onClosePanel"
    />
  </div>
  <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
    <UFormField label="Marque" name="brand" required>
      <UInputMenu v-model="state.brand" :items="brandItems" />
    </UFormField>

    <UFormField label="Modèle" name="name" required>
      <UInput v-model="state.name" />
    </UFormField>

    <UFormField label="Catégorie" name="category" required>
      <UInputMenu v-model="state.category" :items="listMotorcycleCategory" />
    </UFormField>

    <UFormField label="Prix (€)" name="price">
      <UInputNumber v-model="state.price" />
    </UFormField>

    <UFormField label="Année" name="year" required>
      <UInputNumber v-model="state.year" />
    </UFormField>

    <UFormField label="Cylindrée (cm3)" name="engine_size" required>
      <UInputNumber v-model="state.engine_size" />
    </UFormField>

    <UFormField label="Chevaux" name="horsePower" required>
      <UInputNumber v-model="state.horsePower" />
    </UFormField>

    <UFormField label="Couple (N.m)" name="torque" required>
      <UInputNumber v-model="state.torque" />
    </UFormField>

    <UFormField label="Poids (Kg)" name="weight" required>
      <UInputNumber v-model="state.weight" />
    </UFormField>

    <UFormField label="Consommation (L/100Km)" name="consumption" required>
      <UInputNumber v-model="state.consumption" />
    </UFormField>

    <UFormField label="Vitesse max (Km/h)" name="speedMax">
      <UInputNumber v-model="state.speedMax" />
    </UFormField>

    <UFormField label="Son" name="soundLink">
      <UFileUpload
        icon="i-lucide-music"
        label="Glisser le son ici"
        description="MP3, MP4, WAV"
        accept="audio/mpeg,audio/wav,audio/ogg"
        @update:model-value="onSoundChange"
      />
      <p v-if="state.soundLink" class="text-sm text-gray-500 mt-1">
        ✓ {{ state.soundLink }}
      </p>
    </UFormField>
    <UFormField label="Image" name="imageUrl">
      <UFileUpload
        icon="i-lucide-image"
        label="Glisser l'image ici"
        description="PNG, JPG, WEBP"
        accept="image/png,image/jpeg,image/webp"
        @update:model-value="onImageChange"
      />
      <img
        v-if="state.imageUrl"
        :src="state.imageUrl"
        class="mt-2 h-24 rounded object-cover"
      />
    </UFormField>

    <h4>Accélération</h4>

    <UFormField label="0 à 100 (s)" name="acceleration.time_0_100">
      <UInputNumber v-model="state.acceleration.time_0_100" />
    </UFormField>

    <UFormField label="100 à 200 (s)" name="acceleration.time_100_200">
      <UInputNumber v-model="state.acceleration.time_100_200" />
    </UFormField>

    <UFormField label="200 à 300 (s)" name="acceleration.time_200_300">
      <UInputNumber v-model="state.acceleration.time_200_300" />
    </UFormField>

    <UFormField name="isAvailableA2">
      <USwitch v-model="state.isAvailableA2" label="Compatible A2" />
    </UFormField>

    <UFormField name="is_public">
      <USwitch v-model="state.is_public" label="Public" />
    </UFormField>

    <div class="flex justify-between items-center">
      <UButton type="submit" color="primary"> Enregistrer </UButton>
      <UIcon
        v-if="mode === 'edit'"
        name="i-lucide-trash-2"
        class="cursor-pointer size-6"
        @click="removeMotorcycle()"
      />
    </div>
  </UForm>
</template>
