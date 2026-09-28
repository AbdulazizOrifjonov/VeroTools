import { createBottomTabNavigator, type BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { useEngagement } from '@vero/api-client';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../theme/fonts';
import { useTheme } from '../theme/theme';
import { Heart, House, LayoutGrid, ShoppingCart, User } from '../ui/icons';
import { AddressesScreen } from '../screens/account/AddressesScreen';
import { AddressFormScreen } from '../screens/account/AddressFormScreen';
import { ChangePasswordScreen } from '../screens/account/ChangePasswordScreen';
import { EditProfileScreen } from '../screens/account/EditProfileScreen';
import { MyReviewsScreen } from '../screens/account/MyReviewsScreen';
import { NotificationsScreen } from '../screens/account/NotificationsScreen';
import { ProfileScreen } from '../screens/account/ProfileScreen';
import { SettingsScreen } from '../screens/account/SettingsScreen';
import { VerifyPhoneScreen } from '../screens/account/VerifyPhoneScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { VerifyEmailScreen } from '../screens/auth/VerifyEmailScreen';
import { CartScreen } from '../screens/cart/CartScreen';
import { CatalogScreen } from '../screens/catalog/CatalogScreen';
import { CategoryScreen } from '../screens/catalog/CategoryScreen';
import { ProductListScreen } from '../screens/catalog/ProductListScreen';
import { CheckoutScreen } from '../screens/checkout/CheckoutScreen';
import { CheckoutSuccessScreen } from '../screens/checkout/CheckoutSuccessScreen';
import { CompareScreen } from '../screens/compare/CompareScreen';
import { ContactsScreen } from '../screens/help/ContactsScreen';
import { FaqScreen } from '../screens/help/FaqScreen';
import { HelpScreen } from '../screens/help/HelpScreen';
import { PageScreen } from '../screens/help/PageScreen';
import { BrandsScreen } from '../screens/home/BrandsScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { PromotionsScreen } from '../screens/home/PromotionsScreen';
import { OrderScreen } from '../screens/orders/OrderScreen';
import { OrdersScreen } from '../screens/orders/OrdersScreen';
import { GalleryScreen } from '../screens/product/GalleryScreen';
import { ProductScreen } from '../screens/product/ProductScreen';
import { QuestionsScreen } from '../screens/product/QuestionsScreen';
import { ReviewsScreen } from '../screens/product/ReviewsScreen';
import { WriteReviewScreen } from '../screens/product/WriteReviewScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { WishlistScreen } from '../screens/wishlist/WishlistScreen';
import type {
  CartStackParamList,
  CatalogStackParamList,
  HomeStackParamList,
  ProfileStackParamList,
  RootStackParamList,
  TabParamList,
  WishlistStackParamList,
} from './types';

const Root = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const CatalogStack = createNativeStackNavigator<CatalogStackParamList>();
const CartStack = createNativeStackNavigator<CartStackParamList>();
const WishlistStack = createNativeStackNavigator<WishlistStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

/** Shared header look: neutral background, hairline, Manrope bold title, minimal back button. */
export function useStackOptions(): NativeStackNavigationOptions {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  return useMemo(
    () => ({
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.foreground,
      headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17, color: colors.foreground },
      headerTitleAlign: 'center',
      headerShadowVisible: true,
      headerBackButtonDisplayMode: 'minimal',
      contentStyle: { backgroundColor: colors.background },
      animation: reduced ? 'none' : 'default',
      freezeOnBlur: true,
    }),
    [colors, reduced],
  );
}

function HomeNavigator() {
  const { t } = useTranslation();
  const options = useStackOptions();
  return (
    <HomeStack.Navigator screenOptions={options}>
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false, title: t('common:nav.home') }}
      />
      <HomeStack.Screen name="ProductList" component={ProductListScreen} options={{ title: '' }} />
      <HomeStack.Screen
        name="Promotions"
        component={PromotionsScreen}
        options={{ title: t('shop:promotions.title') }}
      />
      <HomeStack.Screen name="Brands" component={BrandsScreen} options={{ title: t('shop:brands.title') }} />
    </HomeStack.Navigator>
  );
}

function CatalogNavigator() {
  const { t } = useTranslation();
  const options = useStackOptions();
  return (
    <CatalogStack.Navigator screenOptions={options}>
      <CatalogStack.Screen
        name="Catalog"
        component={CatalogScreen}
        options={{ title: t('shop:catalog.title') }}
      />
      <CatalogStack.Screen
        name="Category"
        component={CategoryScreen}
        options={({ route }) => ({ title: route.params.title ?? '' })}
      />
      <CatalogStack.Screen name="ProductList" component={ProductListScreen} options={{ title: '' }} />
    </CatalogStack.Navigator>
  );
}

function CartNavigator() {
  const { t } = useTranslation();
  const options = useStackOptions();
  return (
    <CartStack.Navigator screenOptions={options}>
      <CartStack.Screen name="Cart" component={CartScreen} options={{ title: t('shop:cart.title') }} />
    </CartStack.Navigator>
  );
}

function WishlistNavigator() {
  const { t } = useTranslation();
  const options = useStackOptions();
  return (
    <WishlistStack.Navigator screenOptions={options}>
      <WishlistStack.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{ title: t('shop:wishlist.title') }}
      />
    </WishlistStack.Navigator>
  );
}

function ProfileNavigator() {
  const { t } = useTranslation();
  const options = useStackOptions();
  return (
    <ProfileStack.Navigator screenOptions={options}>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('common:nav.profile') }}
      />
      <ProfileStack.Screen
        name="Orders"
        component={OrdersScreen}
        options={{ title: t('shop:orders.title') }}
      />
      <ProfileStack.Screen
        name="Addresses"
        component={AddressesScreen}
        options={{ title: t('shop:addresses.title') }}
      />
      <ProfileStack.Screen
        name="AddressForm"
        component={AddressFormScreen}
        options={{ title: t('shop:addresses.add') }}
      />
      <ProfileStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: t('shop:notifications.title') }}
      />
      <ProfileStack.Screen
        name="MyReviews"
        component={MyReviewsScreen}
        options={{ title: t('shop:myReviews.title') }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('shop:settings.title') }}
      />
      <ProfileStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: t('shop:account.changePassword') }}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: t('shop:account.personalInfo') }}
      />
      <ProfileStack.Screen
        name="VerifyPhone"
        component={VerifyPhoneScreen}
        options={{ title: t('shop:account.verifyPhone') }}
      />
      <ProfileStack.Screen name="Help" component={HelpScreen} options={{ title: t('help.title') }} />
      <ProfileStack.Screen name="Faq" component={FaqScreen} options={{ title: t('shop:faq.title') }} />
      <ProfileStack.Screen
        name="Page"
        component={PageScreen}
        options={({ route }) => ({ title: route.params.title ?? '' })}
      />
      <ProfileStack.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{ title: t('shop:contact.title') }}
      />
    </ProfileStack.Navigator>
  );
}

function Tabs() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const engagement = useEngagement();
  const cartCount = engagement.data?.cartCount ?? 0;
  const wishCount = engagement.data?.wishlistIds.length ?? 0;
  const options = useMemo<BottomTabNavigationOptions>(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: colors.link,
      tabBarInactiveTintColor: colors.tabInactive,
      tabBarStyle: {
        backgroundColor: colors.background,
        borderTopColor: colors.border,
        borderTopWidth: StyleSheet.hairlineWidth,
        elevation: 0,
        height: 64 + insets.bottom,
        paddingTop: 3,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 5,
      },
      tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },
      tabBarBadgeStyle: {
        backgroundColor: colors.primary,
        color: colors.primaryForeground,
        fontFamily: fonts.bold,
        fontSize: 10,
        minWidth: 18,
        height: 18,
        lineHeight: Platform.OS === 'ios' ? 17 : 18,
        borderRadius: 9,
      },
      tabBarHideOnKeyboard: true,
      lazy: true,
      freezeOnBlur: true,
    }),
    [colors, insets.bottom],
  );
  return (
    <Tab.Navigator screenOptions={options}>
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          title: t('common:nav.home'),
          tabBarIcon: ({ color, size }) => <House color={color} size={size - 2} strokeWidth={1.9} />,
        }}
      />
      <Tab.Screen
        name="CatalogTab"
        component={CatalogNavigator}
        options={{
          title: t('common:nav.catalog'),
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size - 2} strokeWidth={1.9} />,
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartNavigator}
        options={{
          title: t('common:nav.cart'),
          tabBarBadge: cartCount > 0 ? (cartCount > 99 ? '99+' : cartCount) : undefined,
          tabBarAccessibilityLabel: `${t('common:nav.cart')}${cartCount ? `, ${t('common:a11y.cartCount', { count: cartCount })}` : ''}`,
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size - 2} strokeWidth={1.9} />,
        }}
      />
      <Tab.Screen
        name="WishlistTab"
        component={WishlistNavigator}
        options={{
          title: t('common:nav.wishlist'),
          tabBarBadge: wishCount > 0 ? (wishCount > 99 ? '99+' : wishCount) : undefined,
          tabBarAccessibilityLabel: `${t('common:nav.wishlist')}${wishCount ? `, ${t('common:a11y.wishlistCount', { count: wishCount })}` : ''}`,
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size - 2} strokeWidth={1.9} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          title: t('common:nav.profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size - 2} strokeWidth={1.9} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { t } = useTranslation();
  const options = useStackOptions();
  return (
    <Root.Navigator screenOptions={options}>
      <Root.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Root.Screen name="Product" component={ProductScreen} options={{ headerShown: false }} />
      <Root.Screen name="ProductList" component={ProductListScreen} options={{ title: '' }} />
      <Root.Screen
        name="Search"
        component={SearchScreen}
        options={{ headerShown: false, animation: 'fade' }}
      />
      <Root.Screen name="Compare" component={CompareScreen} options={{ title: t('shop:compare.title') }} />
      <Root.Screen name="Checkout" component={CheckoutScreen} options={{ title: t('shop:checkout.title') }} />
      <Root.Screen
        name="CheckoutSuccess"
        component={CheckoutSuccessScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Root.Screen name="Order" component={OrderScreen} options={{ title: t('shop:orders.details') }} />
      <Root.Screen name="Reviews" component={ReviewsScreen} options={{ title: t('shop:reviews.title') }} />
      <Root.Screen
        name="Questions"
        component={QuestionsScreen}
        options={{ title: t('shop:questions.title') }}
      />
      <Root.Screen
        name="Page"
        component={PageScreen}
        options={({ route }) => ({ title: route.params.title ?? '' })}
      />
      <Root.Screen name="Faq" component={FaqScreen} options={{ title: t('shop:faq.title') }} />
      <Root.Screen name="Contacts" component={ContactsScreen} options={{ title: t('shop:contact.title') }} />
      <Root.Group screenOptions={{ presentation: 'modal' }}>
        <Root.Screen name="Login" component={LoginScreen} options={{ title: t('shop:auth.loginTitle') }} />
        <Root.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: t('shop:auth.registerTitle') }}
        />
        <Root.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ title: t('shop:auth.forgotTitle') }}
        />
        <Root.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{ title: t('shop:auth.resetTitle') }}
        />
        <Root.Screen
          name="VerifyEmail"
          component={VerifyEmailScreen}
          options={{ title: t('shop:account.verifyEmail') }}
        />
        <Root.Screen
          name="WriteReview"
          component={WriteReviewScreen}
          options={{ title: t('shop:reviews.write') }}
        />
      </Root.Group>
      <Root.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade',
          contentStyle: { backgroundColor: '#000000' },
        }}
      />
    </Root.Navigator>
  );
}
