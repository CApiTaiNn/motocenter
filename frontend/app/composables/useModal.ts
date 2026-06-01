export const useModal = (key: string) => {
  const isOpen = useState(key, () => false)

  const open = () => {
    isOpen.value = true
  }
  const close = () => {
    isOpen.value = false
  }

  return { isOpen, open, close }
}
