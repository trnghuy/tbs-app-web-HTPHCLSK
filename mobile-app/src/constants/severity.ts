import type { Severity } from "@/lib/api";
import { colors } from "@/constants/colors";

export const SEVERITY_OPTIONS: { id: Severity; name: string }[] = [
  { id: "LOW", name: "Thấp" },
  { id: "MEDIUM", name: "Trung bình" },
  { id: "HIGH", name: "Cao" },
  { id: "URGENT", name: "Khẩn cấp" },
];

export const severityLabel: Record<Severity, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};

export const severityBadgeStyle: Record<Severity, { bg: string; color: string }> = {
  LOW: { bg: colors.statusDoneBg, color: colors.statusDoneText },
  MEDIUM: { bg: colors.statusAcceptedBg, color: colors.statusAcceptedText },
  HIGH: { bg: colors.statusPendingBg, color: colors.statusPendingText },
  URGENT: { bg: "#FEE2E2", color: colors.danger },
};
