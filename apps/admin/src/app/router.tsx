import type { Permission } from '@vero/types';
import type { ComponentType } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import NotFoundPage from '../features/errors/NotFoundPage';
import { AppShell } from './AppShell';
import { PageError, RootError } from './errors';
import { PermissionGate } from './PermissionGate';
import { RequireStaff, RootLayout } from './RootLayout';

export interface RouteHandle {
  /** permission(s) needed to open the page */
  permission?: Permission | Permission[];
  /** 'any' = one of the permissions is enough */
  mode?: 'all' | 'any';
}

type PageModule = { default: ComponentType };
const page = (load: () => Promise<PageModule>) => async () => ({ Component: (await load()).default });

const p = (path: string, load: () => Promise<PageModule>, permission: RouteHandle['permission'], mode?: RouteHandle['mode']): RouteObject => ({
  path,
  lazy: page(load),
  handle: { permission, mode } satisfies RouteHandle,
});

const pages: RouteObject[] = [
  { index: true, lazy: page(() => import('../features/dashboard/DashboardPage')), handle: { permission: 'dashboard.read' } satisfies RouteHandle },
  p('analytics', () => import('../features/analytics/AnalyticsPage'), 'analytics.read'),
  p('reports', () => import('../features/reports/ReportsPage'), 'reports.read'),

  p('products', () => import('../features/products/ProductsPage'), 'products.read'),
  p('products/new', () => import('../features/products/ProductFormPage'), 'products.create'),
  p('products/:id', () => import('../features/products/ProductFormPage'), 'products.read'),
  p('categories', () => import('../features/categories/CategoriesPage'), 'categories.read'),
  p('brands', () => import('../features/brands/BrandsPage'), 'brands.read'),
  p('specs', () => import('../features/specs/SpecsPage'), 'products.read'),

  p('orders', () => import('../features/orders/OrdersPage'), 'orders.read'),
  p('orders/:id', () => import('../features/orders/OrderPage'), 'orders.read'),
  p('customers', () => import('../features/customers/CustomersPage'), 'customers.read'),
  p('customers/:id', () => import('../features/customers/CustomerPage'), 'customers.read'),
  p('payments', () => import('../features/payments/PaymentsPage'), 'payments.read'),
  p('coupons', () => import('../features/coupons/CouponsPage'), 'coupons.read'),
  p('promotions', () => import('../features/promotions/PromotionsPage'), 'promotions.read'),

  p('inventory', () => import('../features/inventory/InventoryPage'), 'inventory.read'),
  p('inventory/movements', () => import('../features/inventory/MovementsPage'), 'inventory.read'),
  p('delivery', () => import('../features/delivery/DeliveryPage'), 'delivery.read'),
  p('reviews', () => import('../features/reviews/ReviewsPage'), 'reviews.read'),
  p('questions', () => import('../features/questions/QuestionsPage'), 'reviews.read'),
  p('messages', () => import('../features/messages/MessagesPage'), 'content.read'),

  p('expenses', () => import('../features/expenses/ExpensesPage'), 'expenses.read'),
  p('expense-categories', () => import('../features/expenses/ExpenseCategoriesPage'), 'expenses.read'),

  p('banners', () => import('../features/banners/BannersPage'), 'banners.read'),
  p('media', () => import('../features/media/MediaLibraryPage'), 'media.read'),
  p('pages', () => import('../features/pages/PagesListPage'), 'content.read'),
  p('pages/:slug', () => import('../features/pages/PageEditorPage'), 'content.read'),
  p('faq', () => import('../features/faq/FaqPage'), 'content.read'),
  p('translations', () => import('../features/translations/TranslationsPage'), 'translations.read'),

  p('users', () => import('../features/users/UsersPage'), 'users.read'),
  p('users/:id', () => import('../features/users/UserPage'), 'users.read'),
  p('roles', () => import('../features/roles/RolesPage'), 'roles.read'),
  p('notifications', () => import('../features/notifications/NotificationsPage'), 'notifications.read'),
  p('settings', () => import('../features/settings/SettingsPage'), 'settings.read'),
  p('audit', () => import('../features/audit/AuditLogPage'), 'audit.read'),

  { path: 'profile', lazy: page(() => import('../features/profile/ProfilePage')) },
  // already part of the main chunk (error boundaries use it), so no lazy import
  { path: '*', Component: NotFoundPage },
];

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RootError />,
    children: [
      { path: 'login', lazy: page(() => import('../features/auth/LoginPage')) },
      {
        element: <RequireStaff />,
        children: [
          {
            path: '/',
            element: <AppShell />,
            children: [
              {
                errorElement: <PageError />,
                element: <PermissionGate />,
                children: pages,
              },
            ],
          },
        ],
      },
    ],
  },
]);
