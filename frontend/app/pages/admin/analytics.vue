<script setup lang="ts">
import StatsAnalytics from '~/components/admin/StatsAnalytics.vue'
import type { IPost } from '~/types/post'
import type { IMotorcycle } from '~/types/motorcycles'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

interface RideStats {
  title: string
  value: number
  percent: number
}
const apiBase = useRuntimeConfig().public.apiBase
const stats = ref<RideStats[]>([])
const bestTopic = ref<IPost>()
const bestMotorcycle = ref<IMotorcycle>()
const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

const chartData = ref<{ month: string; user: number }[]>([])
const categories: Record<string, BulletLegendItemInterface> = {
  user: { name: 'Utilisateurs', color: '#22c55e' }
}

const xFormatter = (tick: number, _i?: number, _ticks?: number[]): string => {
  return chartData.value[tick]?.month ?? ''
}

async function fetchStats() {
  const rideCount = await $fetch<{ count: number; percent: number }>(
    `${apiBase}rides/count`
  )

  const activePosts = await $fetch<{ count: number; percent: number }>(
    `${apiBase}posts/count`
  )

  stats.value.push({
    title: 'Balades',
    value: rideCount.count,
    percent: rideCount.percent
  })

  stats.value.push({
    title: 'Posts actifs',
    value: activePosts.count,
    percent: activePosts.percent
  })
}

async function fetchMonthly() {
  const data = await $fetch<{ stats: { month: number; total: number }[] }>(
    `${apiBase}users/stats/monthly`
  )
  chartData.value = months.map((month, i) => ({
    month,
    user: data.stats.find((s) => s.month === i + 1)?.total ?? 0
  }))
}

async function fetchBestTopic() {
  const data = await $fetch<{ posts: IPost[] }>(`${apiBase}posts`, {
    params: {
      sort: JSON.stringify({ views: -1 }),
      limit: 1,
      project: 'title,views,image'
    }
  })

  const first = data.posts[0]
  bestTopic.value = first
}

async function fetchBestMotorcycle() {
  const data = await $fetch<{ motorcycles: IMotorcycle[] }>(
    `${apiBase}motorcycles`,
    {
      params: {
        sort: JSON.stringify({ numberOfComparison: -1 }),
        limit: 1,
        project: 'name,numberOfComparison,imageUrl'
      }
    }
  )
  bestMotorcycle.value = data.motorcycles[0]
}

onMounted(() => {
  fetchStats()
  fetchBestTopic()
  fetchBestMotorcycle()
  fetchMonthly()
})
</script>

<template>
  <div>
    <div class="m-4 flex flex-wrap justify-center gap-4">
      <StatsAnalytics
        v-for="item in stats"
        :key="item.title"
        :title="item.title"
        :value="item.value"
        :percent="item.percent"
      />
    </div>
    <div class="mx-4 my-6 flex flex-wrap justify-between gap-6">
      <UCard class="max-w-[600px] flex-[1_1_300px] items-center justify-center rounded-lg border border-t-[3px] border-solid border-(--border-gray) border-t-(--ui-color-warning-500)">
        <template #header>
          <div class="mb-1 flex items-center gap-2">
            <UIcon name="i-lucide-trophy" class="size-5 text-(--ui-color-warning-500)" />
            <span class="font-['Krona_One',sans-serif] text-xs tracking-widest text-gray-500 uppercase">Top post</span>
          </div>
          <h4>{{ bestTopic?.title }}</h4>
        </template>
        <template #default>
          <div class="flex items-center justify-center gap-8">
            <p>Nombre de vues : {{ bestTopic?.views }}</p>
            <img
              class="max-h-[100px] max-w-[200px] rounded-xl"
              :src="`${bestTopic?.image}`"
              :alt="bestTopic?.title"
            />
          </div>
        </template>
      </UCard>
      <UCard class="max-w-[600px] flex-[1_1_300px] items-center justify-center rounded-lg border border-t-[3px] border-solid border-(--border-gray) border-t-(--ui-primary)">
        <template #header>
          <div class="mb-1 flex items-center gap-2">
            <UIcon name="i-lucide-crown" class="size-5 text-(--ui-primary)" />
            <span class="font-['Krona_One',sans-serif] text-xs tracking-widest text-gray-500 uppercase">Top moto</span>
          </div>
          <h4>{{ bestMotorcycle?.name }}</h4>
        </template>
        <template #default>
          <div class="flex items-center justify-center gap-8">
            <p>
              Nombre de comparaisons : {{ bestMotorcycle?.numberOfComparison }}
            </p>
            <img
              class="max-h-[100px] max-w-[200px] rounded-xl"
              :src="`${bestMotorcycle?.imageUrl}`"
              :alt="bestMotorcycle?.name"
            />
          </div>
        </template>
      </UCard>
    </div>
    <UCard class="mx-4 my-6 rounded-lg border border-solid border-(--border-gray)">
      <template #header>
        <h4>Evolution des utilisateurs</h4>
      </template>
      <LineChart
        :data="chartData"
        :height="200"
        x-label="Temps"
        y-label="Total Utilisateurs"
        :categories="categories"
        :y-num-ticks="4"
        :x-num-ticks="7"
        :x-formatter="xFormatter"
        :curve-type="CurveType.Basis"
        :legend-position="LegendPosition.TopRight"
        :hide-legend="false"
        :y-grid-line="true"
      />
    </UCard>
  </div>
</template>
