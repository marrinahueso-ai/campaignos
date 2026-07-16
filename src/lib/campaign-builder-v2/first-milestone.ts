/**
 * First campaign milestone = lowest sortOrder (normalized sessions use 0..n-1).
 * First milestone is always a first-time flyer / announcement — never countdown.
 */
export function isFirstCampaignMilestone(sortOrder: number): boolean {
  return sortOrder === 0;
}
