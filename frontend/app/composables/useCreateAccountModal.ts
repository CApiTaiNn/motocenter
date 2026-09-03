import { useConnexionModal } from './useConnexionModal'

export const useCreateAccountModal = () => {
  const modal = useModal('CreateAccountModal.isOpen')

  const openConnexionModal = () => {
    modal.close()
    useConnexionModal().open()
  }

  return { ...modal, openConnexionModal }
}
