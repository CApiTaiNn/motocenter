<script setup lang="ts">
const modules = import.meta.glob('@/images/sponsors/*.png', { 
  eager: true,
  import: 'default'
})
// On définit une liste pour pouvoir la doubler facilement
const logos = Object.values(modules).map((mod) => mod as string)
</script>

<template>
  <div class="carousel w-full overflow-hidden py-6">
    <div class="inner flex w-max">
      <div
        v-for="card in [...logos, ...logos]"
        :key="card"
        class="mx-3 flex w-[10%] shrink-0 items-center justify-center"
      >
        <img
          :src="card"
          :alt="`Sponsor ${card}`"
          class="max-h-full max-w-full rounded-[20px] object-contain"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.inner {
  animation: scroll 20s linear infinite;
}

@keyframes scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.carousel:hover .inner {
  animation-play-state: paused;
}
</style>
