<script setup lang="ts">
// Reusable share action for detail pages. Prefers the native share sheet when
// the browser offers it (mainly mobile), and otherwise copies the current URL
// to the clipboard and confirms with a toast.
const props = defineProps<{
  // Passed to the native share sheet as the shared title.
  title?: string
}>()

const toast = useToast()

const share = async () => {
  const url = window.location.href

  // navigator.share only exists in secure contexts, mostly on mobile.
  if (navigator.share) {
    try {
      await navigator.share({ title: props.title, url })
      return
    } catch {
      // The user cancelled the share sheet, or it is unavailable: fall back to
      // copying the link instead of failing silently.
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    toast.add({
      title: 'Lien copié',
      description: 'Le lien a été copié dans le presse-papiers.',
      color: 'success'
    })
  } catch {
    toast.add({
      title: 'Erreur',
      description: "Le lien n'a pas pu être copié.",
      color: 'error'
    })
  }
}
</script>

<template>
  <UButton
    icon="i-lucide-share-2"
    color="neutral"
    variant="ghost"
    aria-label="Partager"
    class="cursor-pointer"
    @click="share"
  />
</template>
