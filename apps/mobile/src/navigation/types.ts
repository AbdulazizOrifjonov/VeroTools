import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProductListParams } from '@vero/types';

/** What a product list shows: a fixed scope (category / brand / promotion / search) plus preset filters. */
export interface ListingParams {
  category?: string;
  brand?: string;
  promotion?: string;
  q?: string;
  /** preset flags from "see all" of a home rail (featured, isNew, bestseller, discounted, sort) */
  preset?: Pick<ProductListParams, 'featured' | 'isNew' | 'bestseller' | 'discounted' | 'sort'>;
  /** initial filters from a link query string (/catalog/drills?brand=x&discounted=1) */
  initial?: ProductListParams;
  /** header title shown before the scope has loaded */
  title?: string;
}

export type OrdersFilter = 'all' | 'active' | 'completed' | 'cancelled';

export type HomeStackParamList = {
  Home: undefined;
  ProductList: ListingParams;
  Promotions: undefined;
  Brands: undefined;
};

export type CatalogStackParamList = {
  Catalog: undefined;
  Category: { slug: string; title?: string };
  ProductList: ListingParams;
};

export type CartStackParamList = { Cart: undefined };

export type WishlistStackParamList = { Wishlist: undefined };

export type ProfileStackParamList = {
  Profile: undefined;
  Orders: { status?: OrdersFilter } | undefined;
  Addresses: undefined;
  AddressForm: { id?: string } | undefined;
  Notifications: undefined;
  MyReviews: undefined;
  Settings: undefined;
  ChangePassword: undefined;
  EditProfile: undefined;
  VerifyPhone: undefined;
  Help: undefined;
  Faq: undefined;
  Page: { slug: string; title?: string };
  Contacts: undefined;
};

export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  CatalogTab: NavigatorScreenParams<CatalogStackParamList> | undefined;
  CartTab: NavigatorScreenParams<CartStackParamList> | undefined;
  WishlistTab: NavigatorScreenParams<WishlistStackParamList> | undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

/** After signing in: go back (default) or continue to checkout. */
export type AuthNext = 'back' | 'Checkout';

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Product: { slug: string; variant?: string; review?: boolean };
  ProductList: ListingParams;
  Search: { q?: string } | undefined;
  Compare: undefined;
  Checkout: undefined;
  CheckoutSuccess: { orderId: string };
  Order: { id: string };
  Login: { next?: AuthNext } | undefined;
  Register: { next?: AuthNext } | undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string; phone?: string } | undefined;
  VerifyEmail: { token?: string } | undefined;
  Gallery: { slug: string; index?: number; variantId?: string };
  /** productId / name are optional so the screen also opens from a link (product/:slug/reviews) */
  Reviews: { slug: string; productId?: string; name?: string };
  WriteReview: { productId: string; slug: string; name: string };
  Questions: { productId: string; name: string };
  Page: { slug: string; title?: string };
  Faq: undefined;
  Contacts: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
