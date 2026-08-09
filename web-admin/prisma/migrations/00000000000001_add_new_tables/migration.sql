-- Migration: add factories, departments, department_members, audit_logs, notifications
-- and new columns to existing tables

-- 1. New tables

CREATE TABLE IF NOT EXISTS "factories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "factories_code_key" ON "factories"("code");

CREATE TABLE IF NOT EXISTS "departments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "factoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "departments_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "factories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "departments_factoryId_code_key" ON "departments"("factoryId", "code");

CREATE TABLE IF NOT EXISTS "department_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "departmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isHead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "department_members_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "department_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "department_members_departmentId_userId_key" ON "department_members"("departmentId", "userId");

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "quality_issues" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "issueId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notifications_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "quality_issues" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 2. New columns for existing tables

-- categories: add factoryId, parentAreaId, parentLineId
ALTER TABLE "categories" ADD COLUMN "factoryId" TEXT REFERENCES "factories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "categories" ADD COLUMN "parentAreaId" TEXT REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "categories" ADD COLUMN "parentLineId" TEXT REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- users: add factoryId, mustChangePassword, passwordChangedAt
ALTER TABLE "users" ADD COLUMN "factoryId" TEXT REFERENCES "factories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "passwordChangedAt" DATETIME;

-- quality_issues: add severity, factoryId, otherFailureNote, rootCause, solution
ALTER TABLE "quality_issues" ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "quality_issues" ADD COLUMN "factoryId" TEXT REFERENCES "factories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quality_issues" ADD COLUMN "otherFailureNote" TEXT;
ALTER TABLE "quality_issues" ADD COLUMN "rootCause" TEXT;
ALTER TABLE "quality_issues" ADD COLUMN "solution" TEXT;

-- five_m_one_e_submissions: add rootCause
ALTER TABLE "five_m_one_e_submissions" ADD COLUMN "rootCause" TEXT NOT NULL DEFAULT '';

-- maintenance_tasks: add monitoringStartedAt
ALTER TABLE "maintenance_tasks" ADD COLUMN "monitoringStartedAt" DATETIME;
