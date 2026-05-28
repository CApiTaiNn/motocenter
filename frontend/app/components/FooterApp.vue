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
  <footer class="footer-wrapper">
    <div class="footer-top-border" />

    <div class="footer-main max-lg:flex-wrap! max-lg:pt-[2.5rem]! max-lg:px-[6%]! max-lg:pb-[2rem]! max-lg:gap-x-4! max-lg:gap-y-8!">
      <div class="footer-logo max-lg:flex-[1_1_100%]! max-lg:items-center! max-lg:text-center">
        <LogoApp />
        <p class="footer-tagline">La communauté des passionnés de moto</p>
      </div>

      <nav class="footer-col max-lg:flex-[1_1_45%]!">
        <h5 class="footer-heading">Guides</h5>
        <ul class="footer-list">
          <li
            v-for="(item, idx) in guides"
            :key="`guide-${idx}`"
            class="footer-list-item"
          >
            <NuxtLink :to="item.to" class="footer-link">{{
              item.label
            }}</NuxtLink>
          </li>
        </ul>
      </nav>

      <div class="footer-col max-lg:flex-[1_1_100%]! max-lg:order-4 max-lg:items-center!">
        <h5 class="footer-heading text-hidden max-lg:hidden">Réseaux sociaux</h5>
        <ul class="footer-list footer-socials-list max-lg:flex-row! max-lg:gap-6! max-lg:justify-center">
          <li v-for="(item, idx) in socials" :key="`social-${idx}`">
            <a
              :href="item.href"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`${item.label} (ouvre un nouvel onglet)`"
              class="footer-social-link"
            >
              <UIcon :name="item.icon" class="footer-social-icon max-lg:text-[26px]!" />
              <span class="footer-social-label max-lg:hidden">{{ item.label }}</span>
            </a>
          </li>
        </ul>
      </div>

      <div class="footer-col max-lg:flex-[1_1_45%]!">
        <h5 class="footer-heading">Contact</h5>
        <ul class="footer-list">
          <li class="footer-list-item">
            <a class="footer-link" :href="`mailto:${contactEmail}`">{{
              contactEmail
            }}</a>
          </li>
        </ul>
      </div>
    </div>

    <div class="footer-separator" />

    <div class="footer-bottom max-lg:flex-col! max-lg:gap-2! max-lg:text-center max-lg:py-4!">
      <p class="footer-bottom-text">
        &copy; 2026 MotoCenter &mdash; Tout droit réservé
      </p>
      <div class="footer-bottom-links">
        <NuxtLink class="footer-bottom-link" to="/">Mentions légales</NuxtLink>
        <span class="footer-bottom-dot">&middot;</span>
        <NuxtLink class="footer-bottom-link" to="/">Confidentialité</NuxtLink>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* ── Footer wrapper ── */
.footer-wrapper {
  margin-top: 5rem;
}

.footer-top-border {
  height: 3px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--ui-primary),
    transparent
  );
}

/* ── Main grid ── */
.footer-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  padding: 3.5rem 5% 2.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* ── Logo column ── */
.footer-logo {
  flex: 1.2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.8rem;
}

.footer-tagline {
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 300;
  color: var(--label-text);
}

/* ── Content columns ── */
.footer-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.footer-heading {
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* ── Lists ── */
.footer-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  list-style: none;
  padding-left: 0;
}

.footer-link {
  font-family: 'Poppins', sans-serif;
  font-size: 15px;
  font-weight: 300;
  color: var(--text-color);
  text-decoration: none;
  transition: color 0.2s ease;
  word-break: break-all;
}

.footer-link:hover {
  color: var(--ui-primary);
}

/* ── Social links ── */
.footer-socials-list {
  gap: 0.75rem;
}

.footer-social-link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--text-color);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-social-link:hover {
  color: var(--ui-primary);
}

.footer-social-icon {
  font-size: 22px;
  flex-shrink: 0;
}

.footer-social-label {
  font-family: 'Poppins', sans-serif;
  font-size: 15px;
  font-weight: 300;
}

/* ── Separator ── */
.footer-separator {
  height: 1px;
  background-color: var(--border-gray);
  margin: 0 5%;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
}

/* ── Bottom bar ── */
.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 5%;
  max-width: 1400px;
  margin: 0 auto;
}

.footer-bottom-text {
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 300;
  color: var(--label-text);
}

.footer-bottom-links {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.footer-bottom-link {
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 300;
  color: var(--label-text);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-bottom-link:hover {
  color: var(--ui-primary);
}

.footer-bottom-dot {
  color: var(--label-text);
  font-size: 13px;
}

</style>
