<script setup lang="ts">
import { useAuth } from '~/composables/useAuth.js'
import HeaderInfo from '../../components/global/HeaderInfo.vue'
import DisplayMapRide from '../../components/ride/DisplayMapRide.vue'
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
        <h1 class="h1-mobile">
          Trouver de nouveaux chemins à <br />
          <span style="color: red">Explorer</span>
        </h1>
      </template>
      <template #subtitle>
        <p class="p-mobile">
          Trouver facilement des nouveaux lieux, des nouvelles balades et des
          nouvelles personnes pour les réaliser avec vous.
        </p>
      </template>
    </HeaderInfo>

    <DisplayMapRide
      display-filters
      display-enlarge-button
      display-ride-list
      display-map-loader
      display-ride
    />

    <UCard class="add-cta">
      <div class="add-cta-content max-[410px]:justify-center">
        <UIcon name="i-lucide-map-pinned" class="size-10 text-(--ui-primary)" />
        <div class="add-cta-text">
          <h4>Pas trouvé votre balade ?</h4>
          <p class="p-mobile">Ajoutez-la pour la partager avec la communauté.</p>
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
<style scoped>
.add-cta {
  max-width: 60rem;
  margin: 2rem auto 4rem;
}

.add-cta-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.add-cta-text {
  flex: 1;
  min-width: 12rem;
}
</style>
