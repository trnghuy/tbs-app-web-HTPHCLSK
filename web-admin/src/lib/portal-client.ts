export type IssueStatus =
  | "REPORTED"
  | "INVESTIGATING"
  | "ROOT_CAUSE_FOUND"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "DONE";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type UserRole =
  | "ADMIN"
  | "OPERATOR"
  | "QA"
  | "LINE_LEADER"
  | "TECHNOLOGY"
  | "DEPARTMENT_HEAD"
  | "MAINTENANCE"
  | "DIRECTOR";

export type Category = {
  id: string;
  type: "AREA" | "PRODUCTION_LINE" | "TEAM";
  name: string;
  colorHex?: string | null;
  parentAreaId?: string | null;
  parentLineId?: string | null;
};

export type FailureCategory = {
  id: string;
  name: string;
  order: number;
};

export type PartCategory = {
  id: string;
  name: string;
  order: number;
};

export type UserPublic = {
  id: string;
  employeeCode: string;
  name: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  areaId?: string | null;
  area?: Category | null;
  stats?: {
    totalTasks?: number;
    completedTasks?: number;
  };
};

export type FiveMOneESubmission = {
  id: string;
  submitterId: string;
  submitterRole: "QA" | "LINE_LEADER" | "TECHNOLOGY";
  poCode: string;
  images?: string | null;
  man: string;
  machine: string;
  material: string;
  method: string;
  measurement: string;
  environment: string;
  rootCause: string;
  submittedAt: string;
  submitter?: UserPublic;
};

export type MaintenanceTask = {
  id: string;
  issueId: string;
  assignedById: string;
  assigneeId: string;
  status: "PENDING" | "ACCEPTED" | "DONE";
  acceptedAt?: string | null;
  completedAt?: string | null;
  repairDetail?: string | null;
  partsReplaced?: string | null; // JSON array [{ partCategoryId, quantity, note? }]
  imagesBefore?: string | null;
  imagesAfter?: string | null;
  monitoringStartedAt?: string | null;
  verifyDeadline?: string | null;
  verifiedStatus: "PENDING" | "CONFIRMED_DONE" | "REJECTED";
  verifiedAt?: string | null;
  assignee: UserPublic;
  assignedBy: UserPublic;
};

export type QualityIssue = {
  id: string;
  reporterId: string;
  reporter?: UserPublic;
  description: string;
  images?: string | null;
  poCode: string;
  status: IssueStatus;
  severity: Severity;
  areaId?: string | null;
  area?: Category | null;
  teamId?: string | null;
  team?: Category | null;
  productionLineId?: string | null;
  productionLine?: Category | null;
  failureCategoryId?: string | null;
  failureCategory?: FailureCategory | null;
  otherFailureNote?: string | null;
  investigationDeadline?: string | null;
  investigationLocked: boolean;
  rootCause?: string | null;
  solution?: string | null;
  rootCauseDecidedById?: string | null;
  rootCauseDecidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  submissions: FiveMOneESubmission[];
  task?: MaintenanceTask | null;
};

export type NotificationItem =
  | {
      id: string;
      kind:
        | "NEED_INVESTIGATE"
        | "NEED_ROOT_CAUSE"
        | "NEED_ASSIGN"
        | "TASK_ASSIGNED"
        | "TASK_ACCEPTED"
        | "NEED_REPAIR_REVIEW"
        | "NEED_VERIFY"
        | "TASK_DONE_INFO"
        | "ISSUE_RESOLVED";
      createdAt: string;
      issue: QualityIssue;
    }
  | {
      id: string;
      kind:
        | "NEED_INVESTIGATE"
        | "NEED_ROOT_CAUSE"
        | "NEED_ASSIGN"
        | "TASK_ASSIGNED"
        | "TASK_ACCEPTED"
        | "NEED_REPAIR_REVIEW"
        | "NEED_VERIFY"
        | "TASK_DONE_INFO"
        | "ISSUE_RESOLVED";
      createdAt: string;
      task: MaintenanceTask & { issue: QualityIssue };
    };

export type AuditLogItem = {
  id: string;
  issueId: string;
  userId?: string | null;
  user?: UserPublic | null;
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

export type ChatTurn = { role: "user" | "model"; text: string };


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

export type ChatQuestion = {
  type: "question";
  text: string;
};

export class PortalApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "PortalApiError";
  }
}

async function fetchPortal<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers || {});
  if (!headers.has("Content-Type") && !(options?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `Lỗi ${res.status}`;
    try {
      const json = await res.json();
      if (json.error) errorMsg = json.error;
    } catch {
      // ignore
    }
    throw new PortalApiError(res.status, errorMsg);
  }

  return res.json();
}

export const portalApi = {
  // Lấy token / profile hiện tại

  getMe: async (): Promise<{ user: UserPublic }> => {
    const res = await fetchPortal<UserPublic & { user?: UserPublic }>("/api/mobile/me");
    if (res && res.user) {
      return { user: res.user };
    }
    return { user: res as UserPublic };
  },



  // Danh mục
  listAreas: () => fetchPortal<Category[]>("/api/mobile/categories?type=AREA"),
  listProductionLines: (areaId?: string) =>
    fetchPortal<Category[]>(
      `/api/mobile/categories?type=PRODUCTION_LINE${areaId ? `&areaId=${encodeURIComponent(areaId)}` : ""}`,
    ),
  listTeams: (lineId?: string) =>
    fetchPortal<Category[]>(
      `/api/mobile/categories?type=TEAM${lineId ? `&lineId=${encodeURIComponent(lineId)}` : ""}`,
    ),
  listFailureCategories: () => fetchPortal<FailureCategory[]>("/api/mobile/issue-failure-categories"),
  listPartCategories: () => fetchPortal<PartCategory[]>("/api/mobile/part-categories"),

  // Sự cố
  listIssues: () => fetchPortal<QualityIssue[]>("/api/mobile/issues"),
  getIssue: (id: string) => fetchPortal<QualityIssue>(`/api/mobile/issues/${id}`),
  searchIssuesByPoCode: (poCode: string) =>
    fetchPortal<QualityIssue[]>(`/api/mobile/issues/search?poCode=${encodeURIComponent(poCode)}`),
  reportIssue: (data: {
    areaId: string;
    teamId?: string;
    productionLineId?: string;
    failureCategoryId?: string;
    otherFailureNote?: string;
    severity: Severity;
    poCode: string;
    description: string;
    images?: string[];
  }) =>
    fetchPortal<QualityIssue>("/api/mobile/issues", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Điều tra 5M+1E & AI
  investigateChat: (issueId: string, history: ChatTurn[]) =>
    fetchPortal<ChatQuestion | ChatConclusion>(`/api/mobile/issues/${issueId}/investigate-chat`, {
      method: "POST",
      body: JSON.stringify({ history }),
    }),
  submit5M1E: (
    issueId: string,
    data: {
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
    fetchPortal<{ success: boolean }>(`/api/mobile/issues/${issueId}/submissions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Tổng hợp nguyên nhân & SOS
  synthesizeRootCause: (issueId: string) =>
    fetchPortal<{ rootCause: string; solution: string; outOfScope?: boolean; sosReason?: string }>(
      `/api/mobile/issues/${issueId}/synthesize-root-cause`,
      { method: "POST" },
    ),
  decideRootCause: (issueId: string, data: { rootCause: string; solution?: string }) =>
    fetchPortal<{ success: boolean }>(`/api/mobile/issues/${issueId}/root-cause`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  sendSos: (issueId: string, reason: string) =>
    fetchPortal<{ success: boolean }>(`/api/mobile/issues/${issueId}/sos`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  // Phân công & Thực hiện Bảo trì
  searchMaintenanceInArea: (query?: string) =>
    fetchPortal<UserPublic[]>(`/api/mobile/employees/search?q=${encodeURIComponent(query || "")}`),
  assignTask: (issueId: string, assigneeId: string) =>
    fetchPortal<MaintenanceTask>(`/api/mobile/issues/${issueId}/assign`, {
      method: "POST",
      body: JSON.stringify({ assigneeId }),
    }),
  acceptTask: (taskId: string) =>
    fetchPortal<{ success: boolean }>(`/api/mobile/tasks/${taskId}/accept`, {
      method: "POST",
    }),
  completeTask: (
    taskId: string,
    data: {
      repairDetail: string;
      partsReplaced?: { partCategoryId: string; quantity: number; note?: string }[];
      imagesBefore?: string[];
      imagesAfter?: string[];
    },
  ) =>
    fetchPortal<{ success: boolean }>(`/api/mobile/tasks/${taskId}/complete`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  confirmRepair: (taskId: string, adequate: boolean) =>
    fetchPortal<{ success: boolean }>(`/api/mobile/tasks/${taskId}/confirm-repair`, {
      method: "POST",
      body: JSON.stringify({ adequate }),
    }),
  verifyTask: (taskId: string, confirmed: boolean) =>
    fetchPortal<{ success: boolean }>(`/api/mobile/tasks/${taskId}/verify`, {
      method: "POST",
      body: JSON.stringify({ confirmed }),
    }),

  // Thông báo & Kiểm toán
  listNotifications: () => fetchPortal<NotificationItem[]>("/api/mobile/notifications"),
  markNotificationsAsRead: (data?: { notificationIds?: string[]; all?: boolean }) =>
    fetchPortal<{ success: boolean }>("/api/mobile/notifications/read", {
      method: "POST",
      body: JSON.stringify(data || { all: true }),
    }),
  getAuditLogs: (issueId: string) => fetchPortal<AuditLogItem[]>(`/api/mobile/issues/${issueId}/audit-logs`),


  // Upload ảnh
  uploadImage: async (base64: string, mimeType: string) =>
    fetchPortal<{ url: string }>("/api/mobile/upload", {
      method: "POST",
      body: JSON.stringify({ base64, mimeType }),
    }),

  // Cá nhân
  changePassword: (currentPassword: string, newPassword: string) =>
    fetchPortal<{ success: boolean }>("/api/mobile/me/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  updateAvatar: (avatarUrl: string) =>
    fetchPortal<{ success: boolean }>("/api/mobile/me", {
      method: "PUT",
      body: JSON.stringify({ avatarUrl }),
    }),
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Quản trị viên",
  OPERATOR: "Nhân viên vận hành",
  QA: "QA",
  LINE_LEADER: "Trưởng line",
  TECHNOLOGY: "Công nghệ",
  DEPARTMENT_HEAD: "Trưởng phòng ban",
  MAINTENANCE: "Bảo trì",
  DIRECTOR: "Giám đốc",
};

export const ROLE_BADGE_COLORS: Record<UserRole, { bg: string; text: string; border: string }> = {
  ADMIN: { bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-500/30" },
  OPERATOR: { bg: "bg-blue-500/10", text: "text-blue-700", border: "border-blue-500/30" },
  QA: { bg: "bg-teal-500/10", text: "text-teal-700", border: "border-teal-500/30" },
  LINE_LEADER: { bg: "bg-amber-500/10", text: "text-amber-800", border: "border-amber-500/30" },
  TECHNOLOGY: { bg: "bg-purple-500/10", text: "text-purple-700", border: "border-purple-500/30" },
  DEPARTMENT_HEAD: { bg: "bg-indigo-500/10", text: "text-indigo-700", border: "border-indigo-500/30" },
  MAINTENANCE: { bg: "bg-cyan-500/10", text: "text-cyan-800", border: "border-cyan-500/30" },
  DIRECTOR: { bg: "bg-rose-500/10", text: "text-rose-700", border: "border-rose-500/30" },
};

export const STATUS_META: Record<
  IssueStatus,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  REPORTED: {
    label: "Vừa báo cáo",
    bg: "bg-amber-500/10",
    text: "text-amber-700",
    border: "border-amber-500/30",
    icon: "⚠️",
  },
  INVESTIGATING: {
    label: "Đang điều tra",
    bg: "bg-blue-500/10",
    text: "text-blue-700",
    border: "border-blue-500/30",
    icon: "🔍",
  },
  ROOT_CAUSE_FOUND: {
    label: "Đã có nguyên nhân",
    bg: "bg-indigo-500/10",
    text: "text-indigo-700",
    border: "border-indigo-500/30",
    icon: "🧩",
  },
  ASSIGNED: {
    label: "Đã giao việc",
    bg: "bg-purple-500/10",
    text: "text-purple-700",
    border: "border-purple-500/30",
    icon: "📋",
  },
  IN_PROGRESS: {
    label: "Đang xử lý",
    bg: "bg-cyan-500/10",
    text: "text-cyan-800",
    border: "border-cyan-500/30",
    icon: "⏱️",
  },
  DONE: {
    label: "Đã hoàn thành",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700",
    border: "border-emerald-500/30",
    icon: "✅",
  },
};

export const SEVERITY_META: Record<
  Severity,
  { label: string; bg: string; text: string; border: string; badge: string }
> = {
  LOW: { label: "Thấp", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", badge: "🟢" },
  MEDIUM: { label: "Trung bình", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", badge: "🔵" },
  HIGH: { label: "Cao", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-300", badge: "⚠️" },
  URGENT: { label: "Khẩn cấp", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-300", badge: "🚨" },
};
