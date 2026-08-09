-- CreateTable
CREATE TABLE "factories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "factoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "departments_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "factories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "department_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "departmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isHead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "department_members_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "department_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorHex" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "factoryId" TEXT,
    "parentAreaId" TEXT,
    "parentLineId" TEXT,
    CONSTRAINT "categories_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "factories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "categories_parentAreaId_fkey" FOREIGN KEY ("parentAreaId") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "categories_parentLineId_fkey" FOREIGN KEY ("parentLineId") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "issue_failure_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "part_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "pushToken" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "passwordChangedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "factoryId" TEXT,
    "areaId" TEXT,
    CONSTRAINT "users_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "factories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "users_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quality_issues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reporterId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "images" TEXT,
    "poCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "factoryId" TEXT,
    "areaId" TEXT,
    "teamId" TEXT,
    "productionLineId" TEXT,
    "failureCategoryId" TEXT,
    "otherFailureNote" TEXT,
    "investigationDeadline" DATETIME,
    "investigationLocked" BOOLEAN NOT NULL DEFAULT false,
    "rootCause" TEXT,
    "solution" TEXT,
    "rootCauseDecidedById" TEXT,
    "rootCauseDecidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quality_issues_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quality_issues_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "factories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quality_issues_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quality_issues_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quality_issues_productionLineId_fkey" FOREIGN KEY ("productionLineId") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quality_issues_failureCategoryId_fkey" FOREIGN KEY ("failureCategoryId") REFERENCES "issue_failure_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quality_issues_rootCauseDecidedById_fkey" FOREIGN KEY ("rootCauseDecidedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "five_m_one_e_submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueId" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "submitterRole" TEXT NOT NULL,
    "poCode" TEXT NOT NULL,
    "images" TEXT,
    "man" TEXT NOT NULL,
    "machine" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "measurement" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "rootCause" TEXT NOT NULL DEFAULT '',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "five_m_one_e_submissions_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "quality_issues" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "five_m_one_e_submissions_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "maintenance_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "acceptedAt" DATETIME,
    "completedAt" DATETIME,
    "repairDetail" TEXT,
    "partsReplaced" TEXT,
    "imagesBefore" TEXT,
    "imagesAfter" TEXT,
    "monitoringStartedAt" DATETIME,
    "verifyDeadline" DATETIME,
    "lastVerifyPingAt" DATETIME,
    "verifiedStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedAt" DATETIME,
    "verifiedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "maintenance_tasks_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "quality_issues" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "maintenance_tasks_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "maintenance_tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "maintenance_tasks_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
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

-- CreateTable
CREATE TABLE "notifications" (
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

-- CreateIndex
CREATE UNIQUE INDEX "factories_code_key" ON "factories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_factoryId_code_key" ON "departments"("factoryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "department_members_departmentId_userId_key" ON "department_members"("departmentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_type_name_key" ON "categories"("type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeCode_key" ON "users"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "five_m_one_e_submissions_issueId_submitterId_key" ON "five_m_one_e_submissions"("issueId", "submitterId");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_tasks_issueId_key" ON "maintenance_tasks"("issueId");
