import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const STORAGE_KEY_API_URL = "@tbs_server_url";

let cachedApiUrl: string = DEFAULT_API_URL;

// Khởi tạo URL máy chủ từ cache AsyncStorage
AsyncStorage.getItem(STORAGE_KEY_API_URL).then((saved) => {
  if (saved && saved.trim()) {
    cachedApiUrl = saved.trim().replace(/\/+$/, "");
  }
}).catch(() => {});

export async function getServerUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_API_URL);
    if (saved && saved.trim()) {
      cachedApiUrl = saved.trim().replace(/\/+$/, "");
      return cachedApiUrl;
    }
  } catch {}
  return cachedApiUrl || DEFAULT_API_URL;
}

export async function setServerUrl(newUrl: string): Promise<void> {
  const cleanUrl = newUrl.trim().replace(/\/+$/, "");
  cachedApiUrl = cleanUrl;
  await AsyncStorage.setItem(STORAGE_KEY_API_URL, cleanUrl);
}

export type Role =
  | "ADMIN"
  | "OPERATOR"
  | "QA"
  | "LINE_LEADER"
  | "TECHNOLOGY"
  | "DEPARTMENT_HEAD"
  | "MAINTENANCE"
  | "DIRECTOR";

export type User = {
  id: string;
  employeeCode: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  area?: { id: string; name: string } | null;
  stats?: { totalTasks: number; completedTasks: number } | null;
};

export type CategoryRef = { id: string; name: string } | null;

export type FailureCategory = { id: string; name: string; order: number };
export type PartCategory = { id: string; name: string; order: number };

export type IssueStatus =
  | "REPORTED"
  | "INVESTIGATING"
  | "ROOT_CAUSE_FOUND"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "DONE";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type FiveMOneESubmission = {
  id: string;
  issueId: string;
  submitterId: string;
  submitterRole: "QA" | "LINE_LEADER" | "TECHNOLOGY";
  submitter: User;
  poCode: string;
  images: string | null;
  man: string;
  machine: string;
  material: string;
  method: string;
  measurement: string;
  environment: string;
  rootCause: string;
  submittedAt: string;
};

export type ChatTurn = { role: "user" | "model"; text: string };
export type ChatQuestion = { type: "question"; text: string };
export type ChatConclusion = {
  type: "conclusion";
  rootCause: string;
  man: string;
  machine: string;
  material: string;
  method: string;
  measurement: string;
  environment: string;
};

export type TaskStatus = "PENDING" | "ACCEPTED" | "DONE";
export type VerifyStatus = "PENDING" | "CONFIRMED_DONE" | "REJECTED";

export type MaintenanceTask = {
  id: string;
  issueId: string;
  assignedBy: User;
  assignee: User;
  status: TaskStatus;
  acceptedAt: string | null;
  completedAt: string | null;
  repairDetail: string | null;
  partsReplaced: string | null;
  imagesBefore: string | null;
  imagesAfter: string | null;
  monitoringStartedAt: string | null;
  verifyDeadline: string | null;
  verifiedStatus: VerifyStatus;
  verifiedAt: string | null;
  verifiedBy?: User | null;
};

export type QualityIssue = {
  id: string;
  reporterId: string;
  reporter: User;
  description: string;
  images: string | null;
  poCode: string;
  status: IssueStatus;
  severity: Severity;
  area: CategoryRef;
  team: CategoryRef;
  productionLine: CategoryRef;
  failureCategory: FailureCategory | null;
  otherFailureNote: string | null;
  investigationDeadline: string | null;
  investigationLocked: boolean;
  rootCause: string | null;
  solution: string | null;
  rootCauseDecidedAt: string | null;
  createdAt: string;
  submissions: FiveMOneESubmission[];
  task: MaintenanceTask | null;
};

export type AuditLogItem = {
  id: string;
  issueId: string;
  userId?: string | null;
  user?: User | null;
  action:
    | "REPORTED"
    | "INVESTIGATION_SUBMITTED"
    | "ROOT_CAUSE_DECIDED"
    | "SOS_SENT"
    | "TASK_ASSIGNED"
    | "TASK_ACCEPTED"
    | "REPAIR_COMPLETED"
    | "REPAIR_CONFIRMED"
    | "ISSUE_CLOSED"
    | "ISSUE_REOPENED";
  oldStatus?: string | null;
  newStatus?: string | null;
  note?: string | null;
  createdAt: string;
};

export type NotificationItem =
  | { kind: "NEED_INVESTIGATE"; id: string; createdAt: string; issue: QualityIssue }
  | { kind: "FYI_REPORTED"; id: string; createdAt: string; issue: QualityIssue }
  | { kind: "NEED_ROOT_CAUSE"; id: string; createdAt: string; issue: QualityIssue }
  | { kind: "NEED_ASSIGN"; id: string; createdAt: string; issue: QualityIssue }
  | { kind: "TASK_ASSIGNED"; id: string; createdAt: string; task: MaintenanceTask & { issue: QualityIssue } }
  | { kind: "TASK_ACCEPTED"; id: string; createdAt: string; task: MaintenanceTask & { issue: QualityIssue } }
  | { kind: "NEED_REPAIR_REVIEW"; id: string; createdAt: string; task: MaintenanceTask & { issue: QualityIssue } }
  | { kind: "NEED_VERIFY"; id: string; createdAt: string; task: MaintenanceTask & { issue: QualityIssue } }
  | { kind: "TASK_DONE_INFO"; id: string; createdAt: string; task: MaintenanceTask & { issue: QualityIssue } }
  | { kind: "ISSUE_RESOLVED"; id: string; createdAt: string; issue: QualityIssue };

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const { method = "GET", body, token } = options;
  const baseUrl = await getServerUrl();

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(data?.error || "Đã có lỗi xảy ra", res.status);
  }

  return data as T;
}

export const api = {
  login: (employeeCode: string, password: string) =>
    request<{ token: string; user: User }>("/api/mobile/login", {
      method: "POST",
      body: { employeeCode, password },
    }),

  me: (token: string) => request<User>("/api/mobile/me", { token }),

  updateAvatar: (token: string, avatarUrl: string) =>
    request<User>("/api/mobile/me", { method: "PUT", token, body: { avatarUrl } }),

  changePassword: (token: string, oldPassword: string, newPassword: string) =>
    request<{ ok: true }>("/api/mobile/me/password", {
      method: "POST",
      token,
      body: { oldPassword, newPassword },
    }),

  listAreas: (token: string) =>
    request<{ id: string; name: string }[]>("/api/mobile/categories?type=AREA", { token }),
  listTeams: (token: string, lineId?: string) =>
    request<{ id: string; name: string }[]>(
      `/api/mobile/categories?type=TEAM${lineId ? `&lineId=${lineId}` : ""}`,
      { token },
    ),
  listProductionLines: (token: string, areaId?: string) =>
    request<{ id: string; name: string }[]>(
      `/api/mobile/categories?type=PRODUCTION_LINE${areaId ? `&areaId=${areaId}` : ""}`,
      { token },
    ),
  listFailureCategories: (token: string) =>
    request<FailureCategory[]>("/api/mobile/issue-failure-categories", { token }),
  listPartCategories: (token: string) =>
    request<PartCategory[]>("/api/mobile/part-categories", { token }),

  listMyIssues: (token: string) => request<QualityIssue[]>("/api/mobile/issues", { token }),

  getIssue: (token: string, id: string) => request<QualityIssue>(`/api/mobile/issues/${id}`, { token }),

  getAuditLogs: (token: string, id: string) =>
    request<AuditLogItem[]>(`/api/mobile/issues/${id}/audit-logs`, { token }),

  searchIssuesByPoCode: (token: string, poCode: string) =>
    request<QualityIssue[]>(`/api/mobile/issues/search?poCode=${encodeURIComponent(poCode)}`, { token }),

  reportIssue: (
    token: string,
    payload: {
      areaId?: string;
      teamId?: string;
      productionLineId?: string;
      failureCategoryId?: string;
      otherFailureNote?: string;
      severity: Severity;
      poCode: string;
      description: string;
      images?: string[];
    },
  ) => request<QualityIssue>("/api/mobile/issues", { method: "POST", token, body: payload }),

  submit5M1E: (
    token: string,
    issueId: string,
    payload: {
      poCode: string;
      images?: string[];
      man: string;
      machine: string;
      material: string;
      method: string;
      measurement: string;
      environment: string;
      rootCause: string;
    },
  ) =>
    request<FiveMOneESubmission>(`/api/mobile/issues/${issueId}/submissions`, {
      method: "POST",
      token,
      body: payload,
    }),

  investigateChat: (token: string, issueId: string, history: ChatTurn[]) =>
    request<ChatQuestion | ChatConclusion>(`/api/mobile/issues/${issueId}/investigate-chat`, {
      method: "POST",
      token,
      body: { history },
    }),

  synthesizeRootCause: (token: string, issueId: string) =>
    request<{ rootCause: string; solution: string; outOfScope: boolean; sosReason: string }>(
      `/api/mobile/issues/${issueId}/synthesize-root-cause`,
      { method: "POST", token },
    ),

  sendSos: (token: string, issueId: string, reason: string) =>
    request<{ ok: true }>(`/api/mobile/issues/${issueId}/sos`, {
      method: "POST",
      token,
      body: { reason },
    }),

  decideRootCause: (token: string, issueId: string, payload: { rootCause: string; solution?: string }) =>
    request<QualityIssue>(`/api/mobile/issues/${issueId}/root-cause`, {
      method: "POST",
      token,
      body: payload,
    }),

  searchMaintenanceInMyArea: (token: string, code: string) =>
    request<User[]>(`/api/mobile/employees/search?code=${encodeURIComponent(code)}`, { token }),

  assignTask: (token: string, issueId: string, assigneeId: string) =>
    request<MaintenanceTask>(`/api/mobile/issues/${issueId}/assign`, {
      method: "POST",
      token,
      body: { assigneeId },
    }),

  acceptTask: (token: string, taskId: string) =>
    request<MaintenanceTask>(`/api/mobile/tasks/${taskId}/accept`, { method: "POST", token }),

  completeTask: (
    token: string,
    taskId: string,
    payload: {
      repairDetail: string;
      partsReplaced?: { partCategoryId: string; quantity: number; note?: string }[];
      imagesBefore: string[];
      imagesAfter: string[];
    },
  ) =>
    request<MaintenanceTask>(`/api/mobile/tasks/${taskId}/complete`, {
      method: "POST",
      token,
      body: payload,
    }),

  confirmRepair: (token: string, taskId: string, adequate: boolean) =>
    request<MaintenanceTask>(`/api/mobile/tasks/${taskId}/confirm-repair`, {
      method: "POST",
      token,
      body: { adequate },
    }),

  verifyTask: (token: string, taskId: string, confirmed: boolean) =>
    request<MaintenanceTask>(`/api/mobile/tasks/${taskId}/verify`, {
      method: "POST",
      token,
      body: { confirmed },
    }),

  listNotifications: (token: string) =>
    request<NotificationItem[]>("/api/mobile/notifications", { token }),

  markNotificationsAsRead: (token: string, data?: { notificationIds?: string[]; all?: boolean }) =>
    request<{ success: boolean }>("/api/mobile/notifications/read", {
      method: "POST",
      token,
      body: data || { all: true },
    }),

  uploadImage: (token: string, base64: string, mimeType: string) =>
    request<{ url: string }>("/api/mobile/upload", {
      method: "POST",
      token,
      body: { base64, mimeType },
    }),

  registerPushToken: (token: string, pushToken: string) =>
    request<{ ok: true }>("/api/mobile/push-token", {
      method: "POST",
      token,
      body: { token: pushToken },
    }),
};

export function resolveImageUrl(path: string) {
  return path.startsWith("http") ? path : `${cachedApiUrl || DEFAULT_API_URL}${path}`;
}

export { cachedApiUrl as API_URL, ApiError };
