/**
 * Shared parsers for the structured action tags the AI Barista
 * embeds in its replies. Kept in one place so the personal chat
 * and the shared tasting room stay in sync.
 */

export interface DrinkCardData {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  match_pct?: number;
  flavor_profile?: Record<string, number>;
  cafe_id?: string;
  caffeine_mg?: number | null;
}

/** Parse a [DRINK_CARD:{...}] tag from an AI response. */
export function parseDrinkCard(text: string): DrinkCardData | null {
  const m = text.match(/\[DRINK_CARD:(\{[^}]+\})\]/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as DrinkCardData;
  } catch {
    return null;
  }
}

/** Parse a [GIFT_INTENT:{...}] tag. */
export function parseGiftIntent(text: string): { drink_name: string } | null {
  const m = text.match(/\[GIFT_INTENT:(\{[^}]+\})\]/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/** Parse a [TASTE_MEMORY:{...}] tag. */
export function parseTasteMemory(
  text: string,
): { category?: string; preference?: string } | null {
  const m = text.match(/\[TASTE_MEMORY:(\{.*?\})\]/s);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/** Parse a [CART_ACTION:{...}] tag. */
export function parseCartAction(
  text: string,
): { item_name?: string } | null {
  const m = text.match(/\[CART_ACTION:(\{.*?\})\]/s);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/** Strip embedded tags so the bubble only shows prose. */
export function cleanBubbleText(text: string): string {
  return text
    .replace(/\[DRINK_CARD:\{[^}]+\}\]/g, '')
    .replace(/\[GIFT_INTENT:\{[^}]+\}\]/g, '')
    .replace(/\[TASTE_MEMORY:\{.*?\}\]/g, '')
    .replace(/\[CART_ACTION:\{.*?\}\]/g, '')
    .trim();
}
