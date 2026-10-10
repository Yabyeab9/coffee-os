import { useSyncExternalStore } from 'react';

/**
 * Shared order tray (cart) store.
 *
 * The tray is the connective tissue between AI Barista recommendations and the
 * menu checkout flow. It persists to localStorage on this device so a drink
 * added from chat is waiting on the menu page — no server round trip required
 * until the customer actually checks out (which uses the existing
 * `process_direct_checkout` / `process_checkout_with_redemption` RPCs).
 */

export interface TrayCustomization {
  milk?: string;
  sugar?: number;
}

export interface TrayItem {
  /** menus.id */
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  cafe_id: string;
  quantity: number;
  caffeine_mg?: number | null;
  customization?: TrayCustomization;
  added_at: number;
}

const STORAGE_KEY = 'coffee_os_tray_v1';
const MAX_LINES = 30;

let cache: TrayItem[] | null = null;
const listeners = new Set<() => void>();

function read(): TrayItem[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter(isValidItem) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function isValidItem(item: unknown): item is TrayItem {
  const i = item as TrayItem | null;
  return !!i && typeof i.id === 'string' && typeof i.name === 'string';
}

function write(next: TrayItem[]) {
  cache = next.slice(0, MAX_LINES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or unavailable — tray still works for this session in memory.
  }
  listeners.forEach(listener => listener());
}

export function getTray(): TrayItem[] {
  return read();
}

export function subscribeTray(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function addToTray(
  item: Omit<TrayItem, 'quantity' | 'added_at'>,
  options?: TrayCustomization,
): TrayItem[] {
  const tray = read();
  const customizationKey = normalizeOptions(options);
  const existing = tray.find(
    line => line.id === item.id && normalizeOptions(line.customization) === customizationKey,
  );
  let next: TrayItem[];
  if (existing) {
    next = tray.map(line =>
      line === existing ? { ...line, quantity: Math.min(line.quantity + 1, 20) } : line,
    );
  } else {
    next = [...tray, { ...item, quantity: 1, added_at: Date.now(), customization: options }];
  }
  write(next);
  return next;
}

export function setTrayQuantity(id: string, customization: TrayCustomization | undefined, quantity: number): TrayItem[] {
  const key = normalizeOptions(customization);
  const next = read()
    .map(line =>
      line.id === id && normalizeOptions(line.customization) === key ? { ...line, quantity } : line,
    )
    .filter(line => line.quantity > 0);
  write(next);
  return next;
}

export function removeFromTray(id: string, customization?: TrayCustomization): TrayItem[] {
  const key = normalizeOptions(customization);
  const next = read().filter(line => !(line.id === id && normalizeOptions(line.customization) === key));
  write(next);
  return next;
}

export function clearTray(): void {
  write([]);
}

export function traySummary(): { lines: number; items: number; subtotal: number } {
  const tray = read();
  return {
    lines: tray.length,
    items: tray.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: tray.reduce((sum, line) => sum + (line.price ?? 0) * line.quantity, 0),
  };
}

function normalizeOptions(options?: TrayCustomization): string {
  if (!options) return '';
  return `${options.milk ?? ''}|${options.sugar ?? ''}`;
}

/** React binding — re-renders on any tray change across the app. */
export function useTray(): TrayItem[] {
  return useSyncExternalStore(subscribeTray, getTray, getTray);
}
