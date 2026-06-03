<script setup lang="ts">
const appName: string = useRuntimeConfig().public.appName
</script>

<template>
  <header
    class="header sticky top-0 z-50 backdrop-blur-[16px] border-b border-b"
  >
    <div
      class="flex items-center justify-between max-w-[1400px] mx-auto px-6 h-[64px]"
    >
      <div class="flex items-center gap-3">
        <span
          class="font-['krona-one'] text-lg tracking-[0.08em] text-[var(--text-color)] uppercase"
          >{{ appName }}</span
        >
        <span
          class="brand-tag text-xs font-bold tracking-[0.2em] uppercase text-[var(--ui-primary)] py-1 px-2 rounded-[4px] border border"
          >BACK OFFICE</span
        >
      </div>
      <div class="group flex items-center gap-2 cursor-pointer relative">
        <UIcon
          name="i-lucide-circle-user-round"
          class="w-[36px] h-[36px] text-[var(--ui-text-muted)] transition-colors duration-200 group-hover:text-[var(--text-color)]"
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
