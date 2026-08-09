/**
 * Mobile API endpoints for data sync
 * Serves as the sync bridge between web-admin and mobile-app
 * 
 * Routes:
 * GET  /api/mobile/me — Get current user profile
 * GET  /api/mobile/issues — List all issues (with pagination)
 * GET  /api/mobile/issues/:id — Get single issue with full details
 * GET  /api/mobile/categories?type=AREA|PRODUCTION_LINE|TEAM — Get categories
 * GET  /api/mobile/issue-failure-categories — Get failure categories
 * GET  /api/mobile/part-categories — Get part categories
 * POST /api/mobile/sync — Sync issues (pull latest changes)
 * POST /api/mobile/issues/:id/submit — Submit task completion
 */

import { Router } from 'itty-router';
import type { IRequest } from 'itty-router';
import type { D1Database } from '@cloudflare/workers-types';
import {
  QualityIssue,
  Category,
  User,
  MobileListIssuesResponse,
  MobileGetIssueResponse,
  MobileListCategoriesResponse,
} from './types';

interface WorkerEnv {
  DB: D1Database;
  SYNC_WEBHOOK_SECRET: string;
}

interface RequestWithEnv extends IRequest {
  env: WorkerEnv;
}

const router = Router<RequestWithEnv>();

// ============================================================================
// Auth middleware — Verify JWT token from mobile
// ============================================================================

async function verifyMobileToken(request: RequestWithEnv): Promise<{ userId: string; role: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  // TODO: Implement JWT verification
  // For now, extract from Authorization header (in production, validate with web-admin)
  const token = authHeader.substring(7);

  // In production: Call web-admin to validate token
  // const validation = await fetch('https://web-admin.example.com/api/auth/verify', {
  //   headers: { 'Authorization': `Bearer ${token}` }
  // });
  // const { userId, role } = await validation.json();

  // Placeholder: Extract from header for demo
  try {
    // This should be replaced with actual JWT validation or API call to web-admin
    const decoded = JSON.parse(atob(token.split('.')[1]));
    return { userId: decoded.sub, role: decoded.role };
  } catch {
    return null;
  }
}

// ============================================================================
// GET /api/mobile/me — Current user profile
// ============================================================================

router.get('/api/mobile/me', async (req: RequestWithEnv) => {
  const auth = await verifyMobileToken(req);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const user = await req.env.DB.prepare(
    `SELECT id, employeeCode, name, phone, avatarUrl, role, areaId, factoryId
     FROM users WHERE id = ?`
  )
    .bind(auth.userId)
    .first<User>();

  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
  }

  return new Response(JSON.stringify({ user }), { headers: { 'Content-Type': 'application/json' } });
});

// ============================================================================
// GET /api/mobile/issues — List all issues (paginated)
// ============================================================================

router.get('/api/mobile/issues', async (req: RequestWithEnv) => {
  const auth = await verifyMobileToken(req);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '20', 10));
  const offset = (page - 1) * limit;

  const issues = await req.env.DB.prepare(
    `SELECT 
       qi.id, qi.reporterId, qi.description, qi.images, qi.poCode,
       qi.status, qi.severity, qi.areaId, qi.teamId, qi.productionLineId,
       qi.failureCategoryId, qi.investigationLocked, qi.rootCause, qi.solution,
       qi.rootCauseDecidedAt, qi.createdAt, qi.updatedAt
     FROM quality_issues qi
     WHERE qi.factoryId = (SELECT factoryId FROM users WHERE id = ?)
     ORDER BY qi.createdAt DESC
     LIMIT ? OFFSET ?`
  )
    .bind(auth.userId, limit, offset)
    .all<QualityIssue>();

  const totalResult = await req.env.DB.prepare(
    `SELECT COUNT(*) as count FROM quality_issues 
     WHERE factoryId = (SELECT factoryId FROM users WHERE id = ?)`
  )
    .bind(auth.userId)
    .first<{ count: number }>();

  const total = totalResult?.count || 0;

  return new Response(
    JSON.stringify({
      issues,
      total,
      page,
      limit,
      lastSync: new Date().toISOString(),
    } as MobileListIssuesResponse),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

// ============================================================================
// GET /api/mobile/issues/:id — Get single issue with details
// ============================================================================

router.get('/api/mobile/issues/:id', async (req: RequestWithEnv) => {
  const auth = await verifyMobileToken(req);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const issueId = req.params.id;

  // Fetch issue
  const issue = await req.env.DB.prepare(
    `SELECT 
       qi.id, qi.reporterId, qi.description, qi.images, qi.poCode,
       qi.status, qi.severity, qi.areaId, qi.teamId, qi.productionLineId,
       qi.failureCategoryId, qi.investigationLocked, qi.rootCause, qi.solution,
       qi.rootCauseDecidedAt, qi.createdAt, qi.updatedAt
     FROM quality_issues qi
     WHERE qi.id = ? AND qi.factoryId = (SELECT factoryId FROM users WHERE id = ?)`
  )
    .bind(issueId, auth.userId)
    .first<QualityIssue>();

  if (!issue) {
    return new Response(JSON.stringify({ error: 'Issue not found' }), { status: 404 });
  }

  // Fetch reporter
  const reporter = await req.env.DB.prepare(
    `SELECT id, employeeCode, name, phone, avatarUrl, role FROM users WHERE id = ?`
  )
    .bind(issue.reporterId)
    .first<User>();

  // Fetch submissions
  const submissions = await req.env.DB.prepare(
    `SELECT * FROM five_m_one_e_submissions WHERE issueId = ?`
  )
    .bind(issueId)
    .all();

  // Fetch maintenance task
  const task = await req.env.DB.prepare(
    `SELECT * FROM maintenance_tasks WHERE issueId = ?`
  )
    .bind(issueId)
    .first();

  return new Response(
    JSON.stringify({
      issue: {
        ...issue,
        reporter,
        submissions,
        task,
      },
    } as MobileGetIssueResponse),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

// ============================================================================
// GET /api/mobile/categories — Get categories (by type)
// ============================================================================

router.get('/api/mobile/categories', async (req: RequestWithEnv) => {
  const auth = await verifyMobileToken(req);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const areaId = url.searchParams.get('areaId');
  const lineId = url.searchParams.get('lineId');

  let query = `SELECT id, type, name, colorHex, parentAreaId, parentLineId, "order" FROM categories WHERE 1=1`;
  const params: unknown[] = [];

  if (type) {
    query += ` AND type = ?`;
    params.push(type);
  }

  if (areaId) {
    query += ` AND parentAreaId = ?`;
    params.push(areaId);
  }

  if (lineId) {
    query += ` AND parentLineId = ?`;
    params.push(lineId);
  }

  query += ` ORDER BY "order" ASC`;

  let prepared = req.env.DB.prepare(query);
  params.forEach((p) => {
    prepared = prepared.bind(p);
  });

  const categories = await prepared.all<Category>();

  return new Response(
    JSON.stringify({ categories } as MobileListCategoriesResponse),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

// ============================================================================
// GET /api/mobile/issue-failure-categories
// ============================================================================

router.get('/api/mobile/issue-failure-categories', async (req: RequestWithEnv) => {
  const auth = await verifyMobileToken(req);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const categories = await req.env.DB.prepare(
    `SELECT id, name, "order" FROM issue_failure_categories ORDER BY "order" ASC`
  ).all();

  return new Response(JSON.stringify({ categories }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

// ============================================================================
// GET /api/mobile/part-categories
// ============================================================================

router.get('/api/mobile/part-categories', async (req: RequestWithEnv) => {
  const auth = await verifyMobileToken(req);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const categories = await req.env.DB.prepare(
    `SELECT id, name, "order" FROM part_categories ORDER BY "order" ASC`
  ).all();

  return new Response(JSON.stringify({ categories }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

// ============================================================================
// POST /api/mobile/sync — Incremental sync (pull latest changes)
// ============================================================================

router.post('/api/mobile/sync', async (req: RequestWithEnv) => {
  const auth = await verifyMobileToken(req);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const body = (await req.json()) as { lastSyncTime?: string };
  const lastSyncTime = body.lastSyncTime || '1970-01-01T00:00:00Z';

  // Get updated issues since lastSyncTime
  const updatedIssues = await req.env.DB.prepare(
    `SELECT id, reporterId, description, images, poCode,
            status, severity, areaId, teamId, productionLineId,
            failureCategoryId, investigationLocked, rootCause, solution,
            rootCauseDecidedAt, createdAt, updatedAt
     FROM quality_issues
     WHERE factoryId = (SELECT factoryId FROM users WHERE id = ?)
       AND updatedAt > ?
     ORDER BY updatedAt DESC`
  )
    .bind(auth.userId, lastSyncTime)
    .all<QualityIssue>();

  // Get updated tasks since lastSyncTime
  const updatedTasks = await req.env.DB.prepare(
    `SELECT mt.* FROM maintenance_tasks mt
     JOIN quality_issues qi ON mt.issueId = qi.id
     WHERE qi.factoryId = (SELECT factoryId FROM users WHERE id = ?)
       AND mt.updatedAt > ?
     ORDER BY mt.updatedAt DESC`
  )
    .bind(auth.userId, lastSyncTime)
    .all();

  const currentTime = new Date().toISOString();

  return new Response(
    JSON.stringify({
      success: true,
      lastSyncTime: currentTime,
      newIssues: updatedIssues.length,
      updatedIssues: updatedIssues.length,
      issues: updatedIssues,
      tasks: updatedTasks,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

// ============================================================================
// POST /api/mobile/issues/:id/submit — Submit task completion from mobile
// ============================================================================

router.post('/api/mobile/issues/:id/submit', async (req: RequestWithEnv) => {
  const auth = await verifyMobileToken(req);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const issueId = req.params.id;
  const body = await req.json() as {
    repairDetail: string;
    partsReplaced?: Array<{ partCategoryId: string; quantity: number; note?: string }>;
    imagesBefore?: string[];
    imagesAfter?: string[];
  };

  // Get task
  const task = await req.env.DB.prepare(
    `SELECT id FROM maintenance_tasks WHERE issueId = ?`
  )
    .bind(issueId)
    .first<{ id: string }>();

  if (!task) {
    return new Response(JSON.stringify({ error: 'Task not found' }), { status: 404 });
  }

  // Update task with completion details
  await req.env.DB.prepare(
    `UPDATE maintenance_tasks 
     SET status = 'DONE',
         completedAt = CURRENT_TIMESTAMP,
         repairDetail = ?,
         partsReplaced = ?,
         imagesAfter = ?,
         updatedAt = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(
      body.repairDetail,
      JSON.stringify(body.partsReplaced || []),
      JSON.stringify(body.imagesAfter || []),
      task.id
    )
    .run();

  // Update issue status to DONE if all steps complete
  await req.env.DB.prepare(
    `UPDATE quality_issues 
     SET status = 'DONE', updatedAt = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(issueId)
    .run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

// ============================================================================
// Error handling
// ============================================================================

router.all('*', () => {
  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
});

export default router;
