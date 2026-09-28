import type { Permission } from '@vero/types';
import {
  Award,
  BadgePercent,
  Bell,
  Boxes,
  ChartNoAxesCombined,
  CircleHelp,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FolderTree,
  GalleryHorizontalEnd,
  Images,
  Inbox,
  Languages,
  LayoutDashboard,
  MessageCircleQuestion,
  Package,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Tags,
  TicketPercent,
  Truck,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export type NavBadgeKey = 'pendingOrders' | 'pendingReviews' | 'newMessages';

export interface NavItem {
  /** i18n key under `nav.` */
  key: string;
  path: string;
  icon: LucideIcon;
  permission: Permission | Permission[];
  badge?: NavBadgeKey;
}

export interface NavGroup {
  key: 'overview' | 'catalog' | 'sales' | 'operations' | 'finance' | 'content' | 'system';
  items: NavItem[];
}

/** Sidebar navigation. Every item is hidden when the signed-in user lacks its permission. */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'overview',
    items: [
      { key: 'dashboard', path: '/', icon: LayoutDashboard, permission: 'dashboard.read' },
      { key: 'analytics', path: '/analytics', icon: ChartNoAxesCombined, permission: 'analytics.read' },
      { key: 'reports', path: '/reports', icon: FileSpreadsheet, permission: 'reports.read' },
    ],
  },
  {
    key: 'catalog',
    items: [
      { key: 'products', path: '/products', icon: Package, permission: 'products.read' },
      { key: 'categories', path: '/categories', icon: FolderTree, permission: 'categories.read' },
      { key: 'brands', path: '/brands', icon: Award, permission: 'brands.read' },
      { key: 'specs', path: '/specs', icon: SlidersHorizontal, permission: 'products.read' },
    ],
  },
  {
    key: 'sales',
    items: [
      { key: 'orders', path: '/orders', icon: ShoppingCart, permission: 'orders.read', badge: 'pendingOrders' },
      { key: 'customers', path: '/customers', icon: Users, permission: 'customers.read' },
      { key: 'payments', path: '/payments', icon: CreditCard, permission: 'payments.read' },
      { key: 'coupons', path: '/coupons', icon: TicketPercent, permission: 'coupons.read' },
      { key: 'promotions', path: '/promotions', icon: BadgePercent, permission: 'promotions.read' },
    ],
  },
  {
    key: 'operations',
    items: [
      { key: 'inventory', path: '/inventory', icon: Boxes, permission: 'inventory.read' },
      { key: 'delivery', path: '/delivery', icon: Truck, permission: 'delivery.read' },
      { key: 'reviews', path: '/reviews', icon: Star, permission: 'reviews.read', badge: 'pendingReviews' },
      { key: 'questions', path: '/questions', icon: MessageCircleQuestion, permission: 'reviews.read' },
      { key: 'messages', path: '/messages', icon: Inbox, permission: 'content.read', badge: 'newMessages' },
    ],
  },
  {
    key: 'finance',
    items: [
      { key: 'expenses', path: '/expenses', icon: Wallet, permission: 'expenses.read' },
      { key: 'expenseCategories', path: '/expense-categories', icon: Tags, permission: 'expenses.read' },
    ],
  },
  {
    key: 'content',
    items: [
      { key: 'banners', path: '/banners', icon: GalleryHorizontalEnd, permission: 'banners.read' },
      { key: 'media', path: '/media', icon: Images, permission: 'media.read' },
      { key: 'pages', path: '/pages', icon: FileText, permission: 'content.read' },
      { key: 'faq', path: '/faq', icon: CircleHelp, permission: 'content.read' },
      { key: 'translations', path: '/translations', icon: Languages, permission: 'translations.read' },
    ],
  },
  {
    key: 'system',
    items: [
      { key: 'users', path: '/users', icon: UserCog, permission: 'users.read' },
      { key: 'roles', path: '/roles', icon: ShieldCheck, permission: 'roles.read' },
      { key: 'notifications', path: '/notifications', icon: Bell, permission: 'notifications.read' },
      { key: 'settings', path: '/settings', icon: Settings, permission: 'settings.read' },
      { key: 'audit', path: '/audit', icon: ScrollText, permission: 'audit.read' },
    ],
  },
];

export const ALL_NAV_ITEMS: Array<NavItem & { group: NavGroup['key'] }> = NAV_GROUPS.flatMap((g) =>
  g.items.map((item) => ({ ...item, group: g.key })),
);

/** The nav item a pathname belongs to (longest matching prefix). */
export function navItemForPath(pathname: string): (NavItem & { group: NavGroup['key'] }) | undefined {
  let best: (NavItem & { group: NavGroup['key'] }) | undefined;
  for (const item of ALL_NAV_ITEMS) {
    const match = item.path === '/' ? pathname === '/' : pathname === item.path || pathname.startsWith(`${item.path}/`);
    if (match && (!best || item.path.length > best.path.length)) best = item;
  }
  return best;
}
