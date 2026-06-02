<script setup lang="ts">
import type { IMotorcycle } from '~/types/motorcycles'

defineProps<{
  items: IMotorcycle[]
}>()
const emit = defineEmits<{
  (e: 'selected', _id: string, imgUrl: string): void
}>()

const route = useRoute()
const isOnComparisonPage = computed(() => route.path === '/comparo')

function handleCompareClick(itemId: string, imgUrl: string) {
  if (isOnComparisonPage.value) {
    emit('selected', itemId, imgUrl ? imgUrl : '')
  } else {
    navigateTo('/comparo')
  }
}
</script>
<template>
  <UCarousel
    v-slot="{ item }"
    loop
    dots
    arrows
    :items="items"
    :ui="{
      viewport: 'px-4',
      container: 'flex items-stretch h-full',
      item: 'flex-none px-2 sm:px-3 self-stretch',
      prev: 'start-0',
      next: 'end-0'
    }"
  >
    <article
      class="flex flex-col items-center justify-between text-center h-full w-[230px] gap-2 py-3 mx-2 border-2 border-solid border-[var(--background-secondary)] rounded-[20px] cursor-pointer max-lg:w-[180px]! md:max-lg:w-[205px]!"
      @click="navigateTo(`/motorcycle/${item._id}`)"
    >
      <h5 class="select-none h5-mobile">{{ item.name }}</h5>
      <img
        :src="`${item.imageUrl}`"
        width="100"
        height="100"
        :alt="item.name"
        class="rounded-lg max-lg:w-[70px] md:max-lg:w-[85px]"
        loading="lazy"
      />
      <div id="description" class="flex flex-col items-center justify-center select-none">
        <p>{{ item.horsePower }} ch</p>
        <hr />
        <p>{{ item.torque }} Nm</p>
        <hr />
        <p>{{ item.price }} €</p>
      </div>
      <div @click.stop>
        <UButton
          size="sm"
          color="primary"
          class="rounded-full cursor-pointer text-white"
          icon="i-lucide-arrow-left-right"
          @click.stop="
            () =>
              handleCompareClick(item._id, item.imageUrl ? item.imageUrl : '')
          "
          >Comparer</UButton
        >
      </div>
    </article>
  </UCarousel>
</template>

<style scoped>
article {
  background:
    radial-gradient(
      circle at top right,
      color-mix(in srgb, var(--ui-primary) 18%, transparent),
      transparent 60%
    ),
    var(--background-secondary);
}

article p,
article span {
  font-family: 'Krona One', sans-serif;
}

article p {
  font-size: 13px;
  font-weight: 200;
}

hr {
  width: 5px;
}
</style>
