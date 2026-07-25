import { useQuery } from '@tanstack/react-query';
import { 
  getCafeBySlug, 
  getMenuItems, 
  getMenuCategories, 
  getGallery, 
  getTestimonials, 
  getBlogPosts, 
  getAnnouncements,
  getDashboardStats,
  getReservationTrend,
  getReservations,
  getOrders
} from '@/lib/api';

import { getCafeSlug } from '@/lib/cafe-config';
const CAFE_SLUG = getCafeSlug();

export function useCafe() {
  const CAFE_SLUG = getCafeSlug();
  return useQuery({
    queryKey: ['cafe', CAFE_SLUG],
    queryFn: () => getCafeBySlug(CAFE_SLUG),
  });
}

export function useDashboardStats(cafeId?: string) {
  return useQuery({
    queryKey: ['dashboardStats', cafeId],
    queryFn: () => getDashboardStats(cafeId!),
    enabled: !!cafeId,
  });
}

export function useReservationTrend(cafeId?: string) {
  return useQuery({
    queryKey: ['reservationTrend', cafeId],
    queryFn: () => getReservationTrend(cafeId!),
    enabled: !!cafeId,
  });
}

export function useReservationsList(cafeId?: string, opts?: any) {
  return useQuery({
    queryKey: ['reservations', cafeId, opts],
    queryFn: () => getReservations(cafeId!, opts),
    enabled: !!cafeId,
  });
}

export function useOrdersList(cafeId?: string) {
  return useQuery({
    queryKey: ['orders', cafeId],
    queryFn: () => getOrders(cafeId!),
    enabled: !!cafeId,
  });
}

export function useMenuCategories(cafeId?: string) {
  return useQuery({
    queryKey: ['menuCategories', cafeId],
    queryFn: () => getMenuCategories(cafeId!),
    enabled: !!cafeId,
  });
}

export function useMenuItems(cafeId?: string, opts?: { categoryId?: string; featured?: boolean; page?: number }) {
  return useQuery({
    queryKey: ['menuItems', cafeId, opts],
    queryFn: () => getMenuItems(cafeId!, opts),
    enabled: !!cafeId,
  });
}

export function useGallery(cafeId?: string) {
  return useQuery({
    queryKey: ['gallery', cafeId],
    queryFn: () => getGallery(cafeId!),
    enabled: !!cafeId,
  });
}

export function useTestimonials(cafeId?: string) {
  return useQuery({
    queryKey: ['testimonials', cafeId],
    queryFn: () => getTestimonials(cafeId!),
    enabled: !!cafeId,
  });
}

export function useAnnouncements(cafeId?: string) {
  return useQuery({
    queryKey: ['announcements', cafeId],
    queryFn: () => getAnnouncements(cafeId!),
    enabled: !!cafeId,
  });
}

export function usePosts(cafeId?: string, opts?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: ['posts', cafeId, opts],
    queryFn: () => getBlogPosts(cafeId!, opts),
    enabled: !!cafeId,
  });
}
