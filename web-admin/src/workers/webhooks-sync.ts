/**
 * Webhook handler for receiving sync events from web-admin
 * 
 * Web-admin calls this endpoint after mutations to broadcast changes to mobile
 * 
 * Routes:
 * POST /api/webhooks/sync — Receive CREATE/UPDATE/DELETE events
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { SyncEvent } from './types';

interface WebhookEnv {
  DB: D1Database;
  SYNC_WEBHOOK_SECRET: string;
  EXPO_PUSH_TOKEN_ENDPOINT?: string; // For push notifications
}

// ============================================================================
// Webhook handler — Process sync events from web-admin
// ============================================================================

export async function handleSyncWebhook(
  request: Request,
  env: WebhookEnv
): Promise<Response> {
  // Verify webhook secret
  const signature = request.headers.get('X-Sync-Signature');
  if (!signature || signature !== env.SYNC_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const event = (await request.json()) as SyncEvent;

    // Route to appropriate handler
    switch (event.type) {
      case 'ISSUE':
        await handleIssueSync(event, env);
        break;
      case 'TASK':
        await handleTaskSync(event, env);
        break;
      case 'USER':
        await handleUserSync(event, env);
        break;
      case 'SUBMISSION':
        await handleSubmissionSync(event, env);
        break;
      case 'NOTIFICATION':
        await handleNotificationSync(event, env);
        break;
      case 'AUDIT_LOG':
        await handleAuditLogSync(event, env);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Unknown event type' }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, processed: event.type }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Processing failed' }), { status: 500 });
  }
}

// ============================================================================
// Issue sync handler
// ============================================================================

async function handleIssueSync(event: SyncEvent, env: WebhookEnv): Promise<void> {
  const data = event.data as Record<string, unknown>;

  if (event.action === 'CREATE') {
    await env.DB.prepare(
      `INSERT INTO quality_issues (
        id, reporterId, description, images, poCode, status, severity,
        factoryId, areaId, teamId, productionLineId, failureCategoryId,
        otherFailureNote, investigationDeadline, investigationLocked,
        rootCause, solution, rootCauseDecidedById, rootCauseDecidedAt,
        _version, _lastSyncTime, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        data.id,
        data.reporterId,
        data.description,
        data.images,
        data.poCode,
        data.status,
        data.severity,
        data.factoryId,
        data.areaId,
        data.teamId,
        data.productionLineId,
        data.failureCategoryId,
        data.otherFailureNote,
        data.investigationDeadline,
        data.investigationLocked ? 1 : 0,
        data.rootCause,
        data.solution,
        data.rootCauseDecidedById,
        data.rootCauseDecidedAt,
        event.version,
        new Date().toISOString(),
        data.createdAt,
        data.updatedAt
      )
      .run();
  } else if (event.action === 'UPDATE') {
    const existing = await env.DB.prepare(
      `SELECT _version FROM quality_issues WHERE id = ?`
    )
      .bind(data.id)
      .first<{ _version: number }>();

    // Conflict resolution: last-write-wins
    if (existing && existing._version > (event.version || 1)) {
      // Log conflict but continue — web-admin version takes precedence
      await env.DB.prepare(
        `INSERT INTO sync_conflicts (id, entityType, entityId, webVersion, mobileVersion, resolution, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          `conflict_${data.id}_${Date.now()}`,
          'ISSUE',
          data.id,
          existing._version,
          event.version,
          'WEB_WINS',
          'Conflict detected during update'
        )
        .run();
    }

    await env.DB.prepare(
      `UPDATE quality_issues SET
        reporterId = ?, description = ?, images = ?, poCode = ?, status = ?,
        severity = ?, areaId = ?, teamId = ?, productionLineId = ?,
        failureCategoryId = ?, otherFailureNote = ?, investigationDeadline = ?,
        investigationLocked = ?, rootCause = ?, solution = ?,
        rootCauseDecidedById = ?, rootCauseDecidedAt = ?,
        _version = ?, _lastSyncTime = ?, updatedAt = ?
       WHERE id = ?`
    )
      .bind(
        data.reporterId,
        data.description,
        data.images,
        data.poCode,
        data.status,
        data.severity,
        data.areaId,
        data.teamId,
        data.productionLineId,
        data.failureCategoryId,
        data.otherFailureNote,
        data.investigationDeadline,
        data.investigationLocked ? 1 : 0,
        data.rootCause,
        data.solution,
        data.rootCauseDecidedById,
        data.rootCauseDecidedAt,
        event.version,
        new Date().toISOString(),
        data.updatedAt,
        data.id
      )
      .run();
  } else if (event.action === 'DELETE') {
    await env.DB.prepare(`DELETE FROM quality_issues WHERE id = ?`).bind(data.id).run();
  }

  // Send push notifications to affected users (if applicable)
  await notifyUsersOfIssueChange(data as Record<string, unknown>, event.action, env);
}

// ============================================================================
// Task sync handler
// ============================================================================

async function handleTaskSync(event: SyncEvent, env: WebhookEnv): Promise<void> {
  const data = event.data as Record<string, unknown>;

  if (event.action === 'CREATE') {
    await env.DB.prepare(
      `INSERT INTO maintenance_tasks (
        id, issueId, assignedById, assigneeId, status, acceptedAt, completedAt,
        repairDetail, partsReplaced, imagesBefore, imagesAfter,
        monitoringStartedAt, verifyDeadline, verifiedStatus, verifiedAt, verifiedById,
        _version, _lastSyncTime, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        data.id,
        data.issueId,
        data.assignedById,
        data.assigneeId,
        data.status,
        data.acceptedAt,
        data.completedAt,
        data.repairDetail,
        data.partsReplaced,
        data.imagesBefore,
        data.imagesAfter,
        data.monitoringStartedAt,
        data.verifyDeadline,
        data.verifiedStatus,
        data.verifiedAt,
        data.verifiedById,
        event.version,
        new Date().toISOString(),
        data.createdAt,
        data.updatedAt
      )
      .run();
  } else if (event.action === 'UPDATE') {
    await env.DB.prepare(
      `UPDATE maintenance_tasks SET
        assignedById = ?, assigneeId = ?, status = ?, acceptedAt = ?,
        completedAt = ?, repairDetail = ?, partsReplaced = ?,
        imagesBefore = ?, imagesAfter = ?, monitoringStartedAt = ?,
        verifyDeadline = ?, verifiedStatus = ?, verifiedAt = ?, verifiedById = ?,
        _version = ?, _lastSyncTime = ?, updatedAt = ?
       WHERE id = ?`
    )
      .bind(
        data.assignedById,
        data.assigneeId,
        data.status,
        data.acceptedAt,
        data.completedAt,
        data.repairDetail,
        data.partsReplaced,
        data.imagesBefore,
        data.imagesAfter,
        data.monitoringStartedAt,
        data.verifyDeadline,
        data.verifiedStatus,
        data.verifiedAt,
        data.verifiedById,
        event.version,
        new Date().toISOString(),
        data.updatedAt,
        data.id
      )
      .run();
  } else if (event.action === 'DELETE') {
    await env.DB.prepare(`DELETE FROM maintenance_tasks WHERE id = ?`).bind(data.id).run();
  }

  await notifyUsersOfTaskChange(data as Record<string, unknown>, event.action, env);
}

// ============================================================================
// User sync handler
// ============================================================================

async function handleUserSync(event: SyncEvent, env: WebhookEnv): Promise<void> {
  const data = event.data as Record<string, unknown>;

  if (event.action === 'CREATE' || event.action === 'UPDATE') {
    await env.DB.prepare(
      `INSERT INTO users (
        id, employeeCode, name, phone, passwordHash, avatarUrl,
        pushToken, role, factoryId, areaId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        name = ?, phone = ?, avatarUrl = ?, role = ?, areaId = ?, updatedAt = ?`
    )
      .bind(
        data.id,
        data.employeeCode,
        data.name,
        data.phone,
        data.passwordHash,
        data.avatarUrl,
        data.pushToken,
        data.role,
        data.factoryId,
        data.areaId,
        data.createdAt,
        data.updatedAt,
        // ON CONFLICT bindings
        data.name,
        data.phone,
        data.avatarUrl,
        data.role,
        data.areaId,
        data.updatedAt
      )
      .run();
  } else if (event.action === 'DELETE') {
    await env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(data.id).run();
  }
}

// ============================================================================
// Submission sync handler
// ============================================================================

async function handleSubmissionSync(event: SyncEvent, env: WebhookEnv): Promise<void> {
  const data = event.data as Record<string, unknown>;

  if (event.action === 'CREATE' || event.action === 'UPDATE') {
    await env.DB.prepare(
      `INSERT INTO five_m_one_e_submissions (
        id, issueId, submitterId, submitterRole, poCode, images,
        man, machine, material, method, measurement, environment, rootCause,
        _version, submittedAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        man = ?, machine = ?, material = ?, method = ?,
        measurement = ?, environment = ?, rootCause = ?, _version = ?, updatedAt = ?`
    )
      .bind(
        data.id,
        data.issueId,
        data.submitterId,
        data.submitterRole,
        data.poCode,
        data.images,
        data.man,
        data.machine,
        data.material,
        data.method,
        data.measurement,
        data.environment,
        data.rootCause,
        event.version,
        data.submittedAt,
        data.updatedAt,
        // ON CONFLICT bindings
        data.man,
        data.machine,
        data.material,
        data.method,
        data.measurement,
        data.environment,
        data.rootCause,
        event.version,
        data.updatedAt
      )
      .run();
  }
}

// ============================================================================
// Notification sync handler
// ============================================================================

async function handleNotificationSync(event: SyncEvent, env: WebhookEnv): Promise<void> {
  const data = event.data as Record<string, unknown>;

  if (event.action === 'CREATE') {
    await env.DB.prepare(
      `INSERT INTO notifications (
        id, userId, issueId, title, message, kind, isRead, readAt,
        _version, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        data.id,
        data.userId,
        data.issueId,
        data.title,
        data.message,
        data.kind,
        data.isRead ? 1 : 0,
        data.readAt,
        event.version,
        data.createdAt
      )
      .run();

    // Send Expo push if user has pushToken
    const user = await env.DB.prepare(`SELECT pushToken FROM users WHERE id = ?`)
      .bind(data.userId)
      .first<{ pushToken: string | null }>();

    if (user?.pushToken && env.EXPO_PUSH_TOKEN_ENDPOINT) {
      await sendExpoPush(user.pushToken, data as Record<string, unknown>, env);
    }
  }
}

// ============================================================================
// Audit log sync handler
// ============================================================================

async function handleAuditLogSync(event: SyncEvent, env: WebhookEnv): Promise<void> {
  const data = event.data as Record<string, unknown>;

  if (event.action === 'CREATE') {
    await env.DB.prepare(
      `INSERT INTO audit_logs (
        id, issueId, userId, action, oldStatus, newStatus, note, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        data.id,
        data.issueId,
        data.userId,
        data.action,
        data.oldStatus,
        data.newStatus,
        data.note,
        data.createdAt
      )
      .run();
  }
}

// ============================================================================
// Notification helpers
// ============================================================================

async function notifyUsersOfIssueChange(
  issue: Record<string, unknown>,
  action: string,
  env: WebhookEnv
): Promise<void> {
  // Find all users who should be notified (assignee, reporter, etc.)
  // This is simplified — in production, filter based on role/permissions
  if (action === 'UPDATE' && issue.status === 'DONE') {
    const reporter = await env.DB.prepare(
      `SELECT pushToken FROM users WHERE id = ?`
    )
      .bind(issue.reporterId)
      .first<{ pushToken: string | null }>();

    if (reporter?.pushToken && env.EXPO_PUSH_TOKEN_ENDPOINT) {
      await sendExpoPush(reporter.pushToken, { title: 'Issue Resolved' }, env);
    }
  }
}

async function notifyUsersOfTaskChange(
  task: Record<string, unknown>,
  action: string,
  env: WebhookEnv
): Promise<void> {
  // Notify assignee when task is created/updated
  if (action === 'CREATE' || action === 'UPDATE') {
    const assignee = await env.DB.prepare(
      `SELECT pushToken FROM users WHERE id = ?`
    )
      .bind(task.assigneeId)
      .first<{ pushToken: string | null }>();

    if (assignee?.pushToken && env.EXPO_PUSH_TOKEN_ENDPOINT) {
      await sendExpoPush(
        assignee.pushToken,
        { title: 'New Maintenance Task' },
        env
      );
    }
  }
}

// ============================================================================
// Expo push notification
// ============================================================================

async function sendExpoPush(
  pushToken: string,
  data: Record<string, unknown>,
  env: WebhookEnv
): Promise<void> {
  if (!env.EXPO_PUSH_TOKEN_ENDPOINT) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title: data.title || 'TBS Notification',
        body: data.message || 'You have a new update',
        data: data,
      }),
    });
  } catch (error) {
    console.error('Failed to send push:', error);
  }
}

export default {
  async fetch(request: Request, env: WebhookEnv) {
    if (request.url.includes('/api/webhooks/sync')) {
      return handleSyncWebhook(request, env);
    }
    return new Response('Not found', { status: 404 });
  },
};
