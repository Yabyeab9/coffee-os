import { supabase } from '@/lib/supabase';
import type {
  Cafe, MenuItem, MenuCategory, GalleryItem, Testimonial,
  BlogPost, Reservation, OpeningHours, Announcement, AiGeneration,
  AiFeature, PaginatedResult, Theme,
} from '@/types/database';

const PAGE_SIZE = 20;

// ============================================================
// CAFES
// ============================================================
export async function getCafeBySlug(slug: string): Promise<Cafe | null> {
  const { data } = await supabase
    .from('cafes')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  return data;
}

export async function getAllCafes(): Promise<Cafe[]> {
  const { data } = await supabase
    .from('cafes')
    .select('*')
    .order('name', { ascending: true })
    .limit(100);
  return Array.isArray(data) ? data : [];
}

export async function updateCafe(id: string, updates: Partial<Cafe>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('cafes').update(updates).eq('id', id);
  return { error: error?.message ?? null };
}

// ============================================================
// THEMES
// ============================================================
export async function getThemes(): Promise<Theme[]> {
  const { data } = await supabase
    .from('themes')
    .select('*')
    .order('name', { ascending: true })
    .limit(50);
  return Array.isArray(data) ? data : [];
}

// ============================================================
// MENU CATEGORIES
// ============================================================
export async function getMenuCategories(cafeId: string): Promise<MenuCategory[]> {
  const { data } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('cafe_id', cafeId)
    .order('sort_order', { ascending: true })
    .limit(50);
  return Array.isArray(data) ? data : [];
}

export async function createMenuCategory(payload: Omit<MenuCategory, 'id' | 'created_at'>) {
  const { error } = await supabase.from('menu_categories').insert(payload);
  return { error: error?.message ?? null };
}

export async function updateMenuCategory(id: string, updates: Partial<MenuCategory>) {
  const { error } = await supabase.from('menu_categories').update(updates).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteMenuCategory(id: string) {
  const { error } = await supabase.from('menu_categories').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ============================================================
// MENU ITEMS
// ============================================================
export async function getMenuItems(
  cafeId: string,
  opts?: { categoryId?: string; featured?: boolean; page?: number }
): Promise<PaginatedResult<MenuItem>> {
  const page = opts?.page ?? 1;
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('menus')
    .select('*, category:menu_categories!menus_category_id_fkey(*)', { count: 'exact' })
    .eq('cafe_id', cafeId)
    .order('sort_order', { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  if (opts?.categoryId) query = query.eq('category_id', opts.categoryId);
  if (opts?.featured) query = query.eq('is_featured', true);

  const { data, count } = await query;
  const items = Array.isArray(data) ? data : [];
  const total = count ?? 0;
  return { data: items, total, page, pageSize: PAGE_SIZE, hasMore: from + PAGE_SIZE < total };
}

export async function createMenuItem(payload: Omit<MenuItem, 'id' | 'created_at' | 'updated_at' | 'category'>) {
  const { error } = await supabase.from('menus').insert(payload);
  return { error: error?.message ?? null };
}

export async function updateMenuItem(id: string, updates: Partial<MenuItem>) {
  const { error } = await supabase.from('menus').update(updates).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteMenuItem(id: string) {
  const { error } = await supabase.from('menus').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ============================================================
// GALLERY
// ============================================================
export async function getGallery(cafeId: string, category?: string): Promise<GalleryItem[]> {
  let query = supabase
    .from('gallery')
    .select('*')
    .eq('cafe_id', cafeId)
    .order('sort_order', { ascending: true })
    .limit(100);
  if (category) query = query.eq('category', category);
  const { data } = await query;
  return Array.isArray(data) ? data : [];
}

export async function createGalleryItem(payload: Omit<GalleryItem, 'id' | 'created_at' | 'updated_at'>) {
  const { error } = await supabase.from('gallery').insert(payload);
  return { error: error?.message ?? null };
}

export async function updateGalleryItem(id: string, updates: Partial<GalleryItem>) {
  const { error } = await supabase.from('gallery').update(updates).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteGalleryItem(id: string) {
  const { error } = await supabase.from('gallery').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ============================================================
// TESTIMONIALS
// ============================================================
export async function getTestimonials(cafeId: string, approvedOnly = true): Promise<Testimonial[]> {
  let query = supabase
    .from('testimonials')
    .select('*')
    .eq('cafe_id', cafeId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (approvedOnly) query = query.eq('status', 'approved');
  const { data } = await query;
  return Array.isArray(data) ? data : [];
}

export async function updateTestimonialStatus(id: string, status: 'approved' | 'rejected' | 'pending') {
  const { error } = await supabase.from('testimonials').update({ status }).eq('id', id);
  return { error: error?.message ?? null };
}

// ============================================================
// BLOG POSTS
// ============================================================
export async function getBlogPosts(
  cafeId: string,
  opts?: { status?: string; page?: number }
): Promise<PaginatedResult<BlogPost>> {
  const page = opts?.page ?? 1;
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .eq('cafe_id', cafeId)
    .order('published_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (opts?.status) query = query.eq('status', opts.status);
  const { data, count } = await query;
  const items = Array.isArray(data) ? data : [];
  const total = count ?? 0;
  return { data: items, total, page, pageSize: PAGE_SIZE, hasMore: from + PAGE_SIZE < total };
}

export async function getBlogPostBySlug(cafeId: string, slug: string): Promise<BlogPost | null> {
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('cafe_id', cafeId)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  return data;
}

export async function createBlogPost(payload: Omit<BlogPost, 'id' | 'created_at' | 'updated_at' | 'author'>) {
  const { error } = await supabase.from('blog_posts').insert(payload);
  return { error: error?.message ?? null };
}

export async function updateBlogPost(id: string, updates: Partial<BlogPost>) {
  const { error } = await supabase.from('blog_posts').update(updates).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteBlogPost(id: string) {
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ============================================================
// RESERVATIONS
// ============================================================
export async function createReservation(
  payload: Omit<Reservation, 'id' | 'status' | 'internal_notes' | 'created_at' | 'updated_at'>
) {
  const { error } = await supabase.from('reservations').insert({ ...payload, status: 'pending' });
  return { error: error?.message ?? null };
}

export async function getReservations(
  cafeId: string,
  opts?: { status?: string; date?: string; dateRange?: { start: string, end: string }; search?: string; page?: number; pageSize?: number }
): Promise<PaginatedResult<Reservation>> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? PAGE_SIZE;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from('reservations')
    .select('*', { count: 'exact' })
    .eq('cafe_id', cafeId)
    .order('reservation_date', { ascending: true })
    .order('reservation_time', { ascending: true })
    .range(from, from + pageSize - 1);

  if (opts?.status && opts.status !== 'all') query = query.eq('status', opts.status);
  if (opts?.date) query = query.eq('reservation_date', opts.date);
  if (opts?.dateRange) {
    query = query.gte('reservation_date', opts.dateRange.start).lte('reservation_date', opts.dateRange.end);
  }
  if (opts?.search) {
    query = query.or(`guest_name.ilike.%${opts.search}%,guest_email.ilike.%${opts.search}%,guest_phone.ilike.%${opts.search}%`);
  }

  const { data, count } = await query;
  const items = Array.isArray(data) ? data : [];
  const total = count ?? 0;
  return { data: items, total, page, pageSize, hasMore: from + pageSize < total };
}

export async function updateReservationStatus(
  id: string,
  status: 'pending' | 'confirmed' | 'cancelled' | 'no_show' | 'completed',
  internalNotes?: string
) {
  const updates: Record<string, unknown> = { status };
  if (internalNotes !== undefined) updates.internal_notes = internalNotes || null;
  const { error } = await supabase.from('reservations').update(updates).eq('id', id);
  return { error: error?.message ?? null };
}

// ============================================================
// OPENING HOURS
// ============================================================
export async function getOpeningHours(cafeId: string): Promise<OpeningHours[]> {
  const { data } = await supabase
    .from('opening_hours')
    .select('*')
    .eq('cafe_id', cafeId)
    .order('day_of_week', { ascending: true });
  return Array.isArray(data) ? data : [];
}

export async function upsertOpeningHours(rows: Omit<OpeningHours, 'id'>[]) {
  const { error } = await supabase
    .from('opening_hours')
    .upsert(rows, { onConflict: 'cafe_id,day_of_week' });
  return { error: error?.message ?? null };
}

// ============================================================
// ANNOUNCEMENTS
// ============================================================
export async function getAnnouncements(cafeId: string, activeOnly = true): Promise<Announcement[]> {
  let query = supabase
    .from('announcements')
    .select('*')
    .eq('cafe_id', cafeId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (activeOnly) query = query.eq('is_active', true);
  const { data } = await query;
  return Array.isArray(data) ? data : [];
}

// ============================================================
// AI GENERATIONS
// ============================================================
export async function logAiGeneration(payload: Omit<AiGeneration, 'id' | 'created_at'>) {
  const { error } = await supabase.from('ai_generations').insert(payload);
  return { error: error?.message ?? null };
}

export async function getAiGenerations(
  cafeId: string,
  opts?: { feature?: AiFeature; page?: number }
): Promise<PaginatedResult<AiGeneration>> {
  const page = opts?.page ?? 1;
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('ai_generations')
    .select('*', { count: 'exact' })
    .eq('cafe_id', cafeId)
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (opts?.feature) query = query.eq('feature', opts.feature);
  const { data, count } = await query;
  const items = Array.isArray(data) ? data : [];
  const total = count ?? 0;
  return { data: items, total, page, pageSize: PAGE_SIZE, hasMore: from + PAGE_SIZE < total };
}

export async function updateAiGenerationFeedback(id: string, feedback: 1 | -1) {
  const { error } = await supabase.from('ai_generations').update({ feedback }).eq('id', id);
  return { error: error?.message ?? null };
}

// ============================================================
// DASHBOARD ANALYTICS HELPERS
// ============================================================
export async function getDashboardStats(cafeId: string) {
  const today = new Date().toISOString().split('T')[0];

  const [todayRes, totalRes, galleryCount, aiCount] = await Promise.all([
    supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('cafe_id', cafeId)
      .eq('reservation_date', today),
    supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('cafe_id', cafeId),
    supabase
      .from('gallery')
      .select('id', { count: 'exact', head: true })
      .eq('cafe_id', cafeId),
    supabase
      .from('ai_generations')
      .select('id', { count: 'exact', head: true })
      .eq('cafe_id', cafeId),
  ]);

  return {
    reservationsToday: todayRes.count ?? 0,
    totalReservations: totalRes.count ?? 0,
    galleryImages: galleryCount.count ?? 0,
    aiGenerations: aiCount.count ?? 0,
  };
}

export async function getReservationTrend(cafeId: string): Promise<{ date: string; count: number }[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data } = await supabase
    .from('reservations')
    .select('reservation_date')
    .eq('cafe_id', cafeId)
    .gte('reservation_date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('reservation_date', { ascending: true })
    .limit(300);

  if (!data) return [];

  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.reservation_date] = (counts[row.reservation_date] ?? 0) + 1;
  }

  return Object.entries(counts).map(([date, count]) => ({ date, count }));
}
