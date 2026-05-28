<script setup lang="ts">
import type { IUser } from '@/types/users'
import StatsAnalytics from '~/components/admin/StatsAnalytics.vue'

interface Stat {
  title: string
  value: number
}

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const userName: string = 'Admin'
const apiBase = useRuntimeConfig().public.apiBase
const stats = ref<Stat[]>([])

async function fetchStats() {
  try {
    const totalUsers = await $fetch<number>(`${apiBase}users/count`)
    const totalBikes = await $fetch<number>(`${apiBase}motorcycles/count`)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const resToday = await $fetch<{ users: IUser[] }>(
      `${apiBase}users?filter=${JSON.stringify({ createdAt: { $gte: today } })}`
    )

    const resPostsToday = await $fetch<{ posts: any[] }>(
      `${apiBase}posts?filter=${JSON.stringify({ createdAt: { $gte: today } })}`
    )

    stats.value = [
      {
        title: 'Utilisateurs',
        value: totalUsers ?? 0
      },
      {
        title: 'Motos',
        value: totalBikes ?? 0
      },
      {
        title: "Nouveaux utilisateurs aujourd'hui",
        value: resToday.users.length ?? 0
      },
      {
        title: "Posts créés aujourd'hui",
        value: resPostsToday.posts.length ?? 0
      }
    ]
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques :', error)
  }
}

onMounted(() => {
  fetchStats()
})
</script>

<template>
  <main>
    <h3>Bienvenue {{ userName }}</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pl-40 pr-40">
      <div v-for="stat in stats" :key="stat.title" class="card">
        <StatsAnalytics :title="stat.title" :value="stat.value" />
      </div>
    </div>
  </main>
</template>

<style scoped>
h3 {
  text-align: center;
  margin: 20px;
}

main {
  margin: 100px 20px;
}

.card {
  border-radius: var(--radius-md);
}
</style>
