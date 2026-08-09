/**
 * Sync logic — Handles conflict resolution, versioning, and offline support
 */

import type { D1Database } from '@cloudflare/workers-types';

export enum ConflictResolution {
  WEB_WINS = 'WEB_WINS', // Web-admin version takes precedence
  MOBILE_WINS = 'MOBILE_WINS', // Mobile version takes precedence
  MANUAL = 'MANUAL', // Requires manual intervention
}

export interface SyncConflict {
  entityId: string;
  entityType: string;
  webVersion: number;
  mobileVersion: number;
  resolution: ConflictResolution;
  webData?: unknown;
  mobileData?: unknown;
}

// ============================================================================
// Last-Write-Wins (LWW) strategy
// ============================================================================

export async function resolveLWW(
  db: D1Database,
  entityType: string,
  entityId: string,
  webData: Record<string, unknown>,
  webVersion: number,
  mobileData: Record<string, unknown>,
  mobileVersion: number,
  webTimestamp: string,
  mobileTimestamp: string
): Promise<ConflictResolution> {
  // Parse timestamps
  const webTime = new Date(webTimestamp).getTime();
  const mobileTime = new Date(mobileTimestamp).getTime();

  // Latest write wins
  const resolution = webTime > mobileTime ? ConflictResolution.WEB_WINS : ConflictResolution.MOBILE_WINS;

  // Log conflict
  await db
    .prepare(
      `INSERT INTO sync_conflicts (id, entityType, entityId, webVersion, mobileVersion, resolution, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      `conflict_${entityId}_${Date.now()}`,
      entityType,
      entityId,
      webVersion,
      mobileVersion,
      resolution,
      `LWW conflict: web=${webTime}, mobile=${mobileTime}`
    )
    .run();

  return resolution;
}

// ============================================================================
// Vector clock approach (for multi-replica scenarios)
// ============================================================================

export interface VectorClock {
  [replicaId: string]: number;
}

export function compareVectorClocks(
  vc1: VectorClock,
  vc2: VectorClock
): 'EQUAL' | 'BEFORE' | 'AFTER' | 'CONCURRENT' {
  let isGreater = false;
  let isLess = false;

  const allKeys = new Set([...Object.keys(vc1), ...Object.keys(vc2)]);

  for (const key of allKeys) {
    const v1 = vc1[key] || 0;
    const v2 = vc2[key] || 0;

    if (v1 > v2) isGreater = true;
    if (v1 < v2) isLess = true;
  }

  if (!isGreater && !isLess) return 'EQUAL';
  if (isGreater && !isLess) return 'AFTER';
  if (!isGreater && isLess) return 'BEFORE';
  return 'CONCURRENT';
}

// ============================================================================
// Incremental sync — Only send changed fields
// ============================================================================

export function calculateFieldDiff(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): Record<string, unknown> {
  const diff: Record<string, unknown> = {};

  for (const key in newData) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      diff[key] = newData[key];
    }
  }

  return diff;
}

// ============================================================================
// Mobile offline queue simulation (for reference)
// ============================================================================

export interface OfflineUpdate {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  timestamp: string;
  localVersion: number;
}

export async function processOfflineQueue(
  db: D1Database,
  mobileUserId: string,
  offlineUpdates: OfflineUpdate[]
): Promise<SyncConflict[]> {
  const conflicts: SyncConflict[] = [];

  for (const update of offlineUpdates) {
    const existing = await db
      .prepare(
        `SELECT _version, _lastSyncTime FROM ${update.entityType.toLowerCase()} WHERE id = ?`
      )
      .bind(update.entityId)
      .first<{ _version: number; _lastSyncTime: string }>();

    if (existing && existing._version > update.localVersion) {
      // Conflict detected
      conflicts.push({
        entityId: update.entityId,
        entityType: update.entityType,
        webVersion: existing._version,
        mobileVersion: update.localVersion,
        resolution: ConflictResolution.WEB_WINS, // Default to web-wins
        mobileData: update.data,
      });
    } else {
      // No conflict — apply update
      if (update.operation === 'UPDATE') {
        await db
          .prepare(
            `UPDATE ${update.entityType.toLowerCase()} 
             SET _version = _version + 1, _lastSyncTime = ?, updatedAt = ?
             WHERE id = ?`
          )
          .bind(new Date().toISOString(), new Date().toISOString(), update.entityId)
          .run();
      }
    }
  }

  return conflicts;
}

// ============================================================================
// Sync metadata tracking
// ============================================================================

export async function updateLastSyncTime(
  db: D1Database,
  syncType: 'web' | 'mobile'
): Promise<void> {
  const key = syncType === 'web' ? 'last_web_sync' : 'last_mobile_sync';

  await db
    .prepare(
      `INSERT INTO sync_metadata (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = ?, updatedAt = CURRENT_TIMESTAMP`
    )
    .bind(key, new Date().toISOString(), new Date().toISOString())
    .run();
}

export async function getLastSyncTime(db: D1Database, syncType: 'web' | 'mobile'): Promise<string> {
  const key = syncType === 'web' ? 'last_web_sync' : 'last_mobile_sync';

  const result = await db
    .prepare(`SELECT value FROM sync_metadata WHERE key = ?`)
    .bind(key)
    .first<{ value: string }>();

  return result?.value || '1970-01-01T00:00:00Z';
}

// ============================================================================
// Batch sync optimization
// ============================================================================

export async function batchSyncIssues(
  db: D1Database,
  factoryId: string,
  since: string,
  limit: number = 100
): Promise<Array<Record<string, unknown>>> {
  const issues = await db
    .prepare(
      `SELECT * FROM quality_issues 
       WHERE factoryId = ? AND updatedAt > ? 
       ORDER BY updatedAt DESC 
       LIMIT ?`
    )
    .bind(factoryId, since, limit)
    .all();

  return issues as Array<Record<string, unknown>>;
}

export async function batchSyncTasks(
  db: D1Database,
  factoryId: string,
  since: string,
  limit: number = 100
): Promise<Array<Record<string, unknown>>> {
  const tasks = await db
    .prepare(
      `SELECT mt.* FROM maintenance_tasks mt
       JOIN quality_issues qi ON mt.issueId = qi.id
       WHERE qi.factoryId = ? AND mt.updatedAt > ?
       ORDER BY mt.updatedAt DESC
       LIMIT ?`
    )
    .bind(factoryId, since, limit)
    .all();

  return tasks as Array<Record<string, unknown>>;
}

// ============================================================================
// Change Data Capture (CDC) simulation
// ============================================================================

export interface CDCEvent {
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  timestamp: string;
}

export async function getCDCEvents(
  db: D1Database,
  since: string,
  limit: number = 100
): Promise<CDCEvent[]> {
  // In a production system, this would read from a WAL (Write-Ahead Log)
  // or a proper CDC system. For now, we simulate by reading audit logs.

  const auditLogs = await db
    .prepare(
      `SELECT id, issueId, action, oldStatus, newStatus, createdAt FROM audit_logs
       WHERE createdAt > ?
       ORDER BY createdAt DESC
       LIMIT ?`
    )
    .bind(since, limit)
    .all();

  return auditLogs.map((log: any) => ({
    operation: 'UPDATE',
    entityType: 'ISSUE',
    entityId: log.issueId,
    before: { status: log.oldStatus },
    after: { status: log.newStatus },
    timestamp: log.createdAt,
  }));
}

// ============================================================================
// Compression for large payloads
// ============================================================================

export async function compressSync(data: Record<string, unknown>): Promise<string> {
  // Using base64 + JSON for demo. In production, use gzip compression
  const json = JSON.stringify(data);
  return btoa(json);
}

export async function decompressSync(compressed: string): Promise<Record<string, unknown>> {
  const json = atob(compressed);
  return JSON.parse(json);
}

// ============================================================================
// Throttling & rate limiting
// ============================================================================

const syncRateLimits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(userId: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const limit = syncRateLimits.get(userId);

  if (!limit || now > limit.resetAt) {
    syncRateLimits.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (limit.count < maxRequests) {
    limit.count++;
    return true;
  }

  return false;
}

// ============================================================================
// Selective sync (only changed data)
// ============================================================================

export interface SelectiveSyncFilter {
  entityTypes?: string[];
  statuses?: string[];
  since?: string;
  areaId?: string;
  factoryId?: string;
}

export async function selectiveSync(
  db: D1Database,
  filter: SelectiveSyncFilter
): Promise<{ issues: unknown[]; tasks: unknown[] }> {
  let issueQuery = 'SELECT * FROM quality_issues WHERE 1=1';
  const issueParams: unknown[] = [];

  if (filter.since) {
    issueQuery += ' AND updatedAt > ?';
    issueParams.push(filter.since);
  }

  if (filter.statuses) {
    const placeholders = filter.statuses.map(() => '?').join(',');
    issueQuery += ` AND status IN (${placeholders})`;
    issueParams.push(...filter.statuses);
  }

  if (filter.areaId) {
    issueQuery += ' AND areaId = ?';
    issueParams.push(filter.areaId);
  }

  if (filter.factoryId) {
    issueQuery += ' AND factoryId = ?';
    issueParams.push(filter.factoryId);
  }

  issueQuery += ' ORDER BY updatedAt DESC';

  let prepared = db.prepare(issueQuery);
  issueParams.forEach((p) => {
    prepared = prepared.bind(p);
  });

  const issues = await prepared.all();

  return {
    issues,
    tasks: [], // Similar logic for tasks
  };
}
