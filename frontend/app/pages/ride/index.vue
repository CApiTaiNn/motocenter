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

    <RideBrowseMap @add="goToForm" />
  </div>
</template>
