// Coffee OS — Database Types
// Auto-derived from Supabase schema. Do not hardcode values.

export type UserRole = 'admin' | 'owner' | 'manager' | 'editor' | 'customer';
export type ReservationStatus = 'pending' | 'pending_verification' | 'verified' | 'pending_payment' | 'paid' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'refunded' | 'no_show';
export type ContentStatus = 'draft' | 'published';
export type TestimonialStatus = 'pending' | 'approved' | 'rejected';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentProvider = 'telebirr' | 'cbe_birr' | 'stripe' | 'paypal' | 'chapa' | 'santimpay' | 'arifpay';
export type AnnouncementType = 'info' | 'warning' | 'success' | 'promo';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Theme {
  id: string;
  name: string;
  slug: string;
  tokens: Record<string, string>;
  is_system: boolean;
  created_at: string;
}

export interface Cafe {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  cover_url: string | null;
  theme_id: string | null;
  domain: string | null;
  address: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  tiktok_url: string | null;
  is_published: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  cafe_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  cafe_id: string;
  slug: string;
  title: string;
  meta_description: string | null;
  is_home: boolean;
  status: ContentStatus;
  sections: PageSection[];
  seo_data: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PageSection {
  id: string;
  type: 'hero' | 'menu' | 'gallery' | 'testimonials' | 'features' | 'reservation' | 'blog' | 'contact' | 'cta' | 'custom';
  props: Record<string, unknown>;
  order: number;
}

export interface MenuCategory {
  id: string;
  cafe_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  cafe_id: string;
  category_id: string | null;
  sku?: string | null;
  name: string;
  description: string | null;
  price: number | null;
  sale_price?: number | null;
  currency: string;
  image_url: string | null;
  tags: string[];
  dietary: Record<string, boolean>;
  modifier_groups?: Record<string, any> | null;
  is_available: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // joined
  category?: MenuCategory;
}

export interface GalleryItem {
  id: string;
  cafe_id: string;
  image_url: string;
  caption: string | null;
  alt_text: string | null;
  category: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  cafe_id: string;
  author_name: string;
  author_title: string | null;
  content: string;
  rating: number | null;
  image_url: string | null;
  status: TestimonialStatus;
  created_at: string;
}

export interface BlogPost {
  id: string;
  cafe_id: string;
  author_id: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_url: string | null;
  tags: string[];
  status: ContentStatus;
  seo_data: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author?: User;
}

export interface Reservation {
  id: string;
  cafe_id: string;
  user_id?: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  status: ReservationStatus;
  notes: string | null;
  internal_notes: string | null;
  reservation_code?: string | null;
  qr_token?: string | null;
  payment_status?: string | null;
  check_in_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}


export interface OpeningHours {
  id: string;
  cafe_id: string;
  day_of_week: number; // 0=Sun, 6=Sat
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export interface Announcement {
  id: string;
  cafe_id: string;
  title: string;
  content: string | null;
  type: AnnouncementType;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface SeoRecord {
  id: string;
  cafe_id: string;
  page_slug: string;
  title: string | null;
  description: string | null;
  og_image_url: string | null;
  canonical: string | null;
  structured_data: Record<string, unknown>;
  keywords: string[];
  created_at: string;
  updated_at: string;
}

export interface MediaItem {
  id: string;
  cafe_id: string;
  url: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  alt_text: string | null;
  caption: string | null;
  tags: string[];
  created_at: string;
}

export interface AiGeneration {
  id: string;
  cafe_id: string | null;
  user_id: string | null;
  feature: AiFeature;
  model: string | null;
  prompt: string | null;
  output: string | null;
  tokens_used: number | null;
  latency_ms: number | null;
  feedback: number | null;
  created_at: string;
}

export type AiFeature =
  | 'website_builder'
  | 'theme_generator'
  | 'brand_generator'
  | 'menu_generator'
  | 'product_description'
  | 'blog_writer'
  | 'marketing_studio'
  | 'seo_generator'
  | 'business_advisor'
  | 'analytics_assistant'
  | 'translation'
  | 'review_assistant'
  | 'campaign_generator'
  | 'image_alt'
  | 'faq_chat';

export interface AiChatSession {
  id: string;
  cafe_id: string | null;
  session_hash: string | null;
  created_at: string;
}

export interface AiChatMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface Payment {
  id: string;
  reservation_id: string | null;
  order_id: string | null;
  provider: string;
  provider_reference: string | null;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
}

// API helpers
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Order {
  id: string;
  user_id: string;
  cafe_id: string;
  reservation_id?: string;
  order_number: string;
  subtotal: number;
  tax: number;
  service_fee: number;
  total_amount: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  customization?: any;
  created_at: string;
}

export interface LoyaltyPoint {
  id: string;
  user_id: string;
  cafe_id: string;
  points: number;
  available_points: number;
  streak_weeks: number;
  tier: Tier;
  total_earned: number;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  user_id: string;
  cafe_id: string;
  source: string;
  points: number;
  description: string | null;
  order_id: string | null;
  reservation_id: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  cafe_id: string;
  plan_name: string;
  monthly_price: number;
  benefits: Record<string, any>;
  starts_at: string;
  expires_at: string | null;
  active: boolean;
  payment_provider: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiRecommendation {
  id: string;
  user_id: string;
  cafe_id: string;
  recommendation_type: string;
  prompt: string | null;
  result: Record<string, any>;
  accepted: boolean;
  order_id: string | null;
  created_at: string;
}

export interface Referral {
  id: string;
  cafe_id: string;
  inviter_id: string;
  invited_id: string | null;
  referral_code: string;
  status: string;
  reward_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserStreak {
  id: string;
  user_id: string;
  cafe_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity: string | null;
  reward_level: number;
  created_at: string;
  updated_at: string;
}

export interface Promotion {
  id: string;
  cafe_id: string;
  title: string;
  description: string | null;
  trigger_type: string;
  reward_type: string;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  cafe_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}
