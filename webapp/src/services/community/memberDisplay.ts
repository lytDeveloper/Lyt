export const getMemberNameFromMaps = (
  member: any,
  artistMap: Map<string, any>,
  creativeMap: Map<string, any>,
): string => {
  const roles = member.profiles?.roles ?? [];
  const userId = member.user_id;

  if (roles.includes('artist')) {
    const artist = artistMap.get(userId);
    return artist?.artist_name ?? member.profiles?.nickname ?? '';
  }
  if (roles.includes('creative')) {
    const creative = creativeMap.get(userId);
    return creative?.nickname ?? member.profiles?.nickname ?? '';
  }
  return member.profiles?.nickname ?? '';
};

export const getMemberAvatarFromMaps = (
  member: any,
  artistMap: Map<string, any>,
  creativeMap: Map<string, any>,
  brandMap: Map<string, any>,
): string => {
  const roles = member.profiles?.roles ?? [];
  const userId = member.user_id;

  if (roles.includes('artist')) {
    const artist = artistMap.get(userId);
    return artist?.logo_image_url ?? '';
  }
  if (roles.includes('creative')) {
    const creative = creativeMap.get(userId);
    return creative?.profile_image_url ?? '';
  }
  if (roles.includes('brand')) {
    const brand = brandMap.get(userId);
    return brand?.logo_image_url ?? '';
  }
  return '';
};
