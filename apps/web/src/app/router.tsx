import { createBrowserRouter, type RouteObject } from 'react-router';
import NotFoundPage from '../pages/NotFoundPage';
import { PageError, RootError } from './errors';
import { LangLayout, RequireAuth, UzRedirect } from './LangLayout';
import { pages } from './pages';
import { RootLayout } from './RootLayout';

const P = pages;

function languageRoutes(): RouteObject[] {
  return [
    {
      errorElement: <PageError />,
      children: [
        { index: true, element: <P.home /> },
        { path: 'catalog', element: <P.catalog /> },
        { path: 'catalog/:slug', element: <P.category /> },
        { path: 'product/:slug', element: <P.product /> },
        { path: 'search', element: <P.search /> },
        { path: 'brands', element: <P.brands /> },
        { path: 'brands/:slug', element: <P.brand /> },
        { path: 'promotions', element: <P.promotions /> },
        { path: 'promotions/:slug', element: <P.promotion /> },
        { path: 'cart', element: <P.cart /> },
        { path: 'wishlist', element: <P.wishlist /> },
        { path: 'compare', element: <P.compare /> },
        { path: 'login', element: <P.login /> },
        { path: 'register', element: <P.register /> },
        { path: 'forgot-password', element: <P.forgot /> },
        { path: 'reset-password', element: <P.reset /> },
        { path: 'verify-email', element: <P.verifyEmail /> },
        {
          element: <RequireAuth />,
          children: [
            { path: 'checkout', element: <P.checkout /> },
            { path: 'checkout/success/:orderId', element: <P.checkoutSuccess /> },
            {
              path: 'account',
              element: <P.accountLayout />,
              children: [
                { index: true, element: <P.profile /> },
                { path: 'orders', element: <P.orders /> },
                { path: 'orders/:id', element: <P.order /> },
                { path: 'addresses', element: <P.addresses /> },
                { path: 'notifications', element: <P.notifications /> },
                { path: 'reviews', element: <P.myReviews /> },
                { path: 'settings', element: <P.settings /> },
              ],
            },
          ],
        },
        ...(['about', 'delivery', 'warranty', 'returns', 'payment', 'privacy', 'terms'] as const).map((slug) => ({
          path: slug,
          element: <P.content slug={slug} />,
        })),
        { path: 'contacts', element: <P.contacts /> },
        { path: 'faq', element: <P.faq /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ];
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RootError />,
    children: [
      { path: 'uz/*', element: <UzRedirect /> },
      { path: 'uz', element: <UzRedirect /> },
      { path: 'ru', element: <LangLayout />, children: languageRoutes() },
      { path: 'en', element: <LangLayout />, children: languageRoutes() },
      { path: '/', element: <LangLayout />, children: languageRoutes() },
    ],
  },
]);
