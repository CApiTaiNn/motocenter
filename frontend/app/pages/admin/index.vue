<script setup lang="ts">
import type { IUser } from '@/types/users'
import StatsAnalytics from '~/components/admin/StatsAnalytics.vue'

interface Stat {
  title: string
  value: number
  icon: string
  accent: string
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
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalUsers, totalBikes, resToday, resPostsToday] = await Promise.all(
      [
        $fetch<number>(`${apiBase}users/count`),
        $fetch<number>(`${apiBase}motorcycles/count`),
        $fetch<{ users: IUser[] }>(
          `${apiBase}users?filter=${JSON.stringify({ createdAt: { $gte: today } })}`
        ),
        $fetch<{ posts: any[] }>(
          `${apiBase}posts?filter=${JSON.stringify({ createdAt: { $gte: today } })}`
        )
      ]
    )

    stats.value = [
      {
        title: 'Utilisateurs',
        value: totalUsers ?? 0,
        icon: 'i-lucide-users',
        accent: 'var(--ui-color-info-500)'
      },
      {
        title: 'Motos',
        value: totalBikes ?? 0,
        icon: 'i-lucide-bike',
        accent: 'var(--ui-primary)'
      },
      {
        title: "Nouveaux utilisateurs aujourd'hui",
        value: resToday.users.length ?? 0,
        icon: 'i-lucide-user-plus',
        accent: 'var(--ui-color-success-600)'
      },
      {
        title: "Posts créés aujourd'hui",
        value: resPostsToday.posts.length ?? 0,
        icon: 'i-lucide-message-square-plus',
        accent: 'var(--ui-color-warning-500)'
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
  <main class="admin-container">
    <h3>Bienvenue {{ userName }}</h3>
    <div class="stats-grid">
      <div
        v-for="stat in stats"
        :key="stat.title"
        class="card"
        :style="{ borderLeftColor: stat.accent }"
      >
        <UIcon :name="stat.icon" class="stat-icon" :style="{ color: stat.accent }" />
        <StatsAnalytics :title="stat.title" :value="stat.value" />
      </div>
    </div>
  </main>
</template>

<style scoped>
h3 {
  text-align: center;
  margin: var(--space-lg);
}

.admin-container {
  max-width: 80rem;
  margin: var(--space-3xl) auto;
  padding: 0 var(--space-lg);
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
}

@media (min-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md);
  border: var(--border-thin) solid var(--color-gray-light);
  border-left: 4px solid var(--ui-primary);
  background-color: var(--background);
}

.stat-icon {
  width: 1.75rem;
  height: 1.75rem;
}
</style>
