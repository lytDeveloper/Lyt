import { supabase } from '../lib/supabase';

type ProfileType = 'artist' | 'brand' | 'creative';
type ImageField = 'profile_image_url' | 'cover_image_url' | 'logo_image_url';
type IdentifierField = 'profile_id' | 'id';

function getTableName(type: ProfileType): string {
  if (type === 'artist') return 'profile_artists';
  if (type === 'brand') return 'profile_brands';
  return 'profile_creatives';
}

export async function resetUserImage(
  params: {
    type: ProfileType;
    idColumn?: IdentifierField;
    rowValue: string;
    field: ImageField;
    url: string;
  }
): Promise<{ error: string | null }> {
  const { type, idColumn = 'profile_id', rowValue, field, url } = params;
  const table = getTableName(type);
  const payload: Record<string, string | null> = { [field]: url };
  const { error } = await supabase
    .from(table)
    .update(payload)
    .eq(idColumn, rowValue);

  return { error: error?.message ?? null };
}



