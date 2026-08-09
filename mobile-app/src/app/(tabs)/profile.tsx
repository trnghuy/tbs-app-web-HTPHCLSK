import { useCallback, useState } from "react";
import { Image, Modal, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, resolveImageUrl } from "@/lib/api";
import { colors } from "@/constants/colors";
import { radius, raisedShadow } from "@/constants/ui-theme";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/scaled-text";
import { FontSizeSlider } from "@/components/font-size-slider";
import { TEXT_SCALE_MAX, TEXT_SCALE_MIN, useTextScale } from "@/lib/text-scale-context";

const roleLabel: Record<string, string> = {
  OPERATOR: "Nhân viên vận hành",
  QA: "QA",
  LINE_LEADER: "Trưởng line",
  TECHNOLOGY: "Công nghệ",
  DEPARTMENT_HEAD: "Trưởng phòng ban",
  MAINTENANCE: "Nhân viên bảo trì",
  DIRECTOR: "Giám đốc",
  ADMIN: "Admin",
};

export default function ProfileScreen() {
  const { user, token, logout, refreshUser } = useAuth();
  const { scale, setScale } = useTextScale();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser]),
  );

  async function handleChangeAvatar() {
    if (!token) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;

    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const uploaded = await api.uploadImage(token, asset.base64!, asset.mimeType || "image/jpeg");
      await api.updateAvatar(token, uploaded.url);
      await refreshUser();
    } catch {
      setMessage({ type: "error", text: "Không thể cập nhật ảnh đại diện" });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleChangePassword() {
    if (!token) return;
    setMessage(null);
    setSubmitting(true);
    try {
      await api.changePassword(token, oldPassword, newPassword);
      setMessage({ type: "success", text: "Đổi mật khẩu thành công" });
      setOldPassword("");
      setNewPassword("");
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof ApiError ? e.message : "Không thể đổi mật khẩu",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cá nhân</Text>
      </View>
      <View style={styles.content}>
      <Animated.View entering={FadeInDown.duration(320)} style={styles.profileHeader}>
        <PressableScale
          style={styles.avatar}
          onPress={handleChangeAvatar}
          disabled={uploadingAvatar}
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: resolveImageUrl(user.avatarUrl) }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{user?.name?.charAt(0)}</Text>
          )}
          <View style={styles.avatarEditBadge}>
            <Text style={styles.avatarEditIcon}>{uploadingAvatar ? "…" : "✎"}</Text>
          </View>
        </PressableScale>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>{user && roleLabel[user.role]}</Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(80).duration(320)} style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mã nhân viên</Text>
          <Text style={styles.infoValue}>{user?.employeeCode}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Số điện thoại</Text>
          <Text style={styles.infoValue}>{user?.phone || "-"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Khu vực / Xưởng</Text>
          <Text style={styles.infoValue}>{user?.area?.name || "-"}</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(110).duration(320)} style={styles.infoCard}>
        <View style={styles.fontSizeHeaderRow}>
          <Text style={styles.infoLabel}>Cỡ chữ</Text>
          <Text style={styles.fontSizeValue}>{Math.round(scale * 100)}%</Text>
        </View>
        <FontSizeSlider min={TEXT_SCALE_MIN} max={TEXT_SCALE_MAX} value={scale} onChange={setScale} />
      </Animated.View>

      {user?.role === "MAINTENANCE" && (
        <Animated.View entering={FadeInUp.delay(140).duration(320)} style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.stats?.totalTasks ?? 0}</Text>
            <Text style={styles.statLabel}>Tổng việc</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.stats?.completedTasks ?? 0}</Text>
            <Text style={styles.statLabel}>Đã hoàn thành</Text>
          </View>
        </Animated.View>
      )}

      <PressableScale style={styles.actionButton} onPress={() => setShowChangePassword(true)}>
        <Text style={styles.actionButtonText}>Đổi mật khẩu</Text>
      </PressableScale>

      <PressableScale style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Đăng xuất</Text>
      </PressableScale>
      </View>

      <Modal visible={showChangePassword} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown.duration(220)} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Đổi mật khẩu</Text>

            <TextInput
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder="Mật khẩu hiện tại"
              secureTextEntry
              style={styles.input}
            />
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Mật khẩu mới"
              secureTextEntry
              style={[styles.input, { marginTop: 10 }]}
            />

            {message && (
              <Text style={message.type === "error" ? styles.error : styles.success}>
                {message.text}
              </Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowChangePassword(false)}>
                <Text style={styles.cancelText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, submitting && { opacity: 0.6 }]}
                onPress={handleChangePassword}
                disabled={submitting}
              >
                <Text style={styles.confirmButtonText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
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
  headerTitle: { color: colors.text, fontSize: 19, fontWeight: "600" },
  content: { flex: 1, padding: 20 },
  profileHeader: { alignItems: "center", paddingBottom: 8, paddingTop: 12 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    position: "relative",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: colors.accentSoft,
  },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarText: { color: colors.white, fontSize: 32, fontWeight: "700" },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarEditIcon: { color: colors.white, fontSize: 12 },
  name: { fontSize: 18, fontWeight: "600", color: colors.text, marginTop: 8 },
  role: { color: colors.textSecondary, marginTop: 4, fontSize: 12.5 },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 12,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  infoLabel: { color: colors.textMuted },
  infoValue: { color: colors.text, fontWeight: "600" },
  fontSizeHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fontSizeValue: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  statsCard: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    marginTop: 12,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 15, fontWeight: "600", color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 2 },
  actionButton: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionButtonText: { color: colors.primary, fontWeight: "600" },
  logoutButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutButtonText: { color: colors.danger, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    width: "100%",
    ...raisedShadow,
  },
  modalTitle: { fontWeight: "700", fontSize: 16, marginBottom: 8, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
  },
  error: { color: colors.danger, marginTop: 8 },
  success: { color: colors.success, marginTop: 8 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 16, marginTop: 16 },
  cancelText: { color: colors.textMuted, paddingVertical: 10 },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  confirmButtonText: { color: colors.white, fontWeight: "700" },
});
