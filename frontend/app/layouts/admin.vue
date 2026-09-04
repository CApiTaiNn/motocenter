<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import Header from '~/components/admin/Header.vue'

function getItems() {
  return [
    {
      label: 'Accueil',
      icon: 'i-lucide-house',
      to: '/admin'
    },
    {
      label: 'Motos',
      icon: 'i-lucide-square-dot',
      to: '/admin/listMoto'
    },
    {
      label: 'Statistiques',
      icon: 'i-lucide-chart-pie',
      to: '/admin/analytics'
    }
  ] satisfies NavigationMenuItem[]
}
</script>

<template>
  <div class="flex flex-1">
    <UDashboardSidebar
      :collapsible="true"
      :ui="{
        root: 'bg-primary h-screen sticky top-0',
        body: 'py-0'
      }"
    >
      <template #header="{ collapsed }">
        <LogoApp v-if="!collapsed" class="h-5 w-auto shrink-0" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :key="String(collapsed)"
          :items="getItems()"
          orientation="vertical"
          :ui="{
            linkLeadingIcon:
              'text-white group-data-[active]:text-primary',
            link: 'text-white data-[active]:text-primary'
          }"
        />
      </template>
    </UDashboardSidebar>

    <div class="flex-1">
      <Header />
      <hr />
      <slot />
      <UToaster />
    </div>
  </div>
</template>
<style scoped></style>
