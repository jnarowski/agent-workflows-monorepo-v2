/**
 * Project sync utilities for localStorage management
 * Prevents unnecessary project syncing on every page load
 */

const PROJECT_SYNC_KEY = 'project_last_sync';
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface ProjectSyncState {
  lastSyncTimestamp: number;
  userId?: string;
}

/**
 * Check if projects need to be synced based on last sync time
 */
export function shouldSyncProjects(userId?: string): boolean {
  try {
    const stored = localStorage.getItem(PROJECT_SYNC_KEY);

    if (!stored) {
      return true; // First time, should sync
    }

    const state: ProjectSyncState = JSON.parse(stored);

    // If user changed, sync again
    if (userId && state.userId !== userId) {
      return true;
    }

    const now = Date.now();
    const timeSinceLastSync = now - state.lastSyncTimestamp;

    // Sync if more than SYNC_INTERVAL_MS has passed
    return timeSinceLastSync > SYNC_INTERVAL_MS;
  } catch (error) {
    console.error('Error checking project sync state:', error);
    return true; // On error, sync to be safe
  }
}

/**
 * Mark projects as synced in localStorage
 */
export function markProjectsSynced(userId?: string): void {
  try {
    const state: ProjectSyncState = {
      lastSyncTimestamp: Date.now(),
      userId,
    };
    localStorage.setItem(PROJECT_SYNC_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error marking projects as synced:', error);
  }
}

/**
 * Clear project sync state (useful for manual refresh or logout)
 */
export function clearProjectSyncState(): void {
  try {
    localStorage.removeItem(PROJECT_SYNC_KEY);
  } catch (error) {
    console.error('Error clearing project sync state:', error);
  }
}

/**
 * Get the last sync timestamp
 */
export function getLastSyncTimestamp(): number | null {
  try {
    const stored = localStorage.getItem(PROJECT_SYNC_KEY);
    if (!stored) return null;

    const state: ProjectSyncState = JSON.parse(stored);
    return state.lastSyncTimestamp;
  } catch (error) {
    console.error('Error getting last sync timestamp:', error);
    return null;
  }
}
