import { useCreateAccountModal } from './useCreateAccountModal'

export const useConnexionModal = () => {
  const modal = useModal('connexionModal.isOpen')

  const openCreateAccountModal = () => {
    modal.close()
    useCreateAccountModal().open()
  }

  return { ...modal, openCreateAccountModal }
}
