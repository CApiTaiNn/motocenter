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

    <div class="add-container">
      <p class="p-mobile">
        Vous ne trouvez pas votre balade, vous pouvez l’ajouter :
      </p>
      <UButton
        color="primary"
        icon="i-lucide-map-pinned"
        class="cursor-pointer text-white"
        @click="goToForm"
        >Ajouter une balade</UButton
      >
    </div>
  </div>
</template>
<style scoped>
.add-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 50px;
  margin-left: 20px;
}

@media (max-width: 410px) {
  .add-container {
    justify-content: center;
  }
}
</style>
