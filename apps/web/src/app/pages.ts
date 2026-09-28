import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type Loader<T = unknown> = () => Promise<{ default: ComponentType<T> }>;

/** Route chunk with a preload() helper (hover prefetch). */
function page<T = unknown>(load: Loader<T>): LazyExoticComponent<ComponentType<T>> & { preload: Loader<T> } {
  const component = lazy(load) as LazyExoticComponent<ComponentType<T>> & { preload: Loader<T> };
  component.preload = load;
  return component;
}

/** Lazily loaded route chunks. `pages.x.preload()` warms a chunk (hover prefetch). */
export const pages = {
  home: page(() => import('../pages/HomePage')),
  catalog: page(() => import('../pages/CatalogPage')),
  category: page(() => import('../pages/CategoryPage')),
  product: page(() => import('../pages/ProductPage')),
  search: page(() => import('../pages/SearchPage')),
  brands: page(() => import('../pages/BrandsPage')),
  brand: page(() => import('../pages/BrandPage')),
  promotions: page(() => import('../pages/PromotionsPage')),
  promotion: page(() => import('../pages/PromotionPage')),
  cart: page(() => import('../pages/CartPage')),
  checkout: page(() => import('../pages/CheckoutPage')),
  checkoutSuccess: page(() => import('../pages/CheckoutSuccessPage')),
  wishlist: page(() => import('../pages/WishlistPage')),
  compare: page(() => import('../pages/ComparePage')),
  login: page(() => import('../pages/auth/LoginPage')),
  register: page(() => import('../pages/auth/RegisterPage')),
  forgot: page(() => import('../pages/auth/ForgotPasswordPage')),
  reset: page(() => import('../pages/auth/ResetPasswordPage')),
  verifyEmail: page(() => import('../pages/auth/VerifyEmailPage')),
  accountLayout: page(() => import('../pages/account/AccountLayout')),
  profile: page(() => import('../pages/account/ProfilePage')),
  orders: page(() => import('../pages/account/OrdersPage')),
  order: page(() => import('../pages/account/OrderPage')),
  addresses: page(() => import('../pages/account/AddressesPage')),
  notifications: page(() => import('../pages/account/NotificationsPage')),
  myReviews: page(() => import('../pages/account/MyReviewsPage')),
  settings: page(() => import('../pages/account/SettingsPage')),
  content: page<{ slug: string }>(() => import('../pages/ContentPage')),
  contacts: page(() => import('../pages/ContactsPage')),
  faq: page(() => import('../pages/FaqPage')),
};

