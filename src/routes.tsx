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

// ── Auth ──────────────────────────────────────────────────────────────────────
import LoginPage from './pages/LoginPage';

// ── Dashboard Pages ───────────────────────────────────────────────────────────
import DashboardPage from './pages/dashboard/DashboardPage';
import AnalyticsPage from './pages/dashboard/AnalyticsPage';
import MenusPage from './pages/dashboard/MenusPage';
import GalleryAdminPage from './pages/dashboard/GalleryAdminPage';
import BlogAdminPage from './pages/dashboard/BlogAdminPage';
import TestimonialsAdminPage from './pages/dashboard/TestimonialsAdminPage';
import ReservationsAdminPage from './pages/dashboard/ReservationsAdminPage';
import AnnouncementsPage from './pages/dashboard/AnnouncementsPage';
import SeoAdminPage from './pages/dashboard/SeoAdminPage';
import UsersAdminPage from './pages/dashboard/UsersAdminPage';
import SettingsPage from './pages/dashboard/SettingsPage';
import AiStudioPage from './pages/dashboard/AiStudioPage';

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
];

// ── Auth routes ───────────────────────────────────────────────────────────────
export const authRoutes: RouteConfig[] = [
  { name: 'Login', path: '/login', element: <LoginPage />, public: true },
];

// ── Dashboard routes (auth required, wrapped in DashboardLayout) ──────────────
export const dashboardRoutes: RouteConfig[] = [
  { name: 'Dashboard',     path: '',              element: <DashboardPage /> },
  { name: 'Analytics',     path: 'analytics',     element: <AnalyticsPage /> },
  { name: 'Menus',         path: 'menus',         element: <MenusPage /> },
  { name: 'Gallery',       path: 'gallery',       element: <GalleryAdminPage /> },
  { name: 'Blog',          path: 'blog',          element: <BlogAdminPage /> },
  { name: 'Testimonials',  path: 'testimonials',  element: <TestimonialsAdminPage /> },
  { name: 'Reservations',  path: 'reservations',  element: <ReservationsAdminPage /> },
  { name: 'Announcements', path: 'announcements', element: <AnnouncementsPage /> },
  { name: 'SEO',           path: 'seo',           element: <SeoAdminPage /> },
  { name: 'Users',         path: 'users',         element: <UsersAdminPage />, roles: ['admin', 'owner'] },
  { name: 'Settings',      path: 'settings',      element: <SettingsPage />,   roles: ['admin', 'owner', 'manager'] },
  { name: 'AI Studio',     path: 'ai-studio',     element: <AiStudioPage /> },
];

// Legacy flat export used by any remaining consumers
export const routes: RouteConfig[] = [
  ...publicRoutes,
  ...authRoutes,
];
