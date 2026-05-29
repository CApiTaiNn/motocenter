<script setup lang="ts">
const appName: string = useRuntimeConfig().public.appName
</script>

<template>
  <header class="header">
    <div class="header-inner">
      <div class="brand">
        <span class="brand-label">{{ appName }}</span>
        <span class="brand-tag">BACK OFFICE</span>
      </div>
      <div class="user-area">
        <UIcon name="i-lucide-circle-user-round" class="user-icon" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  background: color-mix(in srgb, var(--ui-bg) 80%, transparent);
  backdrop-filter: blur(16px);
  border-bottom: var(--border-thin) solid color-mix(in srgb, var(--ui-border) 60%, transparent);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 64px;
}

/* Brand */
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-label {
  font-family: 'krona-one', sans-serif;
  font-size: 18px;
  letter-spacing: 0.08em;
  color: var(--text-color);
  text-transform: uppercase;
}

.brand-tag {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ui-primary);
  background: color-mix(in srgb, var(--ui-primary) 12%, transparent);
  border: var(--border-thin) solid color-mix(in srgb, var(--ui-primary) 30%, transparent);
  padding: 2px 7px;
  border-radius: 4px;
}

.user-area {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  position: relative;
}

.user-icon {
  width: 36px;
  height: 36px;
  color: var(--ui-text-muted);
  transition: color 0.2s;
}

.user-area:hover .user-icon {
  color: var(--text-color);
}
</style>
