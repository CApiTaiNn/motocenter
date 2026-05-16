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
        <p>Découvrez notre histoire et nos engagements</p>
      </template>
    </HeaderInfo>

    <div id="content" class="content">
      <h3 class="subtitle h3-mobile">En quelques mots</h3>
      <br />

      <section class="section">
        <article class="row">
          <p class="first-p">
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
          />
        </article>
      </section>

      <section class="section">
        <article class="row reverse">
          <img
            src="../assets/images/knowUs/Gsxr.png"
            alt="image du gsxr de Sloan"
          />
          <p class="second-p">
            <strong>MotoCenter</strong> vise à se positionner comme une
            plateforme centrale et cohérente, combinant l'aide au choix d'une moto
            et partage communautaire.
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

/* Mobile layout  */
@media (max-width: 1024px) {
  .row {
    flex-direction: column;
  }

  .row.reverse {
    flex-direction: column-reverse;
  }

  .row img {
    width: 100%;
    max-width: 500px;
  }
  .h3-mobile,
  .subtitle {
    font-family: 'Poppins', sans-serif;
    font-size: 16px;
    font-weight: 600;
    text-align: center;
  }
  p {
    font-family: 'Poppins', sans-serif;
    font-size: 12px;
    text-align: center;
  }
  .first-p {
    margin: 2em;
  }
}

strong {
  font-weight: bold;
}
</style>
