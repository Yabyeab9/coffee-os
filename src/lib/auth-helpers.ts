export function getRedirectPathByRole(role?: string | null): string {
  if (role === 'customer') return '/account';
  if (['admin', 'owner', 'manager', 'editor'].includes(role || '')) return '/dashboard';
  return '/account';
}
