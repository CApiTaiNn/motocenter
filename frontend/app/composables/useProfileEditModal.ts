import { useProfileModal } from '~/composables/useProfileModal'

export const useProfileEditModal = () => {
  const modal = useModal('profileEditModal.isOpen')

  const open = () => {
    useProfileModal().close()
    modal.open()
  }

  return { ...modal, open }
}
