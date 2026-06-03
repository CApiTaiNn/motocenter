<script setup lang="ts">
const props = defineProps<{
  title: string
  value: number
  percent?: number
}>()
</script>

<template>
  <UCard class="min-w-[20%] border border-(--border-gray)">
    <template #header>
      <h3 class="text-center">{{ props.value }}</h3>
    </template>

    <template #default>
      <div class="flex items-center justify-center gap-2">
        <div
          v-if="props.percent !== undefined"
          class="flex items-center justify-center gap-2"
        >
          <UIcon
            :name="
              props.percent > 0
                ? 'i-lucide-move-up-right'
                : 'i-lucide-move-down-right'
            "
            size="large"
            :class="props.percent > 0 ? 'text-green-500' : 'text-red-500'"
          />
          <p
            v-if="props.percent !== undefined"
            class="text-center"
            :class="props.percent > 0 ? 'text-green-500' : 'text-red-500'"
          >
            {{ props.percent }}%
          </p>
        </div>
        <p class="text-center">{{ props.title }}</p>
      </div>
    </template>
  </UCard>
</template>
