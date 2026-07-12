import { useQuery } from '@tanstack/react-query';
import { getCafeBySlug, getMenuItems, getMenuCategories, getGallery, getTestimonials, getBlogPosts, getAnnouncements } from '@/lib/api';

const CAFE_SLUG = 'origin';

export function useCafe() {
  return useQuery({
    queryKey: ['cafe', CAFE_SLUG],
    queryFn: () => getCafeBySlug(CAFE_SLUG),
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

export function usePosts(cafeId?: string) {
  return useQuery({
    queryKey: ['posts', cafeId],
    queryFn: () => getBlogPosts(cafeId!, { status: 'published', page: 1 }),
    enabled: !!cafeId,
  });
}
