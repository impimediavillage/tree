import type { ShareStats, ShareAnalytics } from '@/types/social-share';

/**
 * Export share analytics data to CSV format
 */
export function exportAnalyticsToCSV(
  analytics: ShareAnalytics[],
  dispensaryName: string
): void {
  if (analytics.length === 0) {
    throw new Error('No analytics data to export');
  }

  // CSV headers
  const headers = ['Date', 'Platform', 'Clicks', 'UTM Source', 'UTM Medium', 'UTM Campaign', 'Referrer'];
  
  // Convert analytics to CSV rows
  const rows = analytics.map(record => [
    new Date(record.timestamp).toLocaleString(),
    record.platform,
    record.clicks?.toString() || '0',
    record.utmSource || '',
    record.utmMedium || '',
    record.utmCampaign || '',
    record.referrer || ''
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${dispensaryName}_share_analytics_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Export share stats summary to CSV
 */
export function exportStatsToCSV(
  stats: ShareStats,
  dispensaryName: string
): void {
  // Platform breakdown
  const platformData = Object.entries(stats.sharesByPlatform || {}).map(([platform, shares]) => ({
    Platform: platform,
    Shares: shares,
    Clicks: stats.clicksByPlatform?.[platform as keyof typeof stats.clicksByPlatform] || 0
  }));

  const headers = ['Platform', 'Shares', 'Clicks'];
  const rows = platformData.map(row => [row.Platform, row.Shares.toString(), row.Clicks.toString()]);

  // Add summary row
  rows.unshift(['TOTAL', stats.totalShares.toString(), stats.totalClicks.toString()]);
  rows.unshift(['']); // Empty row for spacing
  rows.unshift([`Share Statistics for ${dispensaryName}`]);
  rows.unshift([`Generated on: ${new Date().toLocaleString()}`]);
  rows.unshift(['']);
  rows.unshift([`Consecutive Days Streak: ${stats.consecutiveDays}`]);
  rows.unshift([`Achievements Unlocked: ${stats.achievements.length}`]);
  rows.unshift(['']);

  const csvContent = [
    ...rows.map(row => row.join(',')),
    '',
    headers.join(','),
    ...platformData.map(row => [row.Platform, row.Shares, row.Clicks].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${dispensaryName}_share_stats_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Generate UTM parameters for tracking
 */
export function generateUTMUrl(
  baseUrl: string,
  platform: string,
  campaign?: string
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', platform);
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set('utm_campaign', campaign || 'store-share');
  return url.toString();
}

/**
 * Calculate share performance score
 */
export function calculatePerformanceScore(stats: ShareStats): number {
  const shareScore = Math.min(stats.totalShares / 100, 1) * 40; // Max 40 points
  const clickScore = Math.min(stats.totalClicks / 500, 1) * 30; // Max 30 points
  const streakScore = Math.min(stats.consecutiveDays / 30, 1) * 20; // Max 20 points
  const achievementScore = Math.min(stats.achievements.length / 6, 1) * 10; // Max 10 points
  
  return Math.round(shareScore + clickScore + streakScore + achievementScore);
}

/**
 * Get performance rank based on score
 */
export function getPerformanceRank(score: number): {
  rank: string;
  color: string;
  icon: string;
} {
  if (score >= 90) return { rank: 'Legendary', color: '#FFD700', icon: '👑' };
  if (score >= 75) return { rank: 'Master', color: '#C0C0C0', icon: '⭐' };
  if (score >= 60) return { rank: 'Expert', color: '#CD7F32', icon: '🔥' };
  if (score >= 40) return { rank: 'Advanced', color: '#006B3E', icon: '🚀' };
  if (score >= 20) return { rank: 'Intermediate', color: '#3D2E17', icon: '📈' };
  return { rank: 'Beginner', color: '#808080', icon: '🌱' };
}
