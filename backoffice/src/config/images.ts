export const DEFAULT_PROFILE_URL = import.meta.env.VITE_DEFAULT_PROFILE_URL as string;
export const DEFAULT_COVER_URL = import.meta.env.VITE_DEFAULT_COVER_URL as string;
export const DEFAULT_LOGO_URL = import.meta.env.VITE_DEFAULT_LOGO_URL as string;

type ImageField = 'profile_image_url' | 'cover_image_url' | 'logo_image_url';

export function getDefaultUrlFor(field: ImageField): string {
  if (field === 'logo_image_url') return DEFAULT_LOGO_URL;
  if (field === 'cover_image_url') return DEFAULT_COVER_URL;
  return DEFAULT_PROFILE_URL;
}



