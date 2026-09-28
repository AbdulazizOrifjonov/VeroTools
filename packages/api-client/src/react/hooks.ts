import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { LIMITS } from '@vero/config';
import type {
  BannerPlacement,
  CartDTO,
  EngagementState,
  OrderDetail,
  ProductListParams,
  UserDTO,
} from '@vero/types';
import type {
  AddToCartInput,
  AddressInput,
  ChangePasswordInput,
  CheckoutInput,
  CheckoutQuoteInput,
  ContactMessageFormInput,
  CreateQuestionInput,
  CreateReviewInput,
  ForgotPasswordInput,
  LoginInput,
  PreferencesInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from '@vero/validation';
import { ApiError } from '../client';
import { qk } from './keys';
import { useApi, useApiLanguage, useSession } from './context';

const MIN = 60_000;

/** Reset everything tied to the previous user/guest session and refetch it. */
export async function resetSessionQueries(qc: QueryClient) {
  qc.removeQueries({ queryKey: qk.session });
  await qc.invalidateQueries({ queryKey: qk.session });
}

/* =================================================================== */
/* Public catalogue                                                     */
/* =================================================================== */

export function useHome() {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({ queryKey: qk.home(l), queryFn: () => api.catalog.home(), staleTime: 2 * MIN });
}

export function useSettings() {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({ queryKey: qk.settings(l), queryFn: () => api.catalog.settings(), staleTime: 10 * MIN });
}

export function useCategories() {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({ queryKey: qk.categories(l), queryFn: () => api.catalog.categories(), staleTime: 10 * MIN });
}

export function useCategory(slug: string | undefined) {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({
    queryKey: qk.category(slug ?? '', l),
    queryFn: () => api.catalog.category(slug!),
    enabled: !!slug,
    staleTime: 5 * MIN,
  });
}

export function useBrands(params?: { q?: string; page?: number; limit?: number }) {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({ queryKey: qk.brands(params, l), queryFn: () => api.catalog.brands(params), staleTime: 10 * MIN });
}

export function useBrand(slug: string | undefined) {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({ queryKey: qk.brand(slug ?? '', l), queryFn: () => api.catalog.brand(slug!), enabled: !!slug, staleTime: 10 * MIN });
}

/** Paged product list (keeps the previous page visible while the next one loads). */
export function useProducts(params: ProductListParams, options: { enabled?: boolean } = {}) {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({
    queryKey: qk.products(params, l),
    queryFn: ({ signal }) => api.catalog.products(params, signal),
    placeholderData: keepPreviousData,
    staleTime: MIN,
    enabled: options.enabled ?? true,
  });
}

/** Infinite product list (mobile / "show more"). */
export function useInfiniteProducts(params: ProductListParams, options: { enabled?: boolean } = {}) {
  const api = useApi();
  const l = useApiLanguage();
  const limit = params.limit ?? LIMITS.pageSizeDefault;
  return useInfiniteQuery({
    queryKey: qk.productsInfinite({ ...params, page: undefined, limit }, l),
    queryFn: ({ pageParam, signal }) => api.catalog.products({ ...params, page: pageParam, limit }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined),
    staleTime: MIN,
    enabled: options.enabled ?? true,
  });
}

export function useFacets(params: ProductListParams, options: { enabled?: boolean } = {}) {
  const api = useApi();
  const l = useApiLanguage();
  const key = { ...params, page: undefined, limit: undefined, sort: undefined };
  return useQuery({
    queryKey: qk.facets(key, l),
    queryFn: ({ signal }) => api.catalog.facets(key, signal),
    placeholderData: keepPreviousData,
    staleTime: 2 * MIN,
    enabled: options.enabled ?? true,
  });
}

export function useProduct(slug: string | undefined) {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({
    queryKey: qk.product(slug ?? '', l),
    queryFn: () => api.catalog.product(slug!),
    enabled: !!slug,
    staleTime: MIN,
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  });
}

export function useRelatedProducts(productId: string | undefined) {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({
    queryKey: qk.related(productId ?? '', l),
    queryFn: () => api.catalog.related(productId!),
    enabled: !!productId,
    staleTime: 5 * MIN,
  });
}

export function useProductsByIds(ids: string[]) {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({
    queryKey: qk.productsByIds(ids, l),
    queryFn: async () => (await api.catalog.byIds(ids)).items,
    enabled: ids.length > 0,
    staleTime: MIN,
  });
}

/** Debounce the query string in the component (useDebouncedValue) before passing it here. */
export function useSearchSuggestions(q: string) {
  const api = useApi();
  const l = useApiLanguage();
  const query = q.trim();
  return useQuery({
    queryKey: qk.suggest(query.toLowerCase(), l),
    queryFn: ({ signal }) => api.catalog.suggest(query, signal),
    enabled: query.length >= 2,
    staleTime: MIN,
    placeholderData: keepPreviousData,
  });
}

export function usePopularSearches() {
  const api = useApi();
  return useQuery({ queryKey: qk.popularSearches(), queryFn: () => api.catalog.popularSearches(), staleTime: 30 * MIN });
}

export function useProductReviews(
  productId: string | undefined,
  params: { page?: number; limit?: number; sort?: string; rating?: number; withPhotos?: boolean } = {},
) {
  const api = useApi();
  return useQuery({
    queryKey: qk.reviews(productId ?? '', params),
    queryFn: () => api.catalog.reviews(productId!, params),
    enabled: !!productId,
    placeholderData: keepPreviousData,
  });
}

export function useProductQuestions(productId: string | undefined, params: { page?: number; limit?: number } = {}) {
  const api = useApi();
  return useQuery({
    queryKey: qk.questions(productId ?? '', params),
    queryFn: () => api.catalog.questions(productId!, params),
    enabled: !!productId,
  });
}

export function useBanners(placement: BannerPlacement) {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({ queryKey: qk.banners(placement, l), queryFn: () => api.catalog.banners(placement), staleTime: 5 * MIN });
}

export function usePromotions() {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({ queryKey: qk.promotions(l), queryFn: () => api.catalog.promotions(), staleTime: 5 * MIN });
}

export function usePromotion(slug: string | undefined) {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({ queryKey: qk.promotion(slug ?? '', l), queryFn: () => api.catalog.promotion(slug!), enabled: !!slug });
}

export function usePage(slug: string | undefined) {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({ queryKey: qk.page(slug ?? '', l), queryFn: () => api.catalog.page(slug!), enabled: !!slug, staleTime: 10 * MIN });
}

export function useFaq() {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({ queryKey: qk.faq(l), queryFn: () => api.catalog.faq(), staleTime: 10 * MIN });
}

export function usePickupPoints() {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({ queryKey: qk.pickupPoints(l), queryFn: () => api.delivery.pickupPoints(), staleTime: 10 * MIN });
}

export function useContactMessage() {
  const api = useApi();
  return useMutation({ mutationFn: (input: ContactMessageFormInput) => api.catalog.contact(input) });
}

/* =================================================================== */
/* Auth & account                                                       */
/* =================================================================== */

export function useMe(options: Partial<UseQueryOptions<UserDTO>> = {}) {
  const api = useApi();
  const { isAuthenticated } = useSession();
  return useQuery({ queryKey: qk.me(), queryFn: () => api.auth.me(), enabled: isAuthenticated, staleTime: 5 * MIN, ...options });
}

export function useLogin() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.auth.login(input),
    onSuccess: async (res) => {
      await resetSessionQueries(qc);
      qc.setQueryData(qk.me(), res.user);
    },
  });
}

export function useRegister() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => api.auth.register(input),
    onSuccess: async (res) => {
      await resetSessionQueries(qc);
      qc.setQueryData(qk.me(), res.user);
    },
  });
}

export function useLogout() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.auth.logout(),
    onSettled: async () => {
      qc.removeQueries({ queryKey: qk.admin.all });
      await resetSessionQueries(qc);
    },
  });
}

export function useForgotPassword() {
  const api = useApi();
  return useMutation({ mutationFn: (input: ForgotPasswordInput) => api.auth.forgotPassword(input) });
}

export function useResetPassword() {
  const api = useApi();
  return useMutation({ mutationFn: (input: ResetPasswordInput) => api.auth.resetPassword(input) });
}

/** Confirms an e-mail address with the token from the verification link. */
export function useVerifyEmail() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => api.auth.verifyEmail(token),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.me() }),
  });
}

/** Sends a new verification link to the signed-in user's e-mail. */
export function useRequestEmailVerification() {
  const api = useApi();
  return useMutation({ mutationFn: () => api.auth.requestEmailVerification() });
}

/** Sends an SMS code (phone verification). Resolves with the resend cooldown in seconds. */
export function useSendOtp() {
  const api = useApi();
  return useMutation({
    mutationFn: (input: { phone: string; purpose?: 'verify_phone' | 'reset_password' }) => api.auth.sendOtp(input.phone, input.purpose),
  });
}

/** Verifies the SMS code; the profile is refetched so `isPhoneVerified` updates everywhere. */
export function useVerifyOtp() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof api.auth.verifyOtp>[0]) => api.auth.verifyOtp(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.me() }),
  });
}

export function useUpdateProfile() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.account.updateProfile(input),
    onSuccess: (user) => qc.setQueryData(qk.me(), user),
  });
}

export function useUpdatePreferences() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PreferencesInput) => api.account.updatePreferences(input),
    onSuccess: (user) => qc.setQueryData(qk.me(), user),
  });
}

export function useChangePassword() {
  const api = useApi();
  return useMutation({ mutationFn: (input: ChangePasswordInput) => api.account.changePassword(input) });
}

export function useUploadAvatar() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: Blob | { uri: string; name: string; type: string }) => api.account.uploadAvatar(file),
    onSuccess: (user) => qc.setQueryData(qk.me(), user),
  });
}

export function useRemoveAvatar() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api.account.removeAvatar(), onSuccess: (user) => qc.setQueryData(qk.me(), user) });
}

export function useMyReviews() {
  const api = useApi();
  const l = useApiLanguage();
  const { isAuthenticated } = useSession();
  return useQuery({ queryKey: qk.myReviews(l), queryFn: () => api.account.myReviews(), enabled: isAuthenticated });
}

export function useAddresses() {
  const api = useApi();
  const { isAuthenticated } = useSession();
  return useQuery({ queryKey: qk.addresses(), queryFn: () => api.addresses.list(), enabled: isAuthenticated });
}

export function useSaveAddress() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: AddressInput }) =>
      id ? api.addresses.update(id, input) : api.addresses.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.addresses() }),
  });
}

export function useDeleteAddress() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.addresses.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.addresses() }),
  });
}

export function useSetDefaultAddress() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.addresses.setDefault(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.addresses() }),
  });
}

/* =================================================================== */
/* Engagement (badges), cart, wishlist, compare                         */
/* =================================================================== */

export function useEngagement() {
  const api = useApi();
  const { isReady } = useSession();
  return useQuery({ queryKey: qk.engagement(), queryFn: () => api.engagement.get(), enabled: isReady, staleTime: 30_000 });
}

function patchEngagement(qc: QueryClient, patch: (e: EngagementState) => EngagementState) {
  qc.setQueryData<EngagementState>(qk.engagement(), (old) =>
    patch(old ?? { cartCount: 0, wishlistIds: [], compareIds: [], unreadNotifications: 0 }),
  );
}

function setCart(qc: QueryClient, l: string, cart: CartDTO) {
  qc.setQueryData(['session', 'cart', l], cart);
  patchEngagement(qc, (e) => ({ ...e, cartCount: cart.totals.itemsCount }));
  void qc.invalidateQueries({ queryKey: ['session', 'cart'], predicate: (q) => q.queryKey[2] !== l });
  void qc.invalidateQueries({ queryKey: ['session', 'quote'] });
}

export function useCart() {
  const api = useApi();
  const l = useApiLanguage();
  const { isReady } = useSession();
  return useQuery({ queryKey: qk.cart(l), queryFn: () => api.cart.get(), enabled: isReady, staleTime: 15_000 });
}

export function useAddToCart() {
  const api = useApi();
  const l = useApiLanguage();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddToCartInput) => api.cart.add(input),
    onSuccess: (cart) => setCart(qc, l, cart),
  });
}

export function useUpdateCartItem() {
  const api = useApi();
  const l = useApiLanguage();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) => api.cart.update(lineId, quantity),
    onMutate: async ({ lineId, quantity }) => {
      await qc.cancelQueries({ queryKey: qk.cart(l) });
      const previous = qc.getQueryData<CartDTO>(qk.cart(l));
      if (previous) {
        qc.setQueryData<CartDTO>(qk.cart(l), {
          ...previous,
          items: previous.items.map((i) =>
            i.id === lineId ? { ...i, quantity, lineTotal: i.price * quantity, lineOldTotal: (i.oldPrice ?? i.price) * quantity } : i,
          ),
        });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(qk.cart(l), ctx.previous),
    onSuccess: (cart) => setCart(qc, l, cart),
  });
}

export function useRemoveCartItem() {
  const api = useApi();
  const l = useApiLanguage();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (lineId: string) => api.cart.remove(lineId), onSuccess: (cart) => setCart(qc, l, cart) });
}

export function useClearCart() {
  const api = useApi();
  const l = useApiLanguage();
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api.cart.clear(), onSuccess: (cart) => setCart(qc, l, cart) });
}

export function useApplyCoupon() {
  const api = useApi();
  const l = useApiLanguage();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (code: string) => api.cart.applyCoupon(code), onSuccess: (cart) => setCart(qc, l, cart) });
}

export function useRemoveCoupon() {
  const api = useApi();
  const l = useApiLanguage();
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api.cart.removeCoupon(), onSuccess: (cart) => setCart(qc, l, cart) });
}

export function useWishlist() {
  const api = useApi();
  const l = useApiLanguage();
  const { isReady } = useSession();
  return useQuery({ queryKey: qk.wishlist(l), queryFn: () => api.wishlist.get(), enabled: isReady });
}

/** Optimistic heart toggle. `active` = currently in the wishlist. */
export function useToggleWishlist() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, active }: { productId: string; active: boolean }) =>
      active ? api.wishlist.remove(productId) : api.wishlist.add(productId),
    onMutate: async ({ productId, active }) => {
      await qc.cancelQueries({ queryKey: qk.engagement() });
      const previous = qc.getQueryData<EngagementState>(qk.engagement());
      patchEngagement(qc, (e) => ({
        ...e,
        wishlistIds: active ? e.wishlistIds.filter((id) => id !== productId) : [...e.wishlistIds, productId],
      }));
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(qk.engagement(), ctx.previous),
    onSuccess: ({ ids }) => {
      patchEngagement(qc, (e) => ({ ...e, wishlistIds: ids }));
      void qc.invalidateQueries({ queryKey: qk.wishlistAll() });
    },
  });
}

export function useCompare() {
  const api = useApi();
  const l = useApiLanguage();
  const { isReady } = useSession();
  return useQuery({ queryKey: qk.compare(l), queryFn: () => api.compare.get(), enabled: isReady });
}

export function useToggleCompare() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, active }: { productId: string; active: boolean }) =>
      active ? api.compare.remove(productId) : api.compare.add(productId),
    onMutate: async ({ productId, active }) => {
      await qc.cancelQueries({ queryKey: qk.engagement() });
      const previous = qc.getQueryData<EngagementState>(qk.engagement());
      patchEngagement(qc, (e) => ({
        ...e,
        compareIds: active ? e.compareIds.filter((id) => id !== productId) : [...e.compareIds, productId],
      }));
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(qk.engagement(), ctx.previous),
    onSuccess: ({ ids }) => {
      patchEngagement(qc, (e) => ({ ...e, compareIds: ids }));
      void qc.invalidateQueries({ queryKey: qk.compareAll() });
    },
  });
}

export function useClearCompare() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.compare.clear(),
    onSuccess: () => {
      patchEngagement(qc, (e) => ({ ...e, compareIds: [] }));
      void qc.invalidateQueries({ queryKey: qk.compareAll() });
    },
  });
}

/* =================================================================== */
/* Delivery, payments, checkout, orders                                 */
/* =================================================================== */

export function useDeliveryOptions(region: string | undefined, subtotal: number | undefined) {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({
    queryKey: qk.deliveryOptions(region, subtotal, l),
    queryFn: () => api.delivery.options({ region, subtotal }),
    staleTime: 5 * MIN,
  });
}

export function usePaymentMethods(amount?: number) {
  const api = useApi();
  const l = useApiLanguage();
  return useQuery({ queryKey: qk.paymentMethods(amount, l), queryFn: () => api.payments.methods(amount), staleTime: 5 * MIN });
}

export function useCheckoutQuote(input: CheckoutQuoteInput, enabled = true) {
  const api = useApi();
  const l = useApiLanguage();
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: qk.quote(input, l),
    queryFn: () => api.checkout.quote(input),
    enabled: enabled && isAuthenticated,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function usePlaceOrder() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckoutInput) => api.checkout.placeOrder(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.cartAll() });
      void qc.invalidateQueries({ queryKey: qk.engagement() });
      void qc.invalidateQueries({ queryKey: qk.ordersAll() });
      void qc.invalidateQueries({ queryKey: qk.addresses() });
      void qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useOrders(params: { page?: number; limit?: number; status?: 'active' | 'completed' | 'cancelled' } = {}) {
  const api = useApi();
  const l = useApiLanguage();
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: qk.orders(params, l),
    queryFn: () => api.orders.list(params),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id: string | undefined) {
  const api = useApi();
  const l = useApiLanguage();
  const { isAuthenticated } = useSession();
  return useQuery({ queryKey: qk.order(id ?? '', l), queryFn: () => api.orders.get(id!), enabled: isAuthenticated && !!id });
}

export function useCancelOrder() {
  const api = useApi();
  const l = useApiLanguage();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => api.orders.cancel(id, reason),
    onSuccess: (order: OrderDetail) => {
      qc.setQueryData(qk.order(order.id, l), order);
      void qc.invalidateQueries({ queryKey: qk.ordersAll() });
    },
  });
}

export function usePayOrder() {
  const api = useApi();
  return useMutation({ mutationFn: (id: string) => api.orders.pay(id) });
}

export function useReorder() {
  const api = useApi();
  const l = useApiLanguage();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.orders.reorder(id), onSuccess: (cart) => setCart(qc, l, cart) });
}

/* =================================================================== */
/* Reviews & questions                                                  */
/* =================================================================== */

export function useCreateReview() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewInput) => api.reviews.create(input),
    onSuccess: (_r, input) => {
      void qc.invalidateQueries({ queryKey: ['reviews', input.productId] });
      void qc.invalidateQueries({ queryKey: ['session', 'myReviews'] });
      void qc.invalidateQueries({ queryKey: qk.orderAll() });
    },
  });
}

export function useUploadReviewImages() {
  const api = useApi();
  return useMutation({
    mutationFn: (files: Array<Blob | { uri: string; name: string; type: string }>) => api.reviews.uploadImages(files),
  });
}

export function useAskQuestion() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuestionInput) => api.reviews.ask(input),
    onSuccess: (_q, input) => qc.invalidateQueries({ queryKey: ['questions', input.productId] }),
  });
}

/* =================================================================== */
/* Notifications                                                        */
/* =================================================================== */

export function useNotifications(params: { page?: number; limit?: number; unread?: boolean } = {}) {
  const api = useApi();
  const l = useApiLanguage();
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: qk.notifications(params, l),
    queryFn: () => api.notifications.list(params),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });
}

export function useUnreadNotifications() {
  const api = useApi();
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: qk.unread(),
    queryFn: () => api.notifications.unreadCount(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.notificationsAll() });
      void qc.invalidateQueries({ queryKey: qk.unread() });
      void qc.invalidateQueries({ queryKey: qk.engagement() });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.notificationsAll() });
      void qc.invalidateQueries({ queryKey: qk.unread() });
      void qc.invalidateQueries({ queryKey: qk.engagement() });
    },
  });
}

export function useDeleteNotification() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.notifications.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.notificationsAll() });
      void qc.invalidateQueries({ queryKey: qk.unread() });
    },
  });
}
