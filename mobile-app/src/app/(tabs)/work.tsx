import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/scaled-text";
import { useAuth } from "@/lib/auth-context";
import { api, QualityIssue } from "@/lib/api";
import { colors } from "@/constants/colors";
import { radius } from "@/constants/ui-theme";
import { PressableScale } from "@/components/pressable-scale";

export default function WorkScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const isDeptHead = user?.role === "DEPARTMENT_HEAD";
  const isMaintenance = user?.role === "MAINTENANCE";

  const load = useCallback(async () => {
    if (!token) return;
    const data = await api.listMyIssues(token);
    setIssues(data);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const listData = isDeptHead
    ? issues.filter((i) => i.status === "ROOT_CAUSE_FOUND" && i.area?.id === user?.area?.id)
    : issues.filter((i) => i.task && i.task.assignee.id === user?.id);

  const title = isDeptHead ? "Cần giao việc" : "Việc của tôi";
  const emptyText = isDeptHead
    ? "Chưa có ticket nào cần giao việc"
    : "Bạn chưa có việc bảo trì nào";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Công việc</Text>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListHeaderComponent={<Text style={styles.sectionTitle}>{title}</Text>}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🛠️</Text>
            <Text style={styles.empty}>{emptyText}</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 45).duration(320)}>
            <PressableScale style={styles.card} onPress={() => router.push(`/issue/${item.id}`)}>
              <Text style={styles.cardPo}>PO {item.poCode}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>
                {item.description}
              </Text>
              <Text style={styles.cardMeta}>
                {item.team?.name || "-"} / {item.productionLine?.name || "-"}
                {isMaintenance && item.task ? ` · ${item.task.status === "ACCEPTED" ? "Đang xử lý" : item.task.status === "DONE" ? "Đã hoàn thành" : "Chờ nhận"}` : ""}
              </Text>
            </PressableScale>
          </Animated.View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 19, fontWeight: "600", color: colors.text },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 2 },
  emptyWrap: { alignItems: "center", marginTop: 40, gap: 8 },
  emptyIcon: { fontSize: 32 },
  empty: { textAlign: "center", color: colors.textMuted },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  cardPo: { fontWeight: "600", color: colors.text, fontSize: 14.5 },
  cardDesc: { color: colors.text },
  cardMeta: { color: colors.textMuted, fontSize: 12 },
});
