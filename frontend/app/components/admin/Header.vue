<script setup lang="ts">
const appName: string = useRuntimeConfig().public.appName
</script>

<template>
  <header
    class="header sticky top-0 z-50 border-b backdrop-blur-lg"
  >
    <div
      class="mx-auto flex h-[64px] max-w-[1400px] items-center justify-between px-6"
    >
      <div class="flex items-center gap-3">
        <span
          class="font-['krona-one'] text-lg tracking-[0.08em] text-(--text-color) uppercase"
          >{{ appName }}</span
        >
        <span
          class="brand-tag rounded-[4px] border px-2 py-1 text-xs font-bold tracking-[0.2em] text-(--ui-primary) uppercase"
          >BACK OFFICE</span
        >
      </div>
      <div class="group relative flex cursor-pointer items-center gap-2">
        <UIcon
          name="i-lucide-circle-user-round"
          class="size-[36px] text-(--ui-text-muted) transition-colors duration-200 group-hover:text-(--text-color)"
        />
      </div>
    </div>
  </header>
</template>

<style scoped>
/* color-mix backgrounds/borders kept in scoped CSS — not expressible as tokens */
.header {
  background: color-mix(in srgb, var(--ui-bg) 80%, transparent);
  border-bottom-color: color-mix(in srgb, var(--ui-border) 60%, transparent);
}

.brand-tag {
  background: color-mix(in srgb, var(--ui-primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--ui-primary) 30%, transparent);
}
</style>
