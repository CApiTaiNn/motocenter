<script setup lang="ts"></script>

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
        <article class="row max-lg:flex-col!">
          <p class="first-p max-lg:font-[var(--font-main)] max-lg:text-xs! max-lg:text-center max-lg:m-[2em]">
            <strong>Sloan Morgant</strong> a eu cette idée de projet en 2025 et
            il a créé notre équipe les Breizh Devs.<br /><br />
            Elle est composée de notre chef de projet :
            <strong>Sloan Morgant</strong>.<br /><br />
            De notre expert BDD : <strong>Loris Caruhel</strong>.<br /><br />
            Nos 2 devs : <strong>Léo Bruneau-Gache</strong> et
            <strong>Milio Lintanff-Castel</strong>.<br /><br />
            Et enfin notre stagiaire :
            <strong>Nominoë Barbotaud</strong>.
          </p>

          <img
            src="../assets/images/knowUs/Teamwork.png"
            alt="Image de travail d'équipe"
            class="max-lg:w-full max-lg:max-w-[500px]"
          />
        </article>
      </section>

      <section class="section">
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
</style>
