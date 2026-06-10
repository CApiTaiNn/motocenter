<script setup lang="ts">
import { useAuth } from '~/composables/useAuth.js'
import HeaderInfo from '../../components/global/HeaderInfo.vue'
import RideBrowseMap from '../../components/ride/RideBrowseMap.vue'
import { useConnexionModal } from '~/composables/useConnexionModal.js'

const { user } = useAuth()
const { open } = useConnexionModal()

const goToForm = async () => {
  if (!user.value?._id) {
    open()
    return
  }

  await navigateTo({
    path: '/ride/addRide',
    query: { scroll: 'true' }
  })
}
</script>
<template>
  <div>
    <HeaderInfo :scroll-to-element-id="'map'">
      <template #title>
        <h1>
          Trouver de nouveaux chemins à <br />
          <span class="text-(--ui-primary)">Explorer</span>
        </h1>
      </template>
      <template #subtitle>
        <p>
          Trouver facilement des nouveaux lieux, des nouvelles balades et des
          nouvelles personnes pour les réaliser avec vous.
        </p>
      </template>
    </HeaderInfo>

    <RideBrowseMap />

    <UCard class="mx-auto mt-8 mb-16 max-w-240">
      <div class="flex flex-row flex-wrap items-center gap-4 max-[410px]:justify-center">
        <UIcon name="i-lucide-map-pinned" class="size-10 text-(--ui-primary)" />
        <div class="min-w-48 flex-1">
          <h4>Pas trouvé votre balade ?</h4>
          <p>Ajoutez-la pour la partager avec la communauté.</p>
        </div>
        <UButton
          color="primary"
          icon="i-lucide-plus"
          size="lg"
          class="cursor-pointer text-white!"
          @click="goToForm"
          >Ajouter une balade</UButton
        >
      </div>
    </UCard>
  </div>
</template>
