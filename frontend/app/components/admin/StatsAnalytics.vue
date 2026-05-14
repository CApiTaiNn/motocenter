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
      <h3>{{ props.value }}</h3>
    </template>

    <template #default>
      <div class="info-container">
        <div v-if="props.percent !== undefined" class="percent-container">
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
            :class="props.percent > 0 ? 'text-green-500' : 'text-red-500'"
          >
            {{ props.percent }}%
          </p>
        </div>
        <p>{{ props.title }}</p>
      </div>
    </template>
  </UCard>
</template>

<style scoped>
.percent-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

h6,
h3,
p {
  text-align: center;
}

.info-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
</style>
