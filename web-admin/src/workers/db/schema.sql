-- D1 Database Schema for TBS HTPH-CLSK Sync
-- This mirrors the Prisma schema but optimized for Cloudflare D1 (SQLite)

-- ============================================================================
-- Factories
-- ============================================================================
CREATE TABLE IF NOT EXISTS factories (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  employeeCode TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  passwordHash TEXT,
  avatarUrl TEXT,
  pushToken TEXT,
  role TEXT NOT NULL DEFAULT 'OPERATOR',
  factoryId TEXT,
  areaId TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (factoryId) REFERENCES factories(id) ON DELETE SET NULL,
  FOREIGN KEY (areaId) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_employeeCode ON users(employeeCode);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_factoryId ON users(factoryId);

-- ============================================================================
-- Categories (Khu vực, Chuyền, Tổ)
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('AREA', 'PRODUCTION_LINE', 'TEAM')),
  name TEXT NOT NULL,
  colorHex TEXT,
  factoryId TEXT,
  parentAreaId TEXT,
  parentLineId TEXT,
  "order" INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(type, name),
  FOREIGN KEY (factoryId) REFERENCES factories(id) ON DELETE CASCADE,
  FOREIGN KEY (parentAreaId) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (parentLineId) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_factoryId ON categories(factoryId);
CREATE INDEX IF NOT EXISTS idx_categories_parentAreaId ON categories(parentAreaId);
CREATE INDEX IF NOT EXISTS idx_categories_parentLineId ON categories(parentLineId);

-- ============================================================================
-- Issue Failure Categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS issue_failure_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_issue_failure_categories_order ON issue_failure_categories("order");

-- ============================================================================
-- Part Categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS part_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Quality Issues
-- ============================================================================
CREATE TABLE IF NOT EXISTS quality_issues (
  id TEXT PRIMARY KEY,
  reporterId TEXT NOT NULL,
  description TEXT NOT NULL,
  images TEXT,
  poCode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'REPORTED' CHECK (status IN ('REPORTED', 'INVESTIGATING', 'ROOT_CAUSE_FOUND', 'ASSIGNED', 'IN_PROGRESS', 'DONE')),
  severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  factoryId TEXT,
  areaId TEXT,
  teamId TEXT,
  productionLineId TEXT,
  failureCategoryId TEXT,
  otherFailureNote TEXT,
  investigationDeadline DATETIME,
  investigationLocked BOOLEAN DEFAULT 0,
  rootCause TEXT,
  solution TEXT,
  rootCauseDecidedById TEXT,
  rootCauseDecidedAt DATETIME,
  _version INTEGER DEFAULT 1,
  _lastSyncTime DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporterId) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (factoryId) REFERENCES factories(id) ON DELETE SET NULL,
  FOREIGN KEY (areaId) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (teamId) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (productionLineId) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (failureCategoryId) REFERENCES issue_failure_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (rootCauseDecidedById) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_quality_issues_status ON quality_issues(status);
CREATE INDEX IF NOT EXISTS idx_quality_issues_severity ON quality_issues(severity);
CREATE INDEX IF NOT EXISTS idx_quality_issues_reporterId ON quality_issues(reporterId);
CREATE INDEX IF NOT EXISTS idx_quality_issues_areaId ON quality_issues(areaId);
CREATE INDEX IF NOT EXISTS idx_quality_issues_factoryId ON quality_issues(factoryId);
CREATE INDEX IF NOT EXISTS idx_quality_issues_createdAt ON quality_issues(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_quality_issues_updatedAt ON quality_issues(updatedAt DESC);

-- ============================================================================
-- 5M+1E Submissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS five_m_one_e_submissions (
  id TEXT PRIMARY KEY,
  issueId TEXT NOT NULL,
  submitterId TEXT NOT NULL,
  submitterRole TEXT NOT NULL CHECK (submitterRole IN ('QA', 'LINE_LEADER', 'TECHNOLOGY')),
  poCode TEXT NOT NULL,
  images TEXT,
  man TEXT NOT NULL,
  machine TEXT NOT NULL,
  material TEXT NOT NULL,
  method TEXT NOT NULL,
  measurement TEXT NOT NULL,
  environment TEXT NOT NULL,
  rootCause TEXT DEFAULT '',
  _version INTEGER DEFAULT 1,
  submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(issueId, submitterId),
  FOREIGN KEY (issueId) REFERENCES quality_issues(id) ON DELETE CASCADE,
  FOREIGN KEY (submitterId) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_five_m_one_e_issueId ON five_m_one_e_submissions(issueId);
CREATE INDEX IF NOT EXISTS idx_five_m_one_e_submitterId ON five_m_one_e_submissions(submitterId);

-- ============================================================================
-- Maintenance Tasks
-- ============================================================================
CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id TEXT PRIMARY KEY,
  issueId TEXT UNIQUE NOT NULL,
  assignedById TEXT NOT NULL,
  assigneeId TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DONE')),
  acceptedAt DATETIME,
  completedAt DATETIME,
  repairDetail TEXT,
  partsReplaced TEXT,
  imagesBefore TEXT,
  imagesAfter TEXT,
  monitoringStartedAt DATETIME,
  verifyDeadline DATETIME,
  verifiedStatus TEXT NOT NULL DEFAULT 'PENDING' CHECK (verifiedStatus IN ('PENDING', 'CONFIRMED_DONE', 'REJECTED')),
  verifiedAt DATETIME,
  verifiedById TEXT,
  _version INTEGER DEFAULT 1,
  _lastSyncTime DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (issueId) REFERENCES quality_issues(id) ON DELETE CASCADE,
  FOREIGN KEY (assignedById) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (assigneeId) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (verifiedById) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_issueId ON maintenance_tasks(issueId);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_status ON maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_assigneeId ON maintenance_tasks(assigneeId);

-- ============================================================================
-- Notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  issueId TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  kind TEXT NOT NULL,
  isRead BOOLEAN DEFAULT 0,
  readAt DATETIME,
  _version INTEGER DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (issueId) REFERENCES quality_issues(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId);
CREATE INDEX IF NOT EXISTS idx_notifications_isRead ON notifications(isRead);
CREATE INDEX IF NOT EXISTS idx_notifications_createdAt ON notifications(createdAt DESC);

-- ============================================================================
-- Audit Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  issueId TEXT NOT NULL,
  userId TEXT,
  action TEXT NOT NULL,
  oldStatus TEXT,
  newStatus TEXT,
  note TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (issueId) REFERENCES quality_issues(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_issueId ON audit_logs(issueId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_userId ON audit_logs(userId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_createdAt ON audit_logs(createdAt DESC);

-- ============================================================================
-- Sync Metadata (for tracking last sync times)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO sync_metadata (key, value) VALUES ('last_web_sync', '1970-01-01T00:00:00Z');
INSERT OR IGNORE INTO sync_metadata (key, value) VALUES ('last_mobile_sync', '1970-01-01T00:00:00Z');

-- ============================================================================
-- Conflict Resolution History
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id TEXT PRIMARY KEY,
  entityType TEXT NOT NULL,
  entityId TEXT NOT NULL,
  webVersion INTEGER,
  mobileVersion INTEGER,
  resolution TEXT NOT NULL CHECK (resolution IN ('WEB_WINS', 'MOBILE_WINS', 'MANUAL')),
  resolvedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolvedById TEXT,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entityId ON sync_conflicts(entityType, entityId);
