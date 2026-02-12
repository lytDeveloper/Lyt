/**
 * Team Helper Functions
 *
 * Utility functions for extracting leader and member information
 * from members arrays (CollaborationMember[] or ProjectMember[])
 */

/**
 * Get the leader from a members array
 * @param members Array of members with isLeader property
 * @returns Leader member or null if not found
 */
export const getLeader = <T extends { isLeader: boolean }>(
  members: T[] | undefined
): T | null => {
  if (!members || members.length === 0) return null;
  return members.find(m => m.isLeader) || null;
};

/**
 * Get all non-leader members from a members array
 * @param members Array of members with isLeader property
 * @returns Array of non-leader members
 */
export const getNonLeaderMembers = <T extends { isLeader: boolean }>(
  members: T[] | undefined
): T[] => {
  if (!members) return [];
  return members.filter(m => !m.isLeader);
};

/**
 * Get the leader's name from a members array
 * @param members Array of members with isLeader and name properties
 * @returns Leader's name or empty string if not found
 */
export const getLeaderName = <T extends { isLeader: boolean; name: string }>(
  members: T[] | undefined
): string => {
  const leader = getLeader(members);
  return leader?.name || '';
};

/**
 * Get the leader's activity field from a members array
 * @param members Array of members with isLeader and activityField properties
 * @returns Leader's activity field or empty string if not found
 */
export const getLeaderField = <T extends { isLeader: boolean; activityField: string }>(
  members: T[] | undefined
): string => {
  const leader = getLeader(members);
  return leader?.activityField || '';
};

/**
 * Get the leader's profile image URL from a members array
 * @param members Array of members with isLeader and profileImageUrl properties
 * @returns Leader's profile image URL or empty string if not found
 */
export const getLeaderAvatar = <T extends { isLeader: boolean; profileImageUrl: string }>(
  members: T[] | undefined
): string => {
  const leader = getLeader(members);
  return leader?.profileImageUrl || '';
};

/**
 * Get the leader's ID from a members array
 * @param members Array of members with isLeader and userId properties
 * @returns Leader's user ID or empty string if not found
 */
export const getLeaderId = <T extends { isLeader: boolean; userId: string }>(
  members: T[] | undefined
): string => {
  const leader = getLeader(members);
  return leader?.userId || '';
};

/**
 * Get the total count of members
 * @param members Array of members
 * @returns Total member count
 */
export const getTotalMembers = <T>(
  members: T[] | undefined
): number => {
  return members?.length || 0;
};
