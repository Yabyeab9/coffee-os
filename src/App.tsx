import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthGuard, PublicOnlyGuard } from '@/components/common/RouteGuard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Public pages ──────────────────────────────────────────────────────────────
import HomePage from '@/pages/public/HomePage';
import MenuPage from '@/pages/public/MenuPage';
import GalleryPage from '@/pages/public/GalleryPage';
import AboutPage from '@/pages/public/AboutPage';
import ReservationPage from '@/pages/public/ReservationPage';
import ReservationVerifyPage from '@/pages/public/ReservationVerifyPage';
import BlogPage from '@/pages/public/BlogPage';
import BlogPostDetailPage from '@/pages/public/BlogPostDetailPage';
import ContactPage from '@/pages/public/ContactPage';
import PrivacyPage from '@/pages/public/PrivacyPage';
import PaymentSuccessPage from '@/pages/public/PaymentSuccessPage';
import PaymentFailurePage from '@/pages/public/PaymentFailurePage';

// ── Auth ──────────────────────────────────────────────────────────────────────
import LoginPage from '@/pages/LoginPage';

// ── Dashboard pages ───────────────────────────────────────────────────────────
import DashboardPage from '@/pages/dashboard/DashboardPage';
import AnalyticsPage from '@/pages/dashboard/AnalyticsPage';
import MenusPage from '@/pages/dashboard/MenusPage';
import GalleryAdminPage from '@/pages/dashboard/GalleryAdminPage';
import BlogAdminPage from '@/pages/dashboard/BlogAdminPage';
import TestimonialsAdminPage from '@/pages/dashboard/TestimonialsAdminPage';
import ReservationsAdminPage from '@/pages/dashboard/ReservationsAdminPage';
import AnnouncementsPage from '@/pages/dashboard/AnnouncementsPage';
import SeoAdminPage from '@/pages/dashboard/SeoAdminPage';
import UsersAdminPage from '@/pages/dashboard/UsersAdminPage';
import SettingsPage from '@/pages/dashboard/SettingsPage';
import AiStudioPage from '@/pages/dashboard/AiStudioPage';

// ── Account pages ─────────────────────────────────────────────────────────────
import AccountLayout from '@/components/layout/AccountLayout';
import AccountDashboardPage from '@/pages/account/AccountDashboardPage';
import AccountOrdersPage from '@/pages/account/OrdersPage';
import AccountReservationsPage from '@/pages/account/ReservationsPage';
import AccountFavoritesPage from '@/pages/account/FavoritesPage';
import AccountProfilePage from '@/pages/account/ProfilePage';
import AccountNotificationsPage from '@/pages/account/NotificationsPage';
import AccountSettingsPage from '@/pages/account/SettingsPage';
import AccountLoyaltyPage from '@/pages/account/LoyaltyPage';
import AccountSubscriptionsPage from '@/pages/account/SubscriptionsPage';
import AccountAiRecommendationsPage from '@/pages/account/AiRecommendationsPage';
import AccountReferralsPage from '@/pages/account/ReferralsPage';
import AccountStreaksPage from '@/pages/account/StreaksPage';
import OrdersAdminPage from '@/pages/dashboard/OrdersAdminPage';
import CustomersAdminPage from '@/pages/dashboard/CustomersAdminPage';
import PaymentsAdminPage from '@/pages/dashboard/PaymentsAdminPage';

import GrowthDashboardPage from '@/pages/dashboard/GrowthDashboardPage';
import PromotionsAdminPage from '@/pages/dashboard/PromotionsAdminPage';
import ReservationScannerPage from '@/pages/dashboard/ReservationScannerPage';

/** Renders DashboardLayout wrapping nested <Route> children via Outlet */
function DashboardShell() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

function AccountShell() {
  return <AccountLayout />;
}

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <IntersectObserver />
          <Routes>
          {/* ── Public routes ───────────────────────────────────────────── */}
          <Route path="/" element={<HomePage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/reservation" element={<ReservationPage />} />
          <Route path="/reservation/verify/:reservationId" element={<ReservationVerifyPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostDetailPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/payment-failure" element={<PaymentFailurePage />} />

          {/* ── Login — redirect if already signed in ───────────────────── */}
          <Route element={<PublicOnlyGuard />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* ── Dashboard — auth required ───────────────────────────────── */}
          <Route element={<AuthGuard />}>
            <Route element={<AuthGuard enforceAccount />}>
              <Route path="/account" element={<AccountShell />}>
                <Route index element={<AccountDashboardPage />} />
                <Route path="orders" element={<AccountOrdersPage />} />
                <Route path="reservations" element={<AccountReservationsPage />} />
                <Route path="favorites" element={<AccountFavoritesPage />} />
                <Route path="loyalty" element={<AccountLoyaltyPage />} />
                <Route path="subscriptions" element={<AccountSubscriptionsPage />} />
                <Route path="ai-recommendations" element={<AccountAiRecommendationsPage />} />
                <Route path="referrals" element={<AccountReferralsPage />} />
                <Route path="streaks" element={<AccountStreaksPage />} />
                <Route path="profile" element={<AccountProfilePage />} />
                <Route path="notifications" element={<AccountNotificationsPage />} />
                <Route path="settings" element={<AccountSettingsPage />} />
              </Route>
            </Route>

            <Route element={<AuthGuard enforceDashboard />}>
              <Route path="/dashboard" element={<DashboardShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="growth" element={<GrowthDashboardPage />} />
                <Route path="promotions" element={<PromotionsAdminPage />} />
                <Route path="orders" element={<OrdersAdminPage />} />
                <Route path="menus" element={<MenusPage />} />
                <Route path="gallery" element={<GalleryAdminPage />} />
                <Route path="blog" element={<BlogAdminPage />} />
                <Route path="testimonials" element={<TestimonialsAdminPage />} />
                <Route path="reservations" element={<ReservationsAdminPage />} />
                <Route path="customers" element={<CustomersAdminPage />} />
                <Route path="payments" element={<PaymentsAdminPage />} />
                <Route path="scanner" element={<ReservationScannerPage />} />
                <Route path="announcements" element={<AnnouncementsPage />} />
                <Route path="seo" element={<SeoAdminPage />} />
                <Route path="ai-studio" element={<AiStudioPage />} />
                {/* Owner/Admin only */}
                <Route element={<AuthGuard roles={['admin', 'owner', 'manager']} />}>
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
                <Route element={<AuthGuard roles={['admin', 'owner']} />}>
                  <Route path="users" element={<UsersAdminPage />} />
                </Route>
              </Route>
            </Route>
          </Route>

          {/* ── Fallback ────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </Router>
    </QueryClientProvider>
  );
};

export default App;
