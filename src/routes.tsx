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
import HomepageCmsPage from './pages/dashboard/HomepageCmsPage';
import ReservationsAdminPage from './pages/dashboard/ReservationsAdminPage';
import CustomersAdminPage from './pages/dashboard/CustomersAdminPage';
import PaymentsAdminPage from './pages/dashboard/PaymentsAdminPage';
import AnnouncementsPage from './pages/dashboard/AnnouncementsPage';
import SeoAdminPage from './pages/dashboard/SeoAdminPage';
import UsersAdminPage from './pages/dashboard/UsersAdminPage';
import SettingsPage from './pages/dashboard/SettingsPage';

import StoreOpsAdminPage from './pages/dashboard/StoreOpsAdminPage';
import LoyaltyAdminPage from './pages/dashboard/LoyaltyAdminPage';
import QrScannerPage from './pages/dashboard/QrScannerPage';
import AiManagerPage from './pages/dashboard/AiManagerPage';
import ForecastsPage from './pages/dashboard/ForecastsPage';
import SmartPromosPage from './pages/dashboard/SmartPromosPage';
import IntelligencePage from './pages/dashboard/IntelligencePage';
import ExecDashboardsPage from './pages/dashboard/ExecDashboardsPage';
import ReportsHealthPage from './pages/dashboard/ReportsHealthPage';

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
import CoffeeJourneyPage from './pages/account/CoffeeJourneyPage';
import CoffeePassportPage from './pages/account/CoffeePassportPage';
import SeasonalDiscoveriesPage from './pages/account/SeasonalDiscoveriesPage';
import BeanExplorerPage from './pages/account/BeanExplorerPage';
import CoffeePersonalityPage from './pages/account/CoffeePersonalityPage';
import TrySomethingNewPage from './pages/account/TrySomethingNewPage';
import CoffeeChallengesPage from './pages/account/CoffeeChallengesPage';
import ReferralsPage from './pages/account/ReferralsPage';
import StreaksPage from './pages/account/StreaksPage';
import MembershipCardPage from './pages/account/MembershipCardPage';
import WalletPage from './pages/account/WalletPage';
import ReceiptsPage from './pages/account/ReceiptsPage';
import AchievementsPage from './pages/account/AchievementsPage';
import LeaderboardPage from './pages/account/LeaderboardPage';

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
  { name: 'Payment Success', path: '/payment/success', element: <PaymentSuccessPage />, public: true },
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
  { name: 'Membership Card', path: 'membership-card', element: <MembershipCardPage /> },
  { name: 'Wallet', path: 'wallet', element: <WalletPage /> },
  { name: 'Digital Receipts', path: 'receipts', element: <ReceiptsPage /> },
  { name: 'Loyalty & Rewards', path: 'loyalty', element: <LoyaltyPage /> },
  { name: 'Achievements', path: 'achievements', element: <AchievementsPage /> },
  { name: 'Leaderboard', path: 'leaderboard', element: <LeaderboardPage /> },
  { name: 'Subscriptions', path: 'subscriptions', element: <SubscriptionsPage /> },
  { name: 'AI Recommendations', path: 'ai-recommendations', element: <AiRecommendationsPage /> },
  { name: 'Coffee Journey', path: 'coffee-journey', element: <CoffeeJourneyPage /> },
  { name: 'Coffee Passport', path: 'coffee-passport', element: <CoffeePassportPage /> },
  { name: 'Seasonal Discoveries', path: 'seasonal-discoveries', element: <SeasonalDiscoveriesPage /> },
  { name: 'Bean Explorer', path: 'bean-explorer', element: <BeanExplorerPage /> },
  { name: 'Coffee Personality', path: 'coffee-personality', element: <CoffeePersonalityPage /> },
  { name: 'Try Something New', path: 'try-something-new', element: <TrySomethingNewPage /> },
  { name: 'Coffee Challenges', path: 'coffee-challenges', element: <CoffeeChallengesPage /> },
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
  { name: 'Homepage CMS',  path: 'homepage-cms',  element: <HomepageCmsPage /> },
  { name: 'Reservations',  path: 'reservations',  element: <ReservationsAdminPage /> },
  { name: 'QR Scanner',    path: 'scanner',       element: <QrScannerPage /> },
  { name: 'AI Manager',    path: 'ai-manager',    element: <AiManagerPage /> },
  { name: 'Forecasts',     path: 'forecasts',     element: <ForecastsPage /> },
  { name: 'Smart Promos',  path: 'smart-promos',  element: <SmartPromosPage /> },
  { name: 'Intelligence',  path: 'intelligence',  element: <IntelligencePage /> },
  { name: 'Exec Dashboards', path: 'exec-dashboards', element: <ExecDashboardsPage /> },
  { name: 'Reports & Health', path: 'reports-health', element: <ReportsHealthPage /> },
  { name: 'Customers',     path: 'customers',     element: <CustomersAdminPage /> },
  { name: 'Payments',      path: 'payments',      element: <PaymentsAdminPage /> },
  { name: 'Announcements', path: 'announcements', element: <AnnouncementsPage /> },
  { name: 'SEO',           path: 'seo',           element: <SeoAdminPage /> },
  { name: 'Users',         path: 'users',         element: <UsersAdminPage />, roles: ['admin', 'owner'] },
  { name: 'Loyalty & Rewards', path: 'loyalty', element: <LoyaltyAdminPage /> },
  { name: 'Settings',      path: 'settings',      element: <SettingsPage />,   roles: ['admin', 'owner', 'manager'] },

  { name: 'Store Operations', path: 'store-ops',  element: <StoreOpsAdminPage /> },
];

// Legacy flat export used by any remaining consumers
export const routes: RouteConfig[] = [
  ...publicRoutes,
  ...authRoutes,
];
