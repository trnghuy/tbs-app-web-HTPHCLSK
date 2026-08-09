/**
 * Shared types for sync worker — matches Prisma schema + portal-client types
 */

export enum Role {
  ADMIN = "ADMIN",
  OPERATOR = "OPERATOR",
  QA = "QA",
  LINE_LEADER = "LINE_LEADER",
  TECHNOLOGY = "TECHNOLOGY",
  DEPARTMENT_HEAD = "DEPARTMENT_HEAD",
  MAINTENANCE = "MAINTENANCE",
  DIRECTOR = "DIRECTOR",
}

export enum IssueStatus {
  REPORTED = "REPORTED",
  INVESTIGATING = "INVESTIGATING",
  ROOT_CAUSE_FOUND = "ROOT_CAUSE_FOUND",
  ASSIGNED = "ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE",
}

export enum Severity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum CategoryType {
  AREA = "AREA",
  PRODUCTION_LINE = "PRODUCTION_LINE",
  TEAM = "TEAM",
}

export enum TaskStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DONE = "DONE",
}

export enum VerifyStatus {
  PENDING = "PENDING",
  CONFIRMED_DONE = "CONFIRMED_DONE",
  REJECTED = "REJECTED",
}

// Database models for D1
export interface User {
  id: string;
  employeeCode: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  role: Role;
  factoryId?: string;
  areaId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  type: CategoryType;
  name: string;
  colorHex?: string;
  factoryId?: string;
  parentAreaId?: string;
  parentLineId?: string;
  order: number;
  createdAt: string;
}

export interface FailureCategory {
  id: string;
  name: string;
  order: number;
  createdAt: string;
}

export interface PartCategory {
  id: string;
  name: string;
  order: number;
  createdAt: string;
}

export interface QualityIssue {
  id: string;
  reporterId: string;
  description: string;
  images?: string;
  poCode: string;
  status: IssueStatus;
  severity: Severity;
  factoryId?: string;
  areaId?: string;
  teamId?: string;
  productionLineId?: string;
  failureCategoryId?: string;
  otherFailureNote?: string;
  investigationDeadline?: string;
  investigationLocked: boolean;
  rootCause?: string;
  solution?: string;
  rootCauseDecidedById?: string;
  rootCauseDecidedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FiveMOneESubmission {
  id: string;
  issueId: string;
  submitterId: string;
  submitterRole: "QA" | "LINE_LEADER" | "TECHNOLOGY";
  poCode: string;
  images?: string;
  man: string;
  machine: string;
  material: string;
  method: string;
  measurement: string;
  environment: string;
  rootCause: string;
  submittedAt: string;
  updatedAt: string;
}

export interface MaintenanceTask {
  id: string;
  issueId: string;
  assignedById: string;
  assigneeId: string;
  status: TaskStatus;
  acceptedAt?: string;
  completedAt?: string;
  repairDetail?: string;
  partsReplaced?: string;
  imagesBefore?: string;
  imagesAfter?: string;
  monitoringStartedAt?: string;
  verifyDeadline?: string;
  verifiedStatus: VerifyStatus;
  verifiedAt?: string;
  verifiedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  issueId?: string;
  title: string;
  message: string;
  kind: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  issueId: string;
  userId?: string;
  action: string;
  oldStatus?: IssueStatus;
  newStatus?: IssueStatus;
  note?: string;
  createdAt: string;
}

// Sync events from web-admin
export interface SyncEvent {
  type: "USER" | "ISSUE" | "TASK" | "SUBMISSION" | "AUDIT_LOG" | "NOTIFICATION";
  action: "CREATE" | "UPDATE" | "DELETE";
  entityId: string;
  data: unknown;
  timestamp: string;
  version: number; // For conflict resolution
}

// Mobile API request/response types
export interface MobileListIssuesResponse {
  issues: (QualityIssue & {
    reporter?: User;
    submissions?: FiveMOneESubmission[];
    task?: MaintenanceTask;
  })[];
  total: number;
  lastSync: string;
}

export interface MobileGetIssueResponse {
  issue: QualityIssue & {
    reporter?: User;
    submissions?: FiveMOneESubmission[];
    task?: MaintenanceTask;
  };
}

export interface MobileListCategoriesResponse {
  categories: Category[];
}

export interface MobileSyncResponse {
  success: boolean;
  lastSyncTime: string;
  newIssues: number;
  updatedIssues: number;
  conflicts?: Array<{
    entityId: string;
    type: string;
    webVersion: number;
    mobileVersion: number;
    resolution: "WEB_WINS" | "MOBILE_WINS" | "MANUAL";
  }>;
}
