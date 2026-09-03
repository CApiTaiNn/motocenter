<script setup lang="ts">
import LogoApp from '~/components/LogoApp.vue'

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
    <div class="footer-top-border h-0.75" />

    <div class="footer-main flex justify-between items-start gap-8 pt-16 px-[5%] pb-12 max-w-350 mx-auto max-lg:flex-wrap! max-lg:pt-10! max-lg:px-[6%]! max-lg:pb-8! max-lg:gap-x-4! max-lg:gap-y-8!">
      <div class="flex-[1.2] flex flex-col items-start gap-3 max-lg:flex-[1_1_100%]! max-lg:items-center! max-lg:text-center">
        <LogoApp />
        <p class="footer-tagline text-sm font-light text-(--label-text)">La communauté des passionnés de moto</p>
      </div>

      <nav class="flex-1 flex flex-col items-start max-lg:flex-[1_1_45%]!">
        <h5 class="mb-4 uppercase tracking-[0.08em]">Guides</h5>
        <ul class="flex flex-col gap-2 list-none pl-0">
          <li
            v-for="(item, idx) in guides"
            :key="`guide-${idx}`"
          >
            <NuxtLink :to="item.to" class="footer-link text-sm font-light text-(--text-color) no-underline transition-colors duration-200 break-all hover:text-primary">{{
              item.label
            }}</NuxtLink>
          </li>
        </ul>
      </nav>

      <div class="flex-1 flex flex-col items-start max-lg:flex-[1_1_100%]! max-lg:order-4 max-lg:items-center!">
        <h5 class="text-hidden mb-4 uppercase tracking-[0.08em] max-lg:hidden">Réseaux sociaux</h5>
        <ul class="flex flex-col gap-3 list-none pl-0 max-lg:flex-row! max-lg:gap-6! max-lg:justify-center">
          <li v-for="(item, idx) in socials" :key="`social-${idx}`">
            <a
              :href="item.href"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`${item.label} (ouvre un nouvel onglet)`"
              class="footer-social-link flex items-center gap-2 text-(--text-color) no-underline transition-colors duration-200 hover:text-primary"
            >
              <UIcon :name="item.icon" class="text-xl shrink-0 max-lg:text-2xl!" />
              <span class="footer-social-label text-sm font-light max-lg:hidden">{{ item.label }}</span>
            </a>
          </li>
        </ul>
      </div>

      <div class="flex-1 flex flex-col items-start max-lg:flex-[1_1_45%]!">
        <h5 class="mb-4 uppercase tracking-[0.08em]">Contact</h5>
        <ul class="flex flex-col gap-2 list-none pl-0">
          <li>
            <a class="footer-link text-sm font-light text-(--text-color) no-underline transition-colors duration-200 break-all hover:text-primary" :href="`mailto:${contactEmail}`">{{
              contactEmail
            }}</a>
          </li>
        </ul>
      </div>
    </div>

    <div class="h-px bg-(--border-gray) max-w-350 mx-auto" />

    <div class="flex justify-between items-center py-4 px-[5%] max-w-350 mx-auto max-lg:flex-col! max-lg:gap-2! max-lg:text-center max-lg:py-4!">
      <p class="footer-bottom-text text-sm font-light text-(--label-text)">
        &copy; 2026 MotoCenter &mdash; Tout droit réservé
      </p>
      <div class="flex items-center gap-2">
        <NuxtLink class="footer-bottom-link text-sm font-light text-(--label-text) no-underline transition-colors duration-200 hover:text-primary" to="/">Mentions légales</NuxtLink>
        <span class="footer-bottom-dot text-(--label-text) text-sm">&middot;</span>
        <NuxtLink class="footer-bottom-link text-sm font-light text-(--label-text) no-underline transition-colors duration-200 hover:text-primary" to="/">Confidentialité</NuxtLink>
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
