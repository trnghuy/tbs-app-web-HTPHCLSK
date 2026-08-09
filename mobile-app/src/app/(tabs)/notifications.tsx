import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/scaled-text";
import { useAuth } from "@/lib/auth-context";
import { api, NotificationItem } from "@/lib/api";
import { colors } from "@/constants/colors";
import { radius } from "@/constants/ui-theme";
import { PressableScale } from "@/components/pressable-scale";

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

const KIND_META: Record<
  NotificationItem["kind"],
  { icon: string; title: string; badgeBg: string; badgeColor: string }
> = {
  NEED_INVESTIGATE: {
    icon: "🔍",
    title: "Cần điều tra 5M+1E",
    badgeBg: colors.statusPendingBg,
    badgeColor: colors.statusPendingText,
  },
  FYI_REPORTED: {
    icon: "📢",
    title: "[FYI] Sự cố mới tại phân xưởng",
    badgeBg: "#EFF6FF",
    badgeColor: "#1D4ED8",
  },
  NEED_ROOT_CAUSE: {

    icon: "🧩",
    title: "Cần chốt nguyên nhân gốc",
    badgeBg: colors.statusAcceptedBg,
    badgeColor: colors.statusAcceptedText,
  },
  NEED_ASSIGN: {
    icon: "📋",
    title: "Cần giao việc bảo trì",
    badgeBg: colors.statusAcceptedBg,
    badgeColor: colors.statusAcceptedText,
  },
  TASK_ASSIGNED: {
    icon: "🛠️",
    title: "CẦN TRỢ GIÚP",
    badgeBg: "#FEE2E2",
    badgeColor: colors.danger,
  },
  TASK_ACCEPTED: {
    icon: "✅",
    title: "Đã nhận việc",
    badgeBg: colors.statusDoneBg,
    badgeColor: colors.statusDoneText,
  },
  NEED_REPAIR_REVIEW: {
    icon: "🔎",
    title: "Xác nhận sửa chữa đạt yêu cầu?",
    badgeBg: colors.statusPendingBg,
    badgeColor: colors.statusPendingText,
  },
  NEED_VERIFY: {
    icon: "⏳",
    title: "Đang theo dõi — Đóng vấn đề?",
    badgeBg: colors.statusPendingBg,
    badgeColor: colors.statusPendingText,
  },
  TASK_DONE_INFO: {
    icon: "🔧",
    title: "Bảo trì đã hoàn thành sửa chữa",
    badgeBg: colors.statusDoneBg,
    badgeColor: colors.statusDoneText,
  },
  ISSUE_RESOLVED: {
    icon: "🎉",
    title: "Sự cố đã hoàn thành",
    badgeBg: colors.statusDoneBg,
    badgeColor: colors.statusDoneText,
  },
};

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.alertRow}>
      <Text style={styles.alertLabel}>{label}</Text>
      <Text style={styles.alertValue}>{value}</Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await api.listNotifications(token);
    setItems(data);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(() => {
        if (token) {
          api.listNotifications(token).then((data) => setItems(data)).catch(() => {});
        }
      }, 4000);
      return () => clearInterval(timer);
    }, [load, token]),
  );


  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function goToIssue(issueId: string) {
    router.push(`/issue/${issueId}`);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>
            {(user?.name || "?").trim().charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.empty}>Chưa có thông báo nào</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const meta = KIND_META[item.kind];
          const entering = FadeInUp.delay(Math.min(index, 8) * 45).duration(280);

          const issue = "issue" in item ? item.issue : item.task.issue;
          const task = "task" in item ? item.task : null;

          return (
            <Animated.View entering={entering}>
              <PressableScale style={styles.card} onPress={() => goToIssue(issue.id)}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>
                    {meta.icon} {meta.title}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: meta.badgeBg }]}>
                    <Text style={[styles.badgeText, { color: meta.badgeColor }]}>
                      {timeAgo(item.createdAt)}
                    </Text>
                  </View>
                </View>

                <Row label="Mã PO" value={issue.poCode} />
                <Row label="Người báo" value={issue.reporter?.name || ""} />
                <Row
                  label="Tổ / Chuyền"
                  value={`${issue.team?.name || "-"} / ${issue.productionLine?.name || "-"}`}
                />
                {issue.failureCategory && <Row label="Danh mục lỗi" value={issue.failureCategory.name} />}
                <Row label="Mô tả" value={issue.description} />

                {item.kind === "TASK_ASSIGNED" && task && (
                  <Row label="Giải pháp" value={issue.solution || "Không có đề xuất"} />
                )}
                {item.kind === "TASK_ACCEPTED" && task?.assignee && (
                  <Row
                    label="Bảo trì"
                    value={`${task.assignee.name}${
                      task.acceptedAt
                        ? " · " +
                          new Date(task.acceptedAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""
                    }`}
                  />
                )}
                {item.kind === "NEED_VERIFY" && task?.assignee && (
                  <Row label="Đã sửa bởi" value={task.assignee.name} />
                )}
                {item.kind === "NEED_ROOT_CAUSE" && <Row label="Trạng thái" value="Đủ dữ liệu 5M+1E" />}
                {item.kind === "NEED_ASSIGN" && <Row label="Nguyên nhân gốc" value={issue.rootCause || ""} />}
                {item.kind === "TASK_DONE_INFO" && task?.assignee && (
                  <Row label="Bảo trì" value={`${task.assignee.name} đã hoàn thành sửa chữa`} />
                )}
                {item.kind === "ISSUE_RESOLVED" && (
                  <Row label="Trạng thái" value="Đã xác nhận hoàn thành toàn bộ luồng xử lý" />
                )}
              </PressableScale>
            </Animated.View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 19, fontWeight: "600", color: colors.text },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { color: colors.primaryDark, fontWeight: "700", fontSize: 13 },
  emptyWrap: { alignItems: "center", marginTop: 40, gap: 8 },
  emptyIcon: { fontSize: 32 },
  empty: { textAlign: "center", color: colors.textMuted },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 2,
  },
  title: { fontWeight: "700", color: colors.text, fontSize: 14.5 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  alertRow: { flexDirection: "row", alignItems: "flex-start" },
  alertLabel: { width: 90, fontSize: 12, fontWeight: "700", color: colors.textMuted },
  alertValue: { flex: 1, fontSize: 13.5, color: colors.text, lineHeight: 19 },
});
