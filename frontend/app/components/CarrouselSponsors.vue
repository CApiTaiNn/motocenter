<script setup lang="ts">
const modules = import.meta.glob('@/images/sponsors/*.png', { 
  eager: true,
  import: 'default'
})
// On définit une liste pour pouvoir la doubler facilement
const logos = Object.values(modules).map((mod) => mod as string)
</script>

<template>
  <div class="carousel">
    <div class="inner">
      <div v-for="card in [...logos, ...logos]" :key="card" class="card">
        <img
          :src="card"
          :alt="`Sponsor ${card}`"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.carousel {
  width: 100%;
  overflow: hidden;
  padding: var(--space-lg) 0;
}

.inner {
  display: flex;
  width: max-content;
  animation: scroll 20s linear infinite;
}

.card {
  flex-shrink: 0;
  width: 10%;
  margin: 0 var(--space-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--radius-lg);
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
