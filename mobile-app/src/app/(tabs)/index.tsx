import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/scaled-text";
import { useAuth } from "@/lib/auth-context";
import { api, QualityIssue, IssueStatus, Severity, ApiError, resolveImageUrl, FailureCategory } from "@/lib/api";
import { colors } from "@/constants/colors";
import { radius } from "@/constants/ui-theme";
import { PressableScale } from "@/components/pressable-scale";
import { ComboBoxField } from "@/components/combo-box-field";
import { SEVERITY_OPTIONS, severityLabel, severityBadgeStyle } from "@/constants/severity";

const OTHER_FAILURE_ID = "OTHER";

const statusLabel: Record<IssueStatus, string> = {
  REPORTED: "Vừa báo cáo",
  INVESTIGATING: "Đang điều tra",
  ROOT_CAUSE_FOUND: "Đã có nguyên nhân",
  ASSIGNED: "Đã giao việc",
  IN_PROGRESS: "Đang xử lý",
  DONE: "Đã hoàn thành",
};

const statusBadgeStyle: Record<IssueStatus, { bg: string; color: string }> = {
  REPORTED: { bg: colors.statusPendingBg, color: colors.statusPendingText },
  INVESTIGATING: { bg: colors.statusAcceptedBg, color: colors.statusAcceptedText },
  ROOT_CAUSE_FOUND: { bg: colors.statusAcceptedBg, color: colors.statusAcceptedText },
  ASSIGNED: { bg: colors.statusAcceptedBg, color: colors.statusAcceptedText },
  IN_PROGRESS: { bg: colors.statusPendingBg, color: colors.statusPendingText },
  DONE: { bg: colors.statusDoneBg, color: colors.statusDoneText },
};

function initials(name?: string) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

type Option = { id: string; name: string };

export default function HomeScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [areas, setAreas] = useState<Option[]>([]);
  const [teams, setTeams] = useState<Option[]>([]);
  const [lines, setLines] = useState<Option[]>([]);
  const [failureCategories, setFailureCategories] = useState<FailureCategory[]>([]);
  const [areaId, setAreaId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [productionLineId, setProductionLineId] = useState("");
  const [failureCategoryId, setFailureCategoryId] = useState("");
  const [otherFailureNote, setOtherFailureNote] = useState("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [poCode, setPoCode] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [showLookup, setShowLookup] = useState(false);
  const [lookupPoCode, setLookupPoCode] = useState("");
  const [lookupResults, setLookupResults] = useState<QualityIssue[] | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await api.listMyIssues(token);
    setIssues(data);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(() => {
        if (token) {
          api.listMyIssues(token).then((data) => setIssues(data)).catch(() => {});
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

  async function openReportForm() {
    setError(null);
    setShowReportForm(true);
    if (token) {
      const defaultAreaId = user?.area?.id || "";
      setAreaId(defaultAreaId);
      setTeamId("");
      setProductionLineId("");
      const [areaOpts, lineOpts, failureOpts] = await Promise.all([
        api.listAreas(token),
        api.listProductionLines(token, defaultAreaId || undefined),
        api.listFailureCategories(token),
      ]);
      setAreas(areaOpts);
      setLines(lineOpts);
      setTeams([]);
      setFailureCategories(failureOpts);
    }
  }

  // Phân cấp Khu vực > Chuyền > Tổ: đổi Khu vực thì nạp lại Chuyền đúng khu vực đó, reset Chuyền
  // + Tổ đã chọn (vì Chuyền chỉ thuộc 1 khu vực, Tổ chỉ thuộc 1 chuyền).
  async function handleAreaChange(nextAreaId: string) {
    setAreaId(nextAreaId);
    setProductionLineId("");
    setTeamId("");
    setTeams([]);
    if (!token) return;
    const lineOpts = await api.listProductionLines(token, nextAreaId || undefined);
    setLines(lineOpts);
  }

  // Đổi Chuyền thì nạp lại Tổ đúng chuyền đó, reset Tổ đã chọn.
  async function handleLineChange(nextLineId: string) {
    setProductionLineId(nextLineId);
    setTeamId("");
    if (!token) return;
    const teamOpts = await api.listTeams(token, nextLineId || undefined);
    setTeams(teamOpts);
  }

  async function openLookup() {
    setShowLookup(true);
    setLookupPoCode("");
    setLookupResults(null);
    setLookupError(null);
  }

  async function handleLookup() {
    if (!token || !lookupPoCode.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    try {
      const data = await api.searchIssuesByPoCode(token, lookupPoCode.trim());
      setLookupResults(data);
    } catch (e) {
      setLookupError(e instanceof ApiError ? e.message : "Không thể tra cứu");
    } finally {
      setLookupLoading(false);
    }
  }

  async function handlePickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64 || !token) return;
    setUploadingImage(true);
    try {
      const asset = result.assets[0];
      const uploaded = await api.uploadImage(token, asset.base64!, asset.mimeType || "image/jpeg");
      setImages((prev) => [...prev, uploaded.url]);
    } catch {
      setError("Không thể tải ảnh lên");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmitReport() {
    if (!token) return;
    if (!poCode.trim() || !description.trim()) {
      setError("Vui lòng nhập mã PO và mô tả");
      return;
    }
    if (!areaId) {
      setError("Vui lòng chọn khu vực/xưởng");
      return;
    }
    if (!severity) {
      setError("Vui lòng chọn mức độ nghiêm trọng");
      return;
    }
    if (!failureCategoryId) {
      setError("Vui lòng chọn danh mục lỗi");
      return;
    }
    if (failureCategoryId === OTHER_FAILURE_ID && !otherFailureNote.trim()) {
      setError("Vui lòng mô tả lỗi khác");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.reportIssue(token, {
        areaId,
        teamId: teamId || undefined,
        productionLineId: productionLineId || undefined,
        failureCategoryId: failureCategoryId === OTHER_FAILURE_ID ? undefined : failureCategoryId,
        otherFailureNote: failureCategoryId === OTHER_FAILURE_ID ? otherFailureNote.trim() : undefined,
        severity,
        poCode: poCode.trim(),
        description: description.trim(),
        images,
      });
      setShowReportForm(false);
      setAreaId("");
      setTeamId("");
      setProductionLineId("");
      setFailureCategoryId("");
      setOtherFailureNote("");
      setSeverity("");
      setPoCode("");
      setDescription("");
      setImages([]);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không thể gửi báo cáo");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trang chủ</Text>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{initials(user?.name)}</Text>
        </View>
      </View>

      <FlatList
        data={issues}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 10 }}
        ListHeaderComponent={
          <>
            <View style={styles.topRow}>
              <PressableScale style={styles.topCardPrimary} onPress={openReportForm}>
                <Text style={styles.topCardIcon}>⚠️</Text>
                <Text style={styles.topCardTitle}>Báo cáo{"\n"}vấn đề</Text>
              </PressableScale>
              <PressableScale style={styles.topCardSecondary} onPress={openLookup}>
                <Text style={styles.topCardIcon}>🔍</Text>
                <Text style={styles.topCardTitleDark}>Tra cứu{"\n"}lỗi SP</Text>
              </PressableScale>
            </View>
            <Text style={styles.feedTitle}>Hoạt động sự cố gần đây</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🗂️</Text>
            <Text style={styles.empty}>Bạn chưa báo cáo sự cố nào</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const badge = statusBadgeStyle[item.status];
          const sevBadge = severityBadgeStyle[item.severity];
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 45).duration(320)}>
              <PressableScale style={styles.card} onPress={() => router.push(`/issue/${item.id}`)}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardPo}>PO {item.poCode}</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <View style={[styles.badge, { backgroundColor: sevBadge.bg }]}>
                      <Text style={[styles.badgeText, { color: sevBadge.color }]}>
                        {severityLabel[item.severity]}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.color }]}>
                        {statusLabel[item.status]}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.team?.name || "-"} / {item.productionLine?.name || "-"}
                  {item.failureCategory ? ` · ${item.failureCategory.name}` : item.otherFailureNote ? ` · ${item.otherFailureNote}` : ""}
                  {item.task?.assignee ? ` · Bảo trì: ${item.task.assignee.name}` : ""}
                </Text>
              </PressableScale>
            </Animated.View>
          );
        }}
      />

      <Modal visible={showReportForm} transparent animationType="fade">
        <View style={styles.sheetOverlay}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}>Báo cáo vấn đề</Text>

              <Text style={styles.formLabel}>Mã PO</Text>
              <TextInput
                value={poCode}
                onChangeText={setPoCode}
                placeholder="VD: PO-2026-001"
                style={styles.input}
              />

              <ComboBoxField
                label="Khu vực / Xưởng"
                placeholder="Chọn khu vực/xưởng"
                value={areaId}
                onChange={handleAreaChange}
                options={areas}
              />

              <ComboBoxField
                label="Chuyền"
                placeholder={areaId ? "Chọn chuyền" : "Chọn khu vực/xưởng trước"}
                value={productionLineId}
                onChange={handleLineChange}
                options={lines}
              />

              <ComboBoxField
                label="Tổ"
                placeholder={productionLineId ? "Chọn tổ" : "Chọn chuyền trước"}
                value={teamId}
                onChange={setTeamId}
                options={teams}
              />

              <ComboBoxField
                label="Danh mục lỗi"
                placeholder="Chọn danh mục lỗi"
                value={failureCategoryId}
                onChange={setFailureCategoryId}
                options={[...failureCategories, { id: OTHER_FAILURE_ID, name: "Khác" }]}
              />
              {failureCategoryId === OTHER_FAILURE_ID && (
                <TextInput
                  value={otherFailureNote}
                  onChangeText={setOtherFailureNote}
                  placeholder="Mô tả lỗi khác (bắt buộc)"
                  style={[styles.input, { marginTop: 8 }]}
                />
              )}

              <ComboBoxField
                label="Mức độ nghiêm trọng"
                placeholder="Chọn mức độ nghiêm trọng"
                value={severity}
                onChange={(v) => setSeverity(v as Severity)}
                options={SEVERITY_OPTIONS}
              />

              <Text style={styles.formLabel}>Mô tả</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Mô tả tình trạng gặp phải"
                multiline
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              />

              <Text style={styles.formLabel}>Hình ảnh</Text>
              <View style={styles.pillRow}>
                {images.map((img, i) => (
                  <Image key={i} source={{ uri: resolveImageUrl(img) }} style={styles.thumb} />
                ))}
                <TouchableOpacity style={styles.addImageBtn} onPress={handlePickImage} disabled={uploadingImage}>
                  {uploadingImage ? <ActivityIndicator /> : <Text style={{ fontSize: 22 }}>+</Text>}
                </TouchableOpacity>
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <View style={styles.formActions}>
                <TouchableOpacity onPress={() => setShowReportForm(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Huỷ</Text>
                </TouchableOpacity>
                <PressableScale
                  style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleSubmitReport}
                  disabled={submitting}
                >
                  <Text style={styles.submitBtnText}>{submitting ? "Đang gửi..." : "Gửi báo cáo"}</Text>
                </PressableScale>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showLookup} transparent animationType="fade">
        <View style={styles.sheetOverlay}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>🔍 Tra cứu lỗi SP</Text>
            <Text style={styles.lookupHint}>
              Nhập mã PO/SP để xem các vấn đề đã báo cáo trước đó — giúp biết và ngăn ngừa lỗi lặp
              lại.
            </Text>

            <View style={styles.lookupRow}>
              <TextInput
                value={lookupPoCode}
                onChangeText={setLookupPoCode}
                placeholder="Nhập mã PO/SP..."
                style={[styles.input, { flex: 1 }]}
                onSubmitEditing={handleLookup}
              />
              <TouchableOpacity style={styles.lookupBtn} onPress={handleLookup} disabled={lookupLoading}>
                {lookupLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.lookupBtnText}>Tìm</Text>}
              </TouchableOpacity>
            </View>

            {lookupError && <Text style={styles.errorText}>{lookupError}</Text>}

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
              {lookupResults && lookupResults.length === 0 && (
                <Text style={styles.lookupEmpty}>Chưa có vấn đề nào từng báo cáo cho mã này.</Text>
              )}
              <View style={{ gap: 10 }}>
                {lookupResults?.map((item) => {
                  const badge = statusBadgeStyle[item.status];
                  const sevBadge = severityBadgeStyle[item.severity];
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.lookupCard}
                      onPress={() => {
                        setShowLookup(false);
                        router.push(`/issue/${item.id}`);
                      }}
                    >
                      <View style={styles.cardTopRow}>
                        <Text style={styles.cardPo}>PO {item.poCode}</Text>
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          <View style={[styles.badge, { backgroundColor: sevBadge.bg }]}>
                            <Text style={[styles.badgeText, { color: sevBadge.color }]}>
                              {severityLabel[item.severity]}
                            </Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.badgeText, { color: badge.color }]}>
                              {statusLabel[item.status]}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Text style={styles.cardDesc}>{item.description}</Text>
                      {item.rootCause && (
                        <Text style={styles.lookupRootCause}>🧩 Nguyên nhân gốc: {item.rootCause}</Text>
                      )}
                      {item.solution && (
                        <Text style={styles.lookupSolution}>✅ Giải pháp: {item.solution}</Text>
                      )}
                      <Text style={styles.cardMeta}>
                        {item.area?.name || "-"} · {item.team?.name || "-"} / {item.productionLine?.name || "-"} ·{" "}
                        {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity onPress={() => setShowLookup(false)} style={[styles.cancelBtn, { alignSelf: "center", marginTop: 8 }]}>
              <Text style={styles.cancelBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  topRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  topCardPrimary: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  topCardSecondary: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  topCardIcon: { fontSize: 24 },
  topCardTitle: { color: colors.primary, fontSize: 13.5, fontWeight: "700", textAlign: "center" },
  topCardTitleDark: { color: colors.text, fontSize: 13.5, fontWeight: "700", textAlign: "center" },

  lookupHint: { color: colors.textMuted, fontSize: 12.5, marginTop: -6, marginBottom: 10, lineHeight: 18 },
  lookupRow: { flexDirection: "row", gap: 8 },
  lookupBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  lookupBtnText: { color: colors.white, fontWeight: "700", fontSize: 14 },
  lookupEmpty: { color: colors.textMuted, textAlign: "center", marginTop: 20, marginBottom: 10 },
  lookupCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  lookupRootCause: { color: colors.statusAcceptedText, fontSize: 12.5, lineHeight: 18 },
  lookupSolution: { color: colors.statusDoneText, fontSize: 12.5, lineHeight: 18 },
  feedTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginTop: 6,
    marginBottom: 2,
  },
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
  cardTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  cardPo: { fontWeight: "600", color: colors.text, flexShrink: 1, fontSize: 14.5 },
  cardDesc: { color: colors.text },
  cardMeta: { color: colors.textMuted, fontSize: 12 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  sheetOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheetCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  sheetTitle: { fontWeight: "700", fontSize: 16, color: colors.text, marginBottom: 12 },
  formLabel: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: 13, color: colors.text },
  pillTextActive: { color: colors.white, fontWeight: "600" },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  addImageBtn: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: { color: colors.danger, fontSize: 13, marginTop: 10 },
  formActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 18 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelBtnText: { color: colors.textMuted, fontWeight: "600" },
  submitBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 12, paddingHorizontal: 20 },
  submitBtnText: { color: colors.white, fontWeight: "700" },
});
