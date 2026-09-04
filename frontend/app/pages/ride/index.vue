<script setup lang="ts">
import HeaderInfo from '../../components/global/HeaderInfo.vue'
import RideBrowseMap from '../../components/ride/RideBrowseMap.vue'

useSeoMeta({
  title: 'Balades à moto',
  description: 'Découvrez et partagez des itinéraires de balades à moto.'
})
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
  </div>
</template>
