export const getCafeSlug = () => {
  // In a production SaaS, this would typically read from window.location.hostname
  // For local development, we allow overriding via environment variable
  return import.meta.env.VITE_CAFE_SLUG || 'abat';
};
