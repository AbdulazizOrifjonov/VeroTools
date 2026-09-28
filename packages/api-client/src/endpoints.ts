import type {
  AddressDTO,
  AdminAuditLog,
  AdminBanner,
  AdminBrand,
  AdminCategoryNode,
  AdminCategory,
  AdminContactMessage,
  AdminCoupon,
  AdminCustomer,
  AdminCustomerDetail,
  AdminDeliveryZone,
  AdminExpense,
  AdminExpenseCategory,
  AdminExpenseSummary,
  AdminFaq,
  AdminInventoryItem,
  AdminInventoryMovement,
  AdminListParams,
  AdminMedia,
  AdminNotificationLog,
  AdminOrder,
  AdminOrderSummary,
  AdminPage,
  AdminPayment,
  AdminPaymentProviderStatus,
  AdminPermission,
  AdminPickupPoint,
  AdminProduct,
  AdminProductListItem,
  AdminPromotion,
  AdminQuestion,
  AdminReview,
  AdminRole,
  AdminSetting,
  AdminSpecDefinition,
  AdminTranslationRow,
  AdminUser,
  AnalyticsDTO,
  AuthResult,
  BannerDTO,
  BannerPlacement,
  BrandDetail,
  BrandSummary,
  CartDTO,
  CategoryDetail,
  CategoryNode,
  CheckoutQuote,
  CompareDTO,
  CreateOrderResult,
  DashboardDTO,
  DeliveryOptionsDTO,
  EngagementState,
  FaqDTO,
  HomeDTO,
  ImageRef,
  NotificationDTO,
  OrderDetail,
  OrderSummary,
  PageDTO,
  Paginated,
  PaymentAction,
  PaymentMethodDTO,
  PickupPointDTO,
  PopularSearch,
  ProductCard,
  ProductDetail,
  ProductFacets,
  ProductListParams,
  ProductQuestionDTO,
  PromotionDTO,
  PublicSettings,
  ReportDTO,
  ReportType,
  ReviewDTO,
  SearchSuggestions,
  TranslationsDTO,
  UserDTO,
  WishlistDTO,
} from '@vero/types';
import type {
  AddToCartInput,
  AddressInput,
  AdminUserCreateInput,
  AdminUserUpdateInput,
  AnalyticsQuery,
  BannerInput,
  BrandInput,
  BroadcastInput,
  CategoryInput,
  ChangePasswordInput,
  CheckoutInput,
  CheckoutQuoteInput,
  ContactMessageFormInput,
  CouponInput,
  CreateQuestionInput,
  CreateReviewInput,
  DeliveryZoneInput,
  ExpenseCategoryInput,
  ExpenseInput,
  FaqInput,
  ForgotPasswordInput,
  InventoryAdjustInput,
  LoginInput,
  OrderStatusUpdateInput,
  PageInput,
  PickupPointInput,
  PreferencesInput,
  ProductInput,
  PromotionInput,
  RegisterInput,
  ResetPasswordInput,
  RoleInput,
  SpecDefinitionInput,
  TranslationUpdateInput,
  UpdateProfileInput,
  VerifyOtpInput,
} from '@vero/validation';
import { productListParamsToSearch } from '@vero/utils';
import type { ApiClient } from './client';

/** Converts ProductListParams to the query object understood by the API (spec.* keys included). */
export function productQuery(params: ProductListParams = {}): Record<string, string> {
  return Object.fromEntries(productListParamsToSearch(params, { omitPage1: false }).entries());
}

type Id = string;

function crud<TItem, TInput, TList = TItem, TDetail = TItem>(api: ApiClient, base: string) {
  return {
    list: (params?: AdminListParams) => api.requestPage<TList>(base, params),
    get: (id: Id) => api.get<TDetail>(`${base}/${encodeURIComponent(id)}`),
    create: (input: TInput) => api.post<TDetail>(base, input),
    update: (id: Id, input: Partial<TInput>) => api.put<TDetail>(`${base}/${encodeURIComponent(id)}`, input),
    remove: (id: Id) => api.delete(`${base}/${encodeURIComponent(id)}`),
  } as const;
}

export function createEndpoints(api: ApiClient) {
  const auth = {
    register: async (input: RegisterInput) => {
      const result = await api.post<AuthResult>('/auth/register', input);
      await api.applyAuth(result);
      return result;
    },
    login: async (input: LoginInput) => {
      const result = await api.post<AuthResult>('/auth/login', input);
      await api.applyAuth(result);
      return result;
    },
    logout: async () => {
      const refreshToken = api.config.tokens?.getRefreshToken ? await api.config.tokens.getRefreshToken() : undefined;
      try {
        await api.post<void>('/auth/logout', refreshToken ? { refreshToken } : {});
      } finally {
        await api.clearAuth();
      }
    },
    me: async () => {
      const user = await api.get<UserDTO>('/auth/me');
      api.setUser(user);
      return user;
    },
    forgotPassword: (input: ForgotPasswordInput) =>
      api.post<{ channel: 'email' | 'sms'; cooldownSeconds?: number }>('/auth/forgot-password', input),
    resetPassword: (input: ResetPasswordInput) => api.post<void>('/auth/reset-password', input),
    verifyEmail: (token: string) => api.post<void>('/auth/verify-email', { token }),
    requestEmailVerification: () => api.post<void>('/auth/verify-email/request'),
    sendOtp: (phone: string, purpose: 'verify_phone' | 'reset_password' = 'verify_phone') =>
      api.post<{ cooldownSeconds: number }>('/auth/otp/send', { phone, purpose }),
    verifyOtp: (input: VerifyOtpInput) => api.post<void>('/auth/otp/verify', input),
  };

  const account = {
    updateProfile: async (input: UpdateProfileInput) => {
      const user = await api.patch<UserDTO>('/users/me', input);
      api.setUser(user);
      return user;
    },
    updatePreferences: async (input: PreferencesInput) => {
      const user = await api.patch<UserDTO>('/users/me/preferences', input);
      api.setUser(user);
      return user;
    },
    changePassword: (input: ChangePasswordInput) => api.post<void>('/users/me/password', input),
    uploadAvatar: async (file: Blob | { uri: string; name: string; type: string }) => {
      const fd = new FormData();
      fd.append('file', file as Blob);
      const user = await api.upload<UserDTO>('/users/me/avatar', fd);
      api.setUser(user);
      return user;
    },
    removeAvatar: async () => {
      const user = await api.delete<UserDTO>('/users/me/avatar');
      api.setUser(user);
      return user;
    },
    registerPushToken: (token: string, platform: 'ios' | 'android' | 'web') =>
      api.post<void>('/users/me/push-tokens', { token, platform }),
    removePushToken: (token: string) => api.delete<void>('/users/me/push-tokens', { token }),
    myReviews: () => api.get<ReviewDTO[]>('/users/me/reviews'),
  };

  const addresses = {
    list: () => api.get<AddressDTO[]>('/addresses'),
    create: (input: AddressInput) => api.post<AddressDTO>('/addresses', input),
    update: (id: Id, input: Partial<AddressInput>) => api.patch<AddressDTO>(`/addresses/${id}`, input),
    remove: (id: Id) => api.delete(`/addresses/${id}`),
    setDefault: (id: Id) => api.post<AddressDTO>(`/addresses/${id}/default`),
  };

  const catalog = {
    home: () => api.get<HomeDTO>('/home'),
    settings: () => api.get<PublicSettings>('/settings/public'),
    categories: () => api.get<CategoryNode[]>('/categories'),
    category: (slug: string) => api.get<CategoryDetail>(`/categories/${encodeURIComponent(slug)}`),
    brands: (params?: { q?: string; page?: number; limit?: number }) => api.requestPage<BrandSummary>('/brands', params),
    brand: (slug: string) => api.get<BrandDetail>(`/brands/${encodeURIComponent(slug)}`),
    products: (params?: ProductListParams, signal?: AbortSignal) =>
      api.requestPage<ProductCard>('/products', productQuery(params), signal),
    facets: (params?: ProductListParams, signal?: AbortSignal) =>
      api.get<ProductFacets>('/products/facets', productQuery({ ...params, page: undefined, limit: undefined, sort: undefined }), signal),
    product: (slugOrId: string) => api.get<ProductDetail>(`/products/${encodeURIComponent(slugOrId)}`),
    related: (id: Id) => api.get<ProductCard[]>(`/products/${id}/related`),
    byIds: (ids: Id[]) => api.requestPage<ProductCard>('/products', { ids: ids.join(','), limit: String(Math.min(100, ids.length || 1)) }),
    reviews: (productId: Id, params?: { page?: number; limit?: number; sort?: string; rating?: number; withPhotos?: boolean }) =>
      api.requestPage<ReviewDTO>(`/products/${productId}/reviews`, params),
    questions: (productId: Id, params?: { page?: number; limit?: number }) =>
      api.requestPage<ProductQuestionDTO>(`/products/${productId}/questions`, params),
    suggest: (q: string, signal?: AbortSignal) => api.get<SearchSuggestions>('/search/suggest', { q }, signal),
    popularSearches: () => api.get<PopularSearch[]>('/search/popular'),
    banners: (placement: BannerPlacement) => api.get<BannerDTO[]>('/banners', { placement }),
    promotions: () => api.get<PromotionDTO[]>('/promotions'),
    promotion: (slug: string) => api.get<PromotionDTO>(`/promotions/${encodeURIComponent(slug)}`),
    page: (slug: string) => api.get<PageDTO>(`/pages/${encodeURIComponent(slug)}`),
    faq: () => api.get<FaqDTO[]>('/faq'),
    translations: (lng: string) => api.get<TranslationsDTO>('/translations', { lng }),
    contact: (input: ContactMessageFormInput) => api.post<{ id: string }>('/contact', input),
  };

  const reviews = {
    create: (input: CreateReviewInput) => api.post<ReviewDTO>('/reviews', input),
    uploadImages: (files: Array<Blob | { uri: string; name: string; type: string }>) => {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f as Blob));
      return api.upload<ImageRef[]>('/reviews/images', fd);
    },
    ask: (input: CreateQuestionInput) => api.post<ProductQuestionDTO>('/questions', input),
  };

  const cart = {
    get: () => api.get<CartDTO>('/cart'),
    add: (input: AddToCartInput) => api.post<CartDTO>('/cart/items', input),
    update: (lineId: string, quantity: number) => api.patch<CartDTO>(`/cart/items/${encodeURIComponent(lineId)}`, { quantity }),
    remove: (lineId: string) => api.delete<CartDTO>(`/cart/items/${encodeURIComponent(lineId)}`),
    clear: () => api.delete<CartDTO>('/cart'),
    applyCoupon: (code: string) => api.post<CartDTO>('/cart/coupon', { code }),
    removeCoupon: () => api.delete<CartDTO>('/cart/coupon'),
    merge: (guestId: string) => api.post<CartDTO>('/cart/merge', { guestId }),
  };

  const engagement = { get: () => api.get<EngagementState>('/engagement') };

  const wishlist = {
    get: () => api.get<WishlistDTO>('/wishlist'),
    add: (productId: Id) => api.post<{ ids: Id[] }>('/wishlist', { productId }),
    remove: (productId: Id) => api.delete<{ ids: Id[] }>(`/wishlist/${productId}`),
  };

  const compare = {
    get: () => api.get<CompareDTO>('/compare'),
    add: (productId: Id) => api.post<{ ids: Id[] }>('/compare', { productId }),
    remove: (productId: Id) => api.delete<{ ids: Id[] }>(`/compare/${productId}`),
    clear: () => api.delete<{ ids: Id[] }>('/compare'),
  };

  const delivery = {
    options: (params: { region?: string; subtotal?: number }) => api.get<DeliveryOptionsDTO>('/delivery/options', params),
    pickupPoints: () => api.get<PickupPointDTO[]>('/delivery/pickup-points'),
  };

  const payments = {
    methods: (amount?: number) => api.get<PaymentMethodDTO[]>('/payments/methods', amount ? { amount } : undefined),
  };

  const checkout = {
    quote: (input: CheckoutQuoteInput) => api.post<CheckoutQuote>('/checkout/quote', input),
    placeOrder: (input: CheckoutInput) => api.post<CreateOrderResult>('/orders', input),
  };

  const orders = {
    list: (params?: { page?: number; limit?: number; status?: 'active' | 'completed' | 'cancelled' }) =>
      api.requestPage<OrderSummary>('/orders', params),
    get: (idOrNumber: string) => api.get<OrderDetail>(`/orders/${encodeURIComponent(idOrNumber)}`),
    cancel: (id: Id, reason?: string) => api.post<OrderDetail>(`/orders/${id}/cancel`, { reason }),
    pay: (id: Id) => api.post<{ action: PaymentAction }>(`/orders/${id}/pay`),
    reorder: (id: Id) => api.post<CartDTO>(`/orders/${id}/reorder`),
  };

  const notifications = {
    list: (params?: { page?: number; limit?: number; unread?: boolean }) =>
      api.requestPage<NotificationDTO>('/notifications', params),
    unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
    markRead: (id: Id) => api.post<void>(`/notifications/${id}/read`),
    markAllRead: () => api.post<void>('/notifications/read-all'),
    remove: (id: Id) => api.delete(`/notifications/${id}`),
  };

  /* ------------------------------------------------------------------ */
  /* Admin                                                               */
  /* ------------------------------------------------------------------ */

  const admin = {
    dashboard: () => api.get<DashboardDTO>('/admin/dashboard'),
    analytics: (query: AnalyticsQuery) => api.get<AnalyticsDTO>('/admin/analytics', query as Record<string, unknown>),
    report: (type: ReportType, query: AnalyticsQuery & { lang?: string }) =>
      api.get<ReportDTO>(`/admin/reports/${type}`, { ...query, format: 'json' }),
    exportReport: (type: ReportType, query: AnalyticsQuery & { format: 'csv' | 'xlsx' | 'pdf'; lang?: string }) =>
      api.download(`/admin/reports/${type}`, query as Record<string, unknown>),

    products: {
      ...crud<AdminProduct, ProductInput, AdminProductListItem>(api, '/admin/products'),
      duplicate: (id: Id) => api.post<AdminProduct>(`/admin/products/${id}/duplicate`),
      setStatus: (id: Id, status: 'draft' | 'published' | 'archived') =>
        api.patch<AdminProduct>(`/admin/products/${id}/status`, { status }),
      bulkStatus: (ids: Id[], status: 'draft' | 'published' | 'archived') =>
        api.post<{ updated: number }>('/admin/products/bulk-status', { ids, status }),
      bulkDelete: (ids: Id[]) => api.post<{ deleted: number }>('/admin/products/bulk-delete', { ids }),
    },
    categories: {
      tree: () => api.get<AdminCategoryNode[]>('/admin/categories'),
      get: (id: Id) => api.get<AdminCategory>(`/admin/categories/${id}`),
      create: (input: CategoryInput) => api.post<AdminCategory>('/admin/categories', input),
      update: (id: Id, input: Partial<CategoryInput>) => api.put<AdminCategory>(`/admin/categories/${id}`, input),
      remove: (id: Id) => api.delete(`/admin/categories/${id}`),
      reorder: (items: Array<{ id: Id; order: number; parent?: Id | null }>) =>
        api.post<void>('/admin/categories/reorder', { items }),
    },
    brands: crud<AdminBrand, BrandInput>(api, '/admin/brands'),
    specs: {
      list: () => api.get<AdminSpecDefinition[]>('/admin/specs'),
      create: (input: SpecDefinitionInput) => api.post<AdminSpecDefinition>('/admin/specs', input),
      update: (id: Id, input: Partial<SpecDefinitionInput>) => api.put<AdminSpecDefinition>(`/admin/specs/${id}`, input),
      remove: (id: Id) => api.delete(`/admin/specs/${id}`),
    },
    orders: {
      list: (params?: AdminListParams) => api.requestPage<AdminOrderSummary>('/admin/orders', params),
      get: (id: Id) => api.get<AdminOrder>(`/admin/orders/${id}`),
      updateStatus: (id: Id, input: OrderStatusUpdateInput) => api.post<AdminOrder>(`/admin/orders/${id}/status`, input),
      addNote: (id: Id, text: string) => api.post<AdminOrder>(`/admin/orders/${id}/notes`, { text }),
      updateDelivery: (id: Id, input: { carrier?: string; trackingNumber?: string }) =>
        api.patch<AdminOrder>(`/admin/orders/${id}/delivery`, input),
      updatePayment: (id: Id, input: { status: string; note?: string }) =>
        api.patch<AdminOrder>(`/admin/orders/${id}/payment`, input),
      installmentDecision: (id: Id, input: { status: 'APPROVED' | 'REJECTED'; note?: string }) =>
        api.post<AdminOrder>(`/admin/orders/${id}/installment`, input),
    },
    customers: {
      list: (params?: AdminListParams) => api.requestPage<AdminCustomer>('/admin/customers', params),
      get: (id: Id) => api.get<AdminCustomerDetail>(`/admin/customers/${id}`),
      update: (id: Id, input: { status?: 'active' | 'blocked'; firstName?: string; lastName?: string; email?: string }) =>
        api.patch<AdminCustomerDetail>(`/admin/customers/${id}`, input),
    },
    users: {
      list: (params?: AdminListParams) => api.requestPage<AdminUser>('/admin/users', params),
      get: (id: Id) => api.get<AdminUser>(`/admin/users/${id}`),
      create: (input: AdminUserCreateInput) => api.post<AdminUser>('/admin/users', input),
      update: (id: Id, input: AdminUserUpdateInput) => api.patch<AdminUser>(`/admin/users/${id}`, input),
      remove: (id: Id) => api.delete(`/admin/users/${id}`),
      resetPassword: (id: Id, password: string) => api.post<void>(`/admin/users/${id}/reset-password`, { password }),
      activity: (id: Id, params?: AdminListParams) => api.requestPage<AdminAuditLog>(`/admin/users/${id}/activity`, params),
    },
    roles: {
      list: () => api.get<AdminRole[]>('/admin/roles'),
      create: (input: RoleInput) => api.post<AdminRole>('/admin/roles', input),
      update: (id: Id, input: Partial<RoleInput>) => api.put<AdminRole>(`/admin/roles/${id}`, input),
      remove: (id: Id) => api.delete(`/admin/roles/${id}`),
      permissions: () => api.get<AdminPermission[]>('/admin/permissions'),
    },
    reviews: {
      list: (params?: AdminListParams) => api.requestPage<AdminReview>('/admin/reviews', params),
      moderate: (id: Id, input: { status?: 'PENDING' | 'APPROVED' | 'REJECTED'; reply?: string }) =>
        api.patch<AdminReview>(`/admin/reviews/${id}`, input),
      remove: (id: Id) => api.delete(`/admin/reviews/${id}`),
    },
    questions: {
      list: (params?: AdminListParams) => api.requestPage<AdminQuestion>('/admin/questions', params),
      answer: (id: Id, input: { status?: 'PENDING' | 'PUBLISHED' | 'REJECTED'; answer?: string }) =>
        api.patch<AdminQuestion>(`/admin/questions/${id}`, input),
      remove: (id: Id) => api.delete(`/admin/questions/${id}`),
    },
    inventory: {
      list: (params?: AdminListParams) => api.requestPage<AdminInventoryItem>('/admin/inventory', params),
      adjust: (id: Id, input: InventoryAdjustInput) => api.post<AdminInventoryItem>(`/admin/inventory/${id}/adjust`, input),
      update: (id: Id, input: { minStock: number }) => api.patch<AdminInventoryItem>(`/admin/inventory/${id}`, input),
      movements: (params?: AdminListParams) => api.requestPage<AdminInventoryMovement>('/admin/inventory/movements', params),
      itemMovements: (id: Id, params?: AdminListParams) =>
        api.requestPage<AdminInventoryMovement>(`/admin/inventory/${id}/movements`, params),
    },
    coupons: crud<AdminCoupon, CouponInput>(api, '/admin/coupons'),
    promotions: crud<AdminPromotion, PromotionInput>(api, '/admin/promotions'),
    banners: crud<AdminBanner, BannerInput>(api, '/admin/banners'),
    media: {
      list: (params?: AdminListParams) => api.requestPage<AdminMedia>('/admin/media', params),
      upload: (files: Array<Blob | File>, folder = 'general') => {
        const fd = new FormData();
        fd.append('folder', folder);
        files.forEach((f) => fd.append('files', f));
        return api.upload<AdminMedia[]>('/admin/media', fd);
      },
      update: (id: Id, input: { alt?: { uz?: string; ru?: string; en?: string }; tags?: string[]; folder?: string }) =>
        api.patch<AdminMedia>(`/admin/media/${id}`, input),
      replace: (id: Id, file: Blob | File) => {
        const fd = new FormData();
        fd.append('file', file);
        return api.upload<AdminMedia>(`/admin/media/${id}/replace`, fd);
      },
      /** `force` deletes a file that is still referenced (the API answers 409 IN_USE otherwise). */
      remove: (id: Id, opts?: { force?: boolean }) =>
        api.request<void>('DELETE', `/admin/media/${id}`, opts?.force ? { query: { force: '1' } } : {}),
    },
    payments: {
      list: (params?: AdminListParams) => api.requestPage<AdminPayment>('/admin/payments', params),
      providers: () => api.get<AdminPaymentProviderStatus[]>('/admin/payments/providers'),
      updateRefund: (id: Id, input: { refundStatus: string; refundAmount?: number; note?: string }) =>
        api.patch<AdminPayment>(`/admin/payments/${id}/refund`, input),
    },
    deliveryZones: crud<AdminDeliveryZone, DeliveryZoneInput>(api, '/admin/delivery/zones'),
    pickupPoints: crud<AdminPickupPoint, PickupPointInput>(api, '/admin/delivery/pickup-points'),
    expenses: {
      ...crud<AdminExpense, ExpenseInput>(api, '/admin/expenses'),
      summary: (params?: AdminListParams) => api.get<AdminExpenseSummary>('/admin/expenses/summary', params),
    },
    expenseCategories: {
      list: () => api.get<AdminExpenseCategory[]>('/admin/expense-categories'),
      create: (input: ExpenseCategoryInput) => api.post<AdminExpenseCategory>('/admin/expense-categories', input),
      update: (id: Id, input: Partial<ExpenseCategoryInput>) =>
        api.put<AdminExpenseCategory>(`/admin/expense-categories/${id}`, input),
      remove: (id: Id) => api.delete(`/admin/expense-categories/${id}`),
    },
    notifications: {
      broadcast: (input: BroadcastInput) => api.post<{ recipients: number }>('/admin/notifications/broadcast', input),
      logs: (params?: AdminListParams) => api.requestPage<AdminNotificationLog>('/admin/notifications/logs', params),
    },
    translations: {
      list: (params?: { namespace?: string; q?: string; missing?: string; edited?: '1' | '0'; page?: number; limit?: number }) =>
        api.requestPage<AdminTranslationRow>('/admin/translations', params),
      namespaces: () => api.get<string[]>('/admin/translations/namespaces'),
      update: (input: TranslationUpdateInput) => api.put<AdminTranslationRow>('/admin/translations', input),
      reset: (namespace: string, key: string) => api.delete(`/admin/translations`, { namespace, key }),
    },
    settings: {
      get: () => api.get<AdminSetting[]>('/admin/settings'),
      update: (values: Record<string, unknown>) => api.put<AdminSetting[]>('/admin/settings', { values }),
    },
    pages: {
      list: () => api.get<AdminPage[]>('/admin/pages'),
      get: (slug: string) => api.get<AdminPage>(`/admin/pages/${slug}`),
      update: (slug: string, input: PageInput) => api.put<AdminPage>(`/admin/pages/${slug}`, input),
    },
    faq: {
      list: () => api.get<AdminFaq[]>('/admin/faq'),
      create: (input: FaqInput) => api.post<AdminFaq>('/admin/faq', input),
      update: (id: Id, input: Partial<FaqInput>) => api.put<AdminFaq>(`/admin/faq/${id}`, input),
      remove: (id: Id) => api.delete(`/admin/faq/${id}`),
    },
    messages: {
      list: (params?: AdminListParams) => api.requestPage<AdminContactMessage>('/admin/messages', params),
      setStatus: (id: Id, status: 'NEW' | 'IN_PROGRESS' | 'DONE') =>
        api.patch<AdminContactMessage>(`/admin/messages/${id}`, { status }),
    },
    auditLogs: (params?: AdminListParams) => api.requestPage<AdminAuditLog>('/admin/audit-logs', params),
  };

  return {
    auth,
    account,
    addresses,
    catalog,
    reviews,
    cart,
    engagement,
    wishlist,
    compare,
    delivery,
    payments,
    checkout,
    orders,
    notifications,
    admin,
  };
}

export type Endpoints = ReturnType<typeof createEndpoints>;
export type { Paginated };
