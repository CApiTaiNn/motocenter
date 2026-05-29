<script setup lang="ts">
const team = [
  { name: 'Sloan Morgant', role: 'Chef de projet' },
  { name: 'Loris Caruhel', role: 'Expert BDD' },
  { name: 'Léo Bruneau-Gache', role: 'Développeur' },
  { name: 'Milio Lintanff-Castel', role: 'Développeur' },
  { name: 'Nominoë Barbotaud', role: 'Stagiaire' }
]
</script>

<template>
  <div class="page">
    <HeaderInfo :scroll-to-element-id="'content'">
      <template #title>
        <h1>
          À propos de <br />
          <span style="color: red">nous</span>
        </h1>
      </template>
      <template #subtitle>
        <p class="max-lg:text-xs! max-lg:text-center max-lg:font-[var(--font-main)]">Découvrez notre histoire et nos engagements</p>
      </template>
    </HeaderInfo>

    <div id="content" class="content">
      <h3 class="subtitle h3-mobile max-lg:font-[var(--font-main)] max-lg:text-base! max-lg:font-semibold max-lg:text-center">En quelques mots</h3>
      <br />

      <section class="section">
        <h4 class="section-label">L'équipe</h4>
        <article class="row max-lg:flex-col!">
          <div class="team-block">
            <p class="first-p max-lg:font-[var(--font-main)] max-lg:text-xs! max-lg:text-center max-lg:m-[2em]">
              <strong>Sloan Morgant</strong> a eu cette idée de projet en 2025 et
              il a créé notre équipe les <strong>Breizh Devs</strong>.
            </p>
            <div class="team-grid">
              <div v-for="member in team" :key="member.name" class="team-card">
                <UAvatar
                  :alt="member.name"
                  :ui="{ base: 'bg-(--ui-primary) text-white' }"
                  size="lg"
                >
                  {{ member.name.split(' ').map((p) => p[0]).join('') }}
                </UAvatar>
                <div class="team-info">
                  <p class="team-name">{{ member.name }}</p>
                  <p class="team-role">{{ member.role }}</p>
                </div>
              </div>
            </div>
          </div>

          <img
            src="../assets/images/knowUs/Teamwork.png"
            alt="Image de travail d'équipe"
            class="max-lg:w-full max-lg:max-w-[500px]"
          />
        </article>
      </section>

      <section class="section">
        <h4 class="section-label">La mission</h4>
        <article class="row reverse max-lg:flex-col-reverse!">
          <img
            src="../assets/images/knowUs/Gsxr.png"
            alt="image du gsxr de Sloan"
            class="max-lg:w-full max-lg:max-w-[500px]"
          />
          <p class="second-p max-lg:font-[var(--font-main)] max-lg:text-xs! max-lg:text-center">
            <strong>MotoCenter</strong> vise à se positionner comme une
            plateforme centrale et cohérente, combinant aide au choix d’une moto
            et partage communautaire. Afin de garantir la pertinence de ses
            choix fonctionnels et techniques, il est indispensable d’analyser
            les solutions existantes.
          </p>
        </article>
      </section>
    </div>
  </div>
</template>

<style scoped>
.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 100px;
}

.button-container {
  display: flex;
  justify-content: center;
  margin: 40px 0;
}

.content {
  max-width: 1000px;
  margin: auto;
  margin-top: 10dvh;
}

.subtitle {
  text-align: center;
  margin-bottom: 40px;
}

.section {
  margin-bottom: 60px;
}

.row {
  display: flex;
  align-items: center;
  gap: 40px;
}

.row img {
  width: 500px;
  height: auto;
}

.row p {
  flex: 1;
}

.second-p {
  width: 70dvw;
}

strong {
  font-weight: bold;
}

.section-label {
  font-family: 'Krona One', sans-serif;
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-gray-mid);
  margin-bottom: 1.5rem;
  padding-left: 0.5rem;
  border-left: 3px solid var(--ui-primary);
}

.team-block {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  flex: 1;
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
}

.team-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border: var(--border-thin) solid var(--color-gray-light);
  border-radius: var(--radius-md);
  background-color: var(--background);
}

.team-info {
  display: flex;
  flex-direction: column;
}

.team-name {
  font-weight: 600;
  font-size: 0.95rem;
  line-height: 1.2;
}

.team-role {
  color: var(--color-gray-mid);
  font-size: 0.8rem;
}
</style>
