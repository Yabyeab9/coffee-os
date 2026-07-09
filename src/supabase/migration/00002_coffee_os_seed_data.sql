
-- DEFAULT THEME
insert into themes (name, slug, tokens, is_system) values
(
  'Coffee OS Dark',
  'coffee-os-dark',
  '{"background":"#0d0e12","cardSurface":"#131419","secondarySurface":"#1a1b22","foreground":"#f0f0f4","mutedForeground":"#6b7280","border":"#2a2b32","primary":"#10b981","primaryForeground":"#ffffff","accent":"#14b8a6","indigo":"#6366f1"}',
  true
);

-- DEMO CAFÉ
insert into cafes (slug, name, tagline, description, cover_url, theme_id, is_published, address, city, country, phone, email, instagram_url, facebook_url)
select 'origin','Origin Coffee','Rooted in Craft. Elevated by Passion.',
  'Origin Coffee is a specialty coffee experience sourced from Ethiopia''s finest highland farms.',
  'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_48181f00-f45c-4175-bb7f-67ced657fe69.jpg',
  t.id, true, 'Bole Road, Near Atlas Hotel', 'Addis Ababa', 'Ethiopia',
  '+251 91 123 4567', 'hello@origincoffee.et',
  'https://instagram.com/origincoffeeET', 'https://facebook.com/origincoffeeET'
from themes t where t.slug = 'coffee-os-dark';

-- MENU CATEGORIES
insert into menu_categories (cafe_id, name, description, sort_order)
select c.id, 'Espresso', 'Classic and signature espresso-based drinks', 1 from cafes c where c.slug = 'origin';
insert into menu_categories (cafe_id, name, description, sort_order)
select c.id, 'Pour Over', 'Single-origin pour over selections', 2 from cafes c where c.slug = 'origin';
insert into menu_categories (cafe_id, name, description, sort_order)
select c.id, 'Cold Brew', 'Slow-steeped cold brew and iced drinks', 3 from cafes c where c.slug = 'origin';
insert into menu_categories (cafe_id, name, description, sort_order)
select c.id, 'Ethiopian Ceremony', 'Traditional Ethiopian coffee ceremony experience', 4 from cafes c where c.slug = 'origin';
insert into menu_categories (cafe_id, name, description, sort_order)
select c.id, 'Food & Pastry', 'Freshly baked goods and light bites', 5 from cafes c where c.slug = 'origin';

-- MENU ITEMS
insert into menus (cafe_id, category_id, name, description, price, currency, image_url, tags, is_available, is_featured, sort_order)
select c.id, mc.id, 'Origin Espresso',
  'A double shot of our single-origin Yirgacheffe blend. Bright, complex, with notes of blueberry and dark chocolate.',
  85, 'ETB', 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_2270a5bc-17b4-40c7-8ef0-322a14286c6f.jpg',
  ARRAY['single-origin','espresso','signature'], true, true, 1
from cafes c join menu_categories mc on mc.cafe_id = c.id and mc.name = 'Espresso' where c.slug = 'origin';

insert into menus (cafe_id, category_id, name, description, price, currency, image_url, tags, is_available, is_featured, sort_order)
select c.id, mc.id, 'White Harar',
  'Espresso with silky microfoam milk, featuring our Harar blend with jasmine and stone fruit notes.',
  110, 'ETB', 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_fed29726-2c8d-431c-93c5-745088ba6494.jpg',
  ARRAY['milk-based','espresso','popular'], true, true, 2
from cafes c join menu_categories mc on mc.cafe_id = c.id and mc.name = 'Espresso' where c.slug = 'origin';

insert into menus (cafe_id, category_id, name, description, price, currency, tags, is_available, is_featured, sort_order)
select c.id, mc.id, 'Kafa Americano',
  'Rich espresso diluted with hot water, highlighting the clean, sweet profile of our Kafa Forest blend.',
  90, 'ETB', ARRAY['espresso','simple'], true, false, 3
from cafes c join menu_categories mc on mc.cafe_id = c.id and mc.name = 'Espresso' where c.slug = 'origin';

insert into menus (cafe_id, category_id, name, description, price, currency, tags, is_available, is_featured, sort_order)
select c.id, mc.id, 'Yirgacheffe V60',
  'A delicate pour over showcasing the floral and citrus complexity of Yirgacheffe Kochere Grade 1.',
  130, 'ETB', ARRAY['pour-over','single-origin','specialty'], true, true, 1
from cafes c join menu_categories mc on mc.cafe_id = c.id and mc.name = 'Pour Over' where c.slug = 'origin';

insert into menus (cafe_id, category_id, name, description, price, currency, tags, is_available, is_featured, sort_order)
select c.id, mc.id, 'Slow Drip Cold Brew',
  'Steeped for 18 hours, our cold brew delivers a smooth, chocolatey, naturally sweet concentrate.',
  120, 'ETB', ARRAY['cold-brew','iced','summer'], true, true, 1
from cafes c join menu_categories mc on mc.cafe_id = c.id and mc.name = 'Cold Brew' where c.slug = 'origin';

insert into menus (cafe_id, category_id, name, description, price, currency, tags, is_available, is_featured, sort_order)
select c.id, mc.id, 'Full Ceremony for Two',
  'The complete Ethiopian coffee ceremony: buna roasted, ground, and brewed tableside with frankincense.',
  350, 'ETB', ARRAY['ceremony','traditional','experience','pair'], true, true, 1
from cafes c join menu_categories mc on mc.cafe_id = c.id and mc.name = 'Ethiopian Ceremony' where c.slug = 'origin';

insert into menus (cafe_id, category_id, name, description, price, currency, tags, is_available, is_featured, sort_order)
select c.id, mc.id, 'Injera Breakfast Plate',
  'Freshly made injera with tibs, ayib, and seasonal vegetables.',
  180, 'ETB', ARRAY['food','breakfast','traditional'], true, false, 1
from cafes c join menu_categories mc on mc.cafe_id = c.id and mc.name = 'Food & Pastry' where c.slug = 'origin';

-- GALLERY
insert into gallery (cafe_id, image_url, caption, alt_text, category, sort_order)
select c.id, 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_48181f00-f45c-4175-bb7f-67ced657fe69.jpg','Our signature brewing bar','Interior view of Origin Coffee bar','interior',1 from cafes c where c.slug='origin';
insert into gallery (cafe_id, image_url, caption, alt_text, category, sort_order)
select c.id, 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_fed29726-2c8d-431c-93c5-745088ba6494.jpg','Latte art in progress','Barista pouring latte art','craft',2 from cafes c where c.slug='origin';
insert into gallery (cafe_id, image_url, caption, alt_text, category, sort_order)
select c.id, 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_2270a5bc-17b4-40c7-8ef0-322a14286c6f.jpg','Single-origin Ethiopian beans','Premium Ethiopian coffee beans','beans',3 from cafes c where c.slug='origin';
insert into gallery (cafe_id, image_url, caption, alt_text, category, sort_order)
select c.id, 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_357991d1-405a-4696-a31d-ededcf0d7dda.jpg','Gallery space and seating','Modern coffee shop seating area','space',4 from cafes c where c.slug='origin';
insert into gallery (cafe_id, image_url, caption, alt_text, category, sort_order)
select c.id, 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_f423736b-6cb1-47ae-966b-dadb428df8fa.jpg','Menu layout','Coffee menu items on dark background','menu',5 from cafes c where c.slug='origin';

-- TESTIMONIALS
insert into testimonials (cafe_id, author_name, author_title, content, rating, status)
select c.id,'Yordanos Tesfaye','Food Blogger, Addis Ababa','The Yirgacheffe V60 was the best coffee I have had in Addis. The baristas are incredibly knowledgeable.',5,'approved' from cafes c where c.slug='origin';
insert into testimonials (cafe_id, author_name, author_title, content, rating, status)
select c.id,'Marcus Schwartz','Specialty Coffee Consultant','Origin Coffee is doing something genuinely special. The single-origin espresso rivals anything in specialty cafes globally.',5,'approved' from cafes c where c.slug='origin';
insert into testimonials (cafe_id, author_name, author_title, content, rating, status)
select c.id,'Hana Girma','Architect','A perfect balance of modern design and Ethiopian heritage. Best spot in Bole.',5,'approved' from cafes c where c.slug='origin';
insert into testimonials (cafe_id, author_name, author_title, content, rating, status)
select c.id,'Daniel Kebede','Tech Entrepreneur','Outstanding cold brew. Origin Coffee has become my second office.',4,'approved' from cafes c where c.slug='origin';

-- OPENING HOURS
insert into opening_hours (cafe_id, day_of_week, open_time, close_time, is_closed)
select c.id, 0, '08:00'::time, '22:00'::time, false from cafes c where c.slug='origin';
insert into opening_hours (cafe_id, day_of_week, open_time, close_time, is_closed)
select c.id, 1, '07:00'::time, '22:00'::time, false from cafes c where c.slug='origin';
insert into opening_hours (cafe_id, day_of_week, open_time, close_time, is_closed)
select c.id, 2, '07:00'::time, '22:00'::time, false from cafes c where c.slug='origin';
insert into opening_hours (cafe_id, day_of_week, open_time, close_time, is_closed)
select c.id, 3, '07:00'::time, '22:00'::time, false from cafes c where c.slug='origin';
insert into opening_hours (cafe_id, day_of_week, open_time, close_time, is_closed)
select c.id, 4, '07:00'::time, '22:00'::time, false from cafes c where c.slug='origin';
insert into opening_hours (cafe_id, day_of_week, open_time, close_time, is_closed)
select c.id, 5, '07:00'::time, '23:00'::time, false from cafes c where c.slug='origin';
insert into opening_hours (cafe_id, day_of_week, open_time, close_time, is_closed)
select c.id, 6, '08:00'::time, '23:00'::time, false from cafes c where c.slug='origin';

-- BLOG POSTS
insert into blog_posts (cafe_id, title, slug, excerpt, content, cover_url, tags, status, published_at)
select c.id,
  'The Story of Yirgacheffe: Ethiopia''s Most Celebrated Coffee Region',
  'yirgacheffe-story',
  'Nestled in the highlands of southern Ethiopia, Yirgacheffe has given the world some of its most celebrated coffees.',
  'Yirgacheffe coffee is famous worldwide for its distinctive floral and citrus notes. The region sits at altitudes between 1,700 and 2,200 meters, creating ideal conditions for slow cherry maturation. At Origin Coffee, we source directly from cooperatives in the Gedeo Zone, ensuring farmers receive fair compensation.',
  'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_2270a5bc-17b4-40c7-8ef0-322a14286c6f.jpg',
  ARRAY['origin','yirgacheffe','single-origin','ethiopia'], 'published', now() - interval '10 days'
from cafes c where c.slug='origin';

insert into blog_posts (cafe_id, title, slug, excerpt, content, cover_url, tags, status, published_at)
select c.id,
  'How to Brew the Perfect V60 at Home',
  'perfect-v60-home',
  'The V60 pour over unlocks incredible clarity and complexity in single-origin coffee.',
  'You need: a V60 dripper, paper filter, kettle, 20g freshly ground coffee, and 300ml water at 93 degrees C. Rinse your filter first to remove paper taste. Bloom for 30 seconds with 40ml water. Continue pouring slowly, reaching 300ml by 2:30 minutes. Total brew time: 3:00 to 3:30 minutes.',
  'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_fed29726-2c8d-431c-93c5-745088ba6494.jpg',
  ARRAY['brew-guide','v60','pour-over','how-to'], 'published', now() - interval '5 days'
from cafes c where c.slug='origin';

insert into blog_posts (cafe_id, title, slug, excerpt, content, cover_url, tags, status, published_at)
select c.id,
  'The Ethiopian Coffee Ceremony: A Cultural Journey in Every Cup',
  'ethiopian-coffee-ceremony',
  'Long before specialty coffee was a global trend, Ethiopia was performing a ritual that elevated coffee to a social institution.',
  'The Ethiopian coffee ceremony known as Buna is one of the most important social traditions in Ethiopia. Lasting up to two hours, the ceremony involves roasting green coffee beans over open flame, grinding them by hand, and brewing in a clay jebena pot. At Origin Coffee we offer the full ceremony experience.',
  'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_48181f00-f45c-4175-bb7f-67ced657fe69.jpg',
  ARRAY['culture','ceremony','tradition','ethiopia'], 'published', now() - interval '2 days'
from cafes c where c.slug='origin';

-- ANNOUNCEMENTS
insert into announcements (cafe_id, title, content, type, is_active)
select c.id,'New Seasonal Menu Launched','Our Sidamo Naturals limited-edition pour over is now available. Only 20 cups per day.','promo',true from cafes c where c.slug='origin';
insert into announcements (cafe_id, title, content, type, is_active)
select c.id,'Ceremony Bookings Now Open','Reserve your Ethiopian Coffee Ceremony experience online. Groups of 2 to 8 welcome.','info',true from cafes c where c.slug='origin';
