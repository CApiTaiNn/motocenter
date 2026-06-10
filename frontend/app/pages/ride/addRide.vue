<script setup lang="ts">
import AddRideForm from '~/components/ride/AddRideForm.vue'
import HeaderInfo from '../../components/global/HeaderInfo.vue'
</script>
<template>
  <div>
    <HeaderInfo :scroll-to-element-id="'container-form'">
      <template #title>
        <h1>
          Créer de nouveaux <br />
          <span class="text-(--ui-primary)">Horizons</span>
        </h1>
      </template>
      <template #subtitle>
        <p>
          Créer de nouveaux chemins, explorer de nouveaux recoins en ajoutant
          des balades pour toute la communauté.
        </p>
      </template>
    </HeaderInfo>

    <AddRideForm />
  </div>
</template>
