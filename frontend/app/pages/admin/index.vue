<script setup lang="ts">
import type { IUser } from '~/types/users'
import StatsAnalytics from '~/components/admin/StatsAnalytics.vue'

const toast = useToast()

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

useSeoMeta({ title: 'Administration', robots: 'noindex, nofollow' })

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
          `${apiBase}users?filter=${JSON.stringify({ createdAt: { $gte: today } })}`,
          { credentials: 'include' }
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
    toast.add({
      title: 'Erreur',
      description: 'Les statistiques n’ont pas pu être chargées.',
      color: 'error'
    })
  }
}

onMounted(() => {
  fetchStats()
})
</script>

<template>
  <main class="mx-auto my-16 max-w-7xl px-6">
    <h3 class="m-6 text-center">Bienvenue {{ userName }}</h3>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div
        v-for="stat in stats"
        :key="stat.title"
        class="relative flex flex-col gap-2 rounded-xl border border-l-4 border-solid border-gray-300 border-l-(--ui-primary) bg-(--background) px-6 py-4"
        :style="{ borderLeftColor: stat.accent }"
      >
        <UIcon :name="stat.icon" class="size-7" :style="{ color: stat.accent }" />
        <StatsAnalytics :title="stat.title" :value="stat.value" />
      </div>
    </div>
  </main>
</template>
