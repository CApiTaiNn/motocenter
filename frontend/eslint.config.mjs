// @ts-check
import eslintConfigPrettier from 'eslint-config-prettier'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ignores: ['.nuxt.*/**']
  },
  {
    rules: {
      'no-console': ['error', { allow: ['error', 'warn'] }],
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    files: ['**/*.vue', '**/*.ts'],
    plugins: {
      'better-tailwindcss': betterTailwindcss
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: 'app/assets/css/main.css'
      }
    },
    rules: {
      ...betterTailwindcss.configs['recommended-error'].rules,
      // Class-list line wrapping is a formatting concern; leave it to Prettier.
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
      'better-tailwindcss/enforce-shorthand-classes': 'error',
      // Scoped-CSS classes that can't be expressed as utilities (CLAUDE.md):
      // @keyframes hooks, ::before/::after, :deep() targets, state combinators.
      'better-tailwindcss/no-unknown-classes': [
        'error',
        {
          ignore: [
            // @keyframes animation hooks
            '^spinner$',
            '^loader-icon$',
            '^bar-value$',
            '^bar-fill$',
            '^tab-panel$',
            '^scroll-cue$',
            '^moto-(left|right)$',
            '^carousel$',
            '^inner$',
            '^carb-anim$',
            '^air(-[1-5])?$',
            '^fuel(-[1-4])?$',
            // state classes toggled at runtime, styled via combinators
            '^is-(open|fullscreen)$',
            '^sidebar$',
            '^map-container$',
            '^progress-dot$',
            '^experience-button$',
            '^stepper-(item|bullet)$',
            // :deep() / child-combinator targets and complex selectors
            '^invisible-background$',
            '^button$',
            '^filters$',
            '^invitation$',
            '^skeleton-icon$',
            '^theme-toggle-button$',
            // gradient / color-mix() backgrounds with no utility equivalent
            '^hero-glow$',
            '^ambient-glow(--(left|right))?$',
            '^band$',
            // home RideSection + StatsHome scoped decoration (gradients,
            // ::before redline, keyframe-driven number reveal)
            '^route-card$',
            '^marker$',
            '^label$',
            '^stat-(card|stripes|redline|number|suffix|content)$',
            '^header$',
            '^brand-tag$',
            '^footer-(top-border|tagline|link|social-label|bottom-text|bottom-link)$'
          ]
        }
      ]
    }
  },
  eslintConfigPrettier
)
