<script setup lang="ts">
useSeoMeta({
  title: 'Politique de confidentialité',
  description: 'Comment Vroom collecte et protège vos données personnelles.'
})
</script>

<template>
  <LegalPage title="Politique de confidentialité" updated="21 août 2026">
    <p>
      Cette politique explique quelles données nous collectons, pourquoi, et
      quels sont vos droits. Elle respecte le Règlement général sur la protection
      des données (RGPD).
    </p>

    <h2>1. Responsable du traitement</h2>
    <p>
      Le responsable du traitement est [À COMPLÉTER : raison sociale], joignable à
      <a href="mailto:contact@mgtsoftware.com">contact@mgtsoftware.com</a>.
    </p>

    <h2>2. Données que nous collectons</h2>
    <ul>
      <li>données de compte : nom, prénom, pseudo, email, mot de passe (haché)</li>
      <li>profil : photo, type de conduite, année de début, moto</li>
      <li>contenus que vous publiez : messages du forum, avis, balades</li>
      <li>données techniques : adresse IP, journaux de connexion</li>
    </ul>

    <h2>3. Finalités et bases légales</h2>
    <ul>
      <li>gérer votre compte et l'accès au service (exécution du contrat)</li>
      <li>afficher vos contenus sur le site (exécution du contrat)</li>
      <li>assurer la sécurité et prévenir les abus (intérêt légitime)</li>
      <li>vous envoyer un email de confirmation à l'inscription (exécution du contrat)</li>
    </ul>

    <h2>4. Destinataires</h2>
    <p>
      Vos données sont accessibles à l'équipe du site et à nos prestataires
      techniques : hébergement (Vercel, Render), base de données (MongoDB),
      stockage des images (Supabase) et envoi d'emails (Resend). Nous ne vendons
      pas vos données.
    </p>

    <h2>5. Durée de conservation</h2>
    <p>
      Nous conservons vos données tant que votre compte est actif. Après
      suppression du compte, elles sont effacées ou anonymisées sous
      [À COMPLÉTER : durée], sauf obligation légale de conservation.
    </p>

    <h2>6. Cookies</h2>
    <p>
      Nous utilisons un cookie strictement nécessaire pour vous garder connecté
      (le jeton d'authentification). Il ne sert pas au suivi publicitaire. Si
      nous ajoutons des cookies de mesure d'audience, nous vous demanderons votre
      consentement au préalable.
    </p>

    <h2>7. Vos droits</h2>
    <p>Vous disposez des droits suivants sur vos données :</p>
    <ul>
      <li>accès, rectification et effacement</li>
      <li>limitation et opposition au traitement</li>
      <li>portabilité de vos données</li>
    </ul>
    <p>
      Pour les exercer, écrivez à
      <a href="mailto:contact@mgtsoftware.com">contact@mgtsoftware.com</a>. Vous
      pouvez aussi déposer une réclamation auprès de la CNIL (www.cnil.fr).
    </p>

    <h2>8. Sécurité</h2>
    <p>
      Les mots de passe sont hachés et jamais stockés en clair. Les échanges avec
      le site sont chiffrés (HTTPS). Nous appliquons des mesures raisonnables pour
      protéger vos données.
    </p>
  </LegalPage>
</template>
