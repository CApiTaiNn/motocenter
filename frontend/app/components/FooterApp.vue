<script setup lang="ts">
import LogoApp from '~/components/LogoApp.vue'

// Site name from runtime config (override in prod with NUXT_PUBLIC_APP_NAME).
const appName = useRuntimeConfig().public.appName

const guides = [
  { label: 'Accueil', to: '/' },
  { label: 'Comparateur', to: '/comparo' },
  { label: 'Forum', to: '/forum' },
  { label: 'Balades', to: '/ride' },
  { label: 'Nous connaitre', to: '/knowUs' }
]

const socials = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com',
    icon: 'i-lucide-instagram'
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com',
    icon: 'i-lucide-facebook'
  },
  {
    label: 'Youtube',
    href: 'https://www.youtube.com',
    icon: 'i-lucide-youtube'
  },
  {
    label: 'Linkedin',
    href: 'https://www.linkedin.com',
    icon: 'i-lucide-linkedin'
  },
  { label: 'X', href: 'https://www.x.com', icon: 'i-simple-icons-x' }
]

const contactEmail = 'contact@mgtsoftware.com'
</script>

<template>
  <footer class="mt-20">
    <div class="footer-top-border h-[3px]" />

    <div class="mx-auto flex max-w-[1400px] items-start justify-between gap-8 px-[5%] pt-16 pb-12 max-lg:flex-wrap! max-lg:gap-x-4! max-lg:gap-y-8! max-lg:px-[6%]! max-lg:pt-10! max-lg:pb-8!">
      <div class="flex flex-[1.2] flex-col items-start gap-3 max-lg:flex-[1_1_100%]! max-lg:items-center! max-lg:text-center">
        <LogoApp />
        <p class="footer-tagline text-sm font-light text-(--label-text)">La communauté des passionnés de moto</p>
      </div>

      <nav class="flex flex-1 flex-col items-start max-lg:flex-[1_1_45%]!">
        <h5 class="mb-4 tracking-[0.08em] uppercase">Guides</h5>
        <ul class="flex list-none flex-col gap-2 pl-0">
          <li
            v-for="(item, idx) in guides"
            :key="`guide-${idx}`"
          >
            <NuxtLink :to="item.to" class="footer-link text-sm font-light break-all text-(--text-color) no-underline transition-colors duration-200 hover:text-(--ui-primary)">{{
              item.label
            }}</NuxtLink>
          </li>
        </ul>
      </nav>

      <div class="flex flex-1 flex-col items-start max-lg:order-4 max-lg:flex-[1_1_100%]! max-lg:items-center!">
        <h5 class="mb-4 tracking-[0.08em] uppercase max-lg:hidden">Réseaux sociaux</h5>
        <ul class="flex list-none flex-col gap-3 pl-0 max-lg:flex-row! max-lg:justify-center max-lg:gap-6!">
          <li v-for="(item, idx) in socials" :key="`social-${idx}`">
            <a
              :href="item.href"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`${item.label} (ouvre un nouvel onglet)`"
              class="flex items-center gap-2 text-(--text-color) no-underline transition-colors duration-200 hover:text-(--ui-primary)"
            >
              <UIcon :name="item.icon" class="shrink-0 text-xl max-lg:text-2xl!" />
              <span class="footer-social-label text-sm font-light max-lg:hidden">{{ item.label }}</span>
            </a>
          </li>
        </ul>
      </div>

      <div class="flex flex-1 flex-col items-start max-lg:flex-[1_1_45%]!">
        <h5 class="mb-4 tracking-[0.08em] uppercase">Contact</h5>
        <ul class="flex list-none flex-col gap-2 pl-0">
          <li>
            <a class="footer-link text-sm font-light break-all text-(--text-color) no-underline transition-colors duration-200 hover:text-(--ui-primary)" :href="`mailto:${contactEmail}`">{{
              contactEmail
            }}</a>
          </li>
        </ul>
      </div>
    </div>

    <div class="mx-auto h-px max-w-[1400px] bg-(--border-gray)" />

    <div class="mx-auto flex max-w-[1400px] items-center justify-between px-[5%] py-4 max-lg:flex-col! max-lg:gap-2! max-lg:py-4! max-lg:text-center">
      <p class="footer-bottom-text text-sm font-light text-(--label-text)">
        &copy; 2026 {{ appName }} &mdash; Tous droits réservés
      </p>
      <div class="flex items-center gap-2">
        <NuxtLink class="footer-bottom-link text-sm font-light text-(--label-text) no-underline transition-colors duration-200 hover:text-(--ui-primary)" to="/legal/mentions-legales">Mentions légales</NuxtLink>
        <span class="text-sm text-(--label-text)">&middot;</span>
        <NuxtLink class="footer-bottom-link text-sm font-light text-(--label-text) no-underline transition-colors duration-200 hover:text-(--ui-primary)" to="/legal/confidentialite">Confidentialité</NuxtLink>
        <span class="text-sm text-(--label-text)">&middot;</span>
        <NuxtLink class="footer-bottom-link text-sm font-light text-(--label-text) no-underline transition-colors duration-200 hover:text-(--ui-primary)" to="/legal/cgu">CGU</NuxtLink>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* Gradient with no design token — kept as scoped CSS */
.footer-top-border {
  background: linear-gradient(
    90deg,
    transparent,
    var(--ui-primary),
    transparent
  );
}

/* font-family is a literal 'Poppins' stack with no matching token */
.footer-tagline,
.footer-link,
.footer-social-label,
.footer-bottom-text,
.footer-bottom-link {
  font-family: 'Poppins', sans-serif;
}
</style>
