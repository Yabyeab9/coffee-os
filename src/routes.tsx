import React from 'react';
import type { ReactNode } from 'react';

// ── Public Pages ──────────────────────────────────────────────────────────────
import HomePage from './pages/public/HomePage';
import MenuPage from './pages/public/MenuPage';
import GalleryPage from './pages/public/GalleryPage';
import AboutPage from './pages/public/AboutPage';
import ReservationPage from './pages/public/ReservationPage';
import BlogPage from './pages/public/BlogPage';
import BlogPostDetailPage from './pages/public/BlogPostDetailPage';
import ContactPage from './pages/public/ContactPage';
import PrivacyPage from './pages/public/PrivacyPage';

import PaymentSuccessPage from '@/pages/public/PaymentSuccessPage';
import PaymentFailurePage from '@/pages/public/PaymentFailurePage';

// ── Auth ──────────────────────────────────────────────────────────────────────
import LoginPage from './pages/LoginPage';

// ── Dashboard Pages ───────────────────────────────────────────────────────────
import DashboardPage from './pages/dashboard/DashboardPage';
import AnalyticsPage from './pages/dashboard/AnalyticsPage';
import OrdersAdminPage from './pages/dashboard/OrdersAdminPage';
import MenusPage from './pages/dashboard/MenusPage';
import GalleryAdminPage from './pages/dashboard/GalleryAdminPage';
import BlogAdminPage from './pages/dashboard/BlogAdminPage';
import TestimonialsAdminPage from './pages/dashboard/TestimonialsAdminPage';
import ReservationsAdminPage from './pages/dashboard/ReservationsAdminPage';
import CustomersAdminPage from './pages/dashboard/CustomersAdminPage';
import PaymentsAdminPage from './pages/dashboard/PaymentsAdminPage';
import AnnouncementsPage from './pages/dashboard/AnnouncementsPage';
import SeoAdminPage from './pages/dashboard/SeoAdminPage';
import UsersAdminPage from './pages/dashboard/UsersAdminPage';
import SettingsPage from './pages/dashboard/SettingsPage';
import AiStudioPage from './pages/dashboard/AiStudioPage';
import StoreOpsAdminPage from './pages/dashboard/StoreOpsAdminPage';

// ── Account Pages ─────────────────────────────────────────────────────────────
import AccountDashboardPage from './pages/account/AccountDashboardPage';
import OrdersPage from './pages/account/OrdersPage';
import AccountReservationsPage from './pages/account/ReservationsPage';
import FavoritesPage from './pages/account/FavoritesPage';
import ProfilePage from './pages/account/ProfilePage';
import NotificationsPage from './pages/account/NotificationsPage';
import AccountSettingsPage from './pages/account/SettingsPage';
import LoyaltyPage from './pages/account/LoyaltyPage';
import SubscriptionsPage from './pages/account/SubscriptionsPage';
import AiRecommendationsPage from './pages/account/AiRecommendationsPage';
import ReferralsPage from './pages/account/ReferralsPage';
import StreaksPage from './pages/account/StreaksPage';

import PromotionsAdminPage from './pages/dashboard/PromotionsAdminPage';
import GrowthDashboardPage from './pages/dashboard/GrowthDashboardPage';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  /** If true, no auth required */
  public?: boolean;
  /** If set, only these roles can access (matched against UserRole) */
  roles?: string[];
}

// ── Public routes (no auth required) ─────────────────────────────────────────
export const publicRoutes: RouteConfig[] = [
  { name: 'Home',        path: '/',            element: <HomePage />,          public: true },
  { name: 'Menu',        path: '/menu',         element: <MenuPage />,          public: true },
  { name: 'Gallery',     path: '/gallery',      element: <GalleryPage />,       public: true },
  { name: 'About',       path: '/about',        element: <AboutPage />,         public: true },
  { name: 'Reservation', path: '/reservation',  element: <ReservationPage />,   public: true },
  { name: 'Blog',        path: '/blog',         element: <BlogPage />,          public: true },
  { name: 'Blog Post',   path: '/blog/:slug',   element: <BlogPostDetailPage />, public: true },
  { name: 'Contact',     path: '/contact',      element: <ContactPage />,       public: true },
  { name: 'Privacy',     path: '/privacy',      element: <PrivacyPage />,       public: true },
  { name: 'Payment Success', path: '/payment-success', element: <PaymentSuccessPage />, public: true },
  { name: 'Payment Failure', path: '/payment-failure', element: <PaymentFailurePage />, public: true },
];

// ── Auth routes ───────────────────────────────────────────────────────────────
export const authRoutes: RouteConfig[] = [
  { name: 'Login', path: '/login', element: <LoginPage />, public: true },
];

// ── Account routes (auth required, wrapped in AccountLayout) ─────────────────
export const accountRoutes: RouteConfig[] = [
  { name: 'Account Dashboard', path: '', element: <AccountDashboardPage /> },
  { name: 'Orders', path: 'orders', element: <OrdersPage /> },
  { name: 'Reservations', path: 'reservations', element: <AccountReservationsPage /> },
  { name: 'Favorites', path: 'favorites', element: <FavoritesPage /> },
  { name: 'Loyalty & Rewards', path: 'loyalty', element: <LoyaltyPage /> },
  { name: 'Subscriptions', path: 'subscriptions', element: <SubscriptionsPage /> },
  { name: 'AI Recommendations', path: 'ai-recommendations', element: <AiRecommendationsPage /> },
  { name: 'Referrals', path: 'referrals', element: <ReferralsPage /> },
  { name: 'Coffee Streaks', path: 'streaks', element: <StreaksPage /> },
  { name: 'Profile', path: 'profile', element: <ProfilePage /> },
  { name: 'Notifications', path: 'notifications', element: <NotificationsPage /> },
  { name: 'Settings', path: 'settings', element: <AccountSettingsPage /> },
];

// ── Dashboard routes (auth required, wrapped in DashboardLayout) ──────────────
export const dashboardRoutes: RouteConfig[] = [
  { name: 'Dashboard',     path: '',              element: <DashboardPage /> },
  { name: 'Analytics',     path: 'analytics',     element: <AnalyticsPage /> },
  { name: 'Growth Dashboard', path: 'growth', element: <GrowthDashboardPage /> },
  { name: 'Promotions', path: 'promotions', element: <PromotionsAdminPage /> },
  { name: 'Orders',        path: 'orders',        element: <OrdersAdminPage /> },
  { name: 'Menus',         path: 'menus',         element: <MenusPage /> },
  { name: 'Gallery',       path: 'gallery',       element: <GalleryAdminPage /> },
  { name: 'Blog',          path: 'blog',          element: <BlogAdminPage /> },
  { name: 'Testimonials',  path: 'testimonials',  element: <TestimonialsAdminPage /> },
  { name: 'Reservations',  path: 'reservations',  element: <ReservationsAdminPage /> },
  { name: 'Customers',     path: 'customers',     element: <CustomersAdminPage /> },
  { name: 'Payments',      path: 'payments',      element: <PaymentsAdminPage /> },
  { name: 'Announcements', path: 'announcements', element: <AnnouncementsPage /> },
  { name: 'SEO',           path: 'seo',           element: <SeoAdminPage /> },
  { name: 'Users',         path: 'users',         element: <UsersAdminPage />, roles: ['admin', 'owner'] },
  { name: 'Settings',      path: 'settings',      element: <SettingsPage />,   roles: ['admin', 'owner', 'manager'] },
  { name: 'AI Studio',     path: 'ai-studio',     element: <AiStudioPage /> },
  { name: 'Store Operations', path: 'store-ops',  element: <StoreOpsAdminPage /> },
];

// Legacy flat export used by any remaining consumers
export const routes: RouteConfig[] = [
  ...publicRoutes,
  ...authRoutes,
];
