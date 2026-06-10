<script setup lang="ts">
import CountUp from 'vue-countup-v3'

const props = defineProps<{
  urlImg: string
  // Text mode (e.g. "Base de données complètes")
  content?: string
  // Numeric mode: counts up to `value` (only once `started` is true)
  value?: number
  suffix?: string
  started?: boolean
}>()
</script>

<template>
  <div class="stat-card group relative flex aspect-square w-[20%] flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border-2 border-solid border-(--border-gray) text-center transition-transform duration-300 hover:-translate-y-1 max-lg:aspect-3/4! max-lg:min-w-0! max-lg:flex-1 max-lg:gap-2! max-lg:border-(--background-secondary)! max-lg:p-1">
    <!-- racing speed-lines backdrop + top "redline" accent -->
    <span class="stat-stripes" aria-hidden="true" />
    <span class="stat-redline" aria-hidden="true" />

    <img
      :src="props.urlImg"
      alt=""
      class="relative z-10 max-lg:h-auto max-lg:w-[40px]"
    />

    <p
      v-if="props.value !== undefined"
      class="relative z-10 flex flex-col items-center"
    >
      <span class="stat-number">
        <CountUp
          v-if="props.started"
          :end-val="props.value"
          :duration="3.5"
        />
        <span v-else>0</span>
      </span>
      <span class="stat-suffix">{{ props.suffix }}</span>
    </p>
    <p
      v-else
      class="stat-content relative z-10 max-lg:text-xs! max-lg:leading-tight"
    >
      {{ props.content }}
    </p>
  </div>
</template>

<style scoped>
/* Subtle brand wash so the card reads as a tinted "instrument" panel rather
   than a flat box. Layered over the page background token. */
.stat-card {
  background:
    linear-gradient(
      160deg,
      color-mix(in srgb, var(--ui-primary) 7%, transparent),
      transparent 55%
    ),
    var(--background);
}

.stat-card:hover {
  border-color: var(--ui-primary);
  box-shadow: 0 12px 30px -12px color-mix(in srgb, var(--ui-primary) 55%, transparent);
}

/* Diagonal racing speed-lines, fading in from the bottom so they don't fight
   the number. Pure decoration — no Tailwind equivalent for the repeating mask. */
.stat-stripes {
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    -60deg,
    transparent 0 13px,
    color-mix(in srgb, var(--ui-primary) 9%, transparent) 13px 15px
  );
  opacity: 0.55;
  -webkit-mask-image: linear-gradient(to top, black, transparent 72%);
  mask-image: linear-gradient(to top, black, transparent 72%);
  pointer-events: none;
}

/* Tachometer-style "redline" sweeping the top edge. */
.stat-redline {
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--ui-primary) 35%,
    var(--ui-primary) 65%,
    transparent
  );
}

/* Big italic, slightly tracked number with a red glow — the "speedometer". */
.stat-number {
  font-family: 'Poppins', sans-serif;
  font-style: italic;
  font-weight: 700;
  font-size: 2.5rem;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--text-color);
  text-shadow: 0 0 18px color-mix(in srgb, var(--ui-primary) 45%, transparent);
}

.stat-suffix {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ui-primary);
}

.stat-content {
  font-weight: 600;
}

@media (max-width: 1024px) {
  .stat-number {
    font-size: 1.5rem;
  }
  .stat-suffix {
    margin-top: 0.15rem;
    font-size: 0.625rem;
    letter-spacing: 0.12em;
  }
}
</style>
