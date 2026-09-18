export interface NavItem {
  label: string
  to: string
}

// Primary navigation links, shared by the header (NavApp) and the footer
// (FooterApp) so the two menus stay in sync and cannot drift apart.
export const navItems: NavItem[] = [
  { label: 'Accueil', to: '/' },
  { label: 'Comparateur', to: '/comparo' },
  { label: 'Forum', to: '/forum' },
  { label: 'Balades', to: '/ride' },
  { label: 'Nous connaitre', to: '/knowUs' }
]
