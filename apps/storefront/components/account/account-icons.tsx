export type AccountIconName =
  | 'orders'
  | 'wishlist'
  | 'messages'
  | 'reviews'
  | 'profile'
  | 'addresses'
  | 'payments'
  | 'support'
  | 'logout'
  | 'menu'
  | 'close'
  | 'box'
  | 'edit'
  | 'trash'
  | 'plus'
  | 'cart'
  | 'search'
  | 'warning';

const paths: Record<AccountIconName, React.ReactNode> = {
  orders: <><path d="M6 3h12l1 18H5L6 3Z" /><path d="M9 7a3 3 0 0 0 6 0M8.5 13h7M8.5 17h5" /></>,
  wishlist: <path d="M20.2 5.1a5.4 5.4 0 0 0-7.6 0l-.6.6-.6-.6a5.4 5.4 0 0 0-7.6 7.6L12 20.9l8.2-8.2a5.4 5.4 0 0 0 0-7.6Z" />,
  messages: <><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><path d="M7.5 9.5h9M7.5 13h6" /></>,
  reviews: <path d="m12 3 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7L6.8 19l1-5.8L3.6 9.1l5.8-.8L12 3Z" />,
  profile: <><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
  addresses: <><path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
  payments: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 10h18M7 15h4" /></>,
  support: <><path d="M5 13a7 7 0 0 1 14 0v2a3 3 0 0 1-3 3h-2" /><path d="M5 13v3a2 2 0 0 0 2 2h1v-7H7a2 2 0 0 0-2 2ZM19 13v3a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2ZM10.5 20h3" /></>,
  logout: <><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="m14 8 4 4-4 4M18 12H9" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  box: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>,
  edit: <><path d="m4 16.5-.5 4 4-.5L19 8.5 15.5 5 4 16.5Z" /><path d="m14.5 6 3.5 3.5" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14" /><path d="M9 7V4h6v3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  cart: <><path d="M4 5h2l2 11h9l2-8H8" /><circle cx="10" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
  warning: <><path d="M12 4 3 20h18L12 4Z" /><path d="M12 10v4M12 17h.01" /></>,
};

export function AccountIcon({ name }: { name: AccountIconName }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
