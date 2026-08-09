import { useState, useEffect } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text } from "@/components/scaled-text";
import { useAuth } from "@/lib/auth-context";
import { ApiError, getServerUrl, setServerUrl } from "@/lib/api";
import { colors } from "@/constants/colors";
import { BrandMark } from "@/components/brand-mark";

// ─── DANH SÁCH 8 VAI TRÒ KIỂM THỬ NHANH (1-CHẠM) ───────────────────────────
const DEMO_ACCOUNTS: { code: string; label: string; icon: string }[] = [
  { code: "NV001", label: "Vận hành", icon: "👷" },
  { code: "QA001", label: "QA", icon: "🔍" },
  { code: "LL001", label: "Trưởng line", icon: "👔" },
  { code: "CN001", label: "Công nghệ", icon: "⚙️" },
  { code: "TP001", label: "Trưởng phòng", icon: "📋" },
  { code: "BT001", label: "Bảo trì", icon: "🔧" },
  { code: "GD001", label: "Giám đốc", icon: "🏢" },
  { code: "ADM001", label: "Admin", icon: "🛡️" },
];
const DEMO_PASSWORD = "123456";
// ─────────────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { token, login } = useAuth();
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Server URL Configuration state
  const [serverHost, setServerHost] = useState("Đang tải...");
  const [showServerModal, setShowServerModal] = useState(false);
  const [customServer, setCustomServer] = useState("");

  useEffect(() => {
    getServerUrl().then((url) => setServerHost(url));
  }, []);

  if (token) return <Redirect href="/(tabs)" />;

  function handleSelectRole(code: string) {
    setEmployeeCode(code);
    setPassword(DEMO_PASSWORD);
    setSelectedRole(code);
    setError(null);
  }

  async function doLogin(code: string, pass: string) {
    setError(null);
    setLoading(true);
    try {
      await login(code.trim(), pass);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không thể kết nối tới máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (!employeeCode.trim() || !password.trim()) {
      setError("Vui lòng điền tên đăng nhập và mật khẩu.");
      return;
    }
    await doLogin(employeeCode, password);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Logo container */}
          <View style={styles.logoWrap}>
            <BrandMark size={44} />
          </View>

          {/* Title & Brand Slogan */}
          <Text style={styles.brandTitle}>TBS HTPH-CLSK</Text>
          <Text style={styles.brandSubtitle}>
            Hệ Thống Phản Hồi & Xử Lý Sự Cố Chất Lượng
          </Text>

          <View style={styles.infoPill}>
            <Text style={styles.infoPillText}>🌿 Cổng Đăng Nhập Di Động Phân Xưởng</Text>
          </View>

          {/* 1-Tap Quick Role Picker */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Chọn nhanh vai trò kiểm thử</Text>
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>8 Roles</Text>
            </View>
          </View>

          <View style={styles.demoGrid}>
            {DEMO_ACCOUNTS.map((acc) => {
              const isSelected = employeeCode === acc.code || selectedRole === acc.code;
              return (
                <TouchableOpacity
                  key={acc.code}
                  style={[
                    styles.demoPill,
                    isSelected && styles.demoPillActive,
                  ]}
                  onPress={() => handleSelectRole(acc.code)}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.demoPillIcon}>{acc.icon}</Text>
                  <Text
                    style={[
                      styles.demoPillText,
                      isSelected && styles.demoPillTextActive,
                    ]}
                  >
                    {acc.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.divider} />

          {/* Input: Username */}
          <Text style={styles.label}>Tên đăng nhập (Mã nhân viên)</Text>
          <TextInput
            value={employeeCode}
            onChangeText={(v) => {
              setEmployeeCode(v);
              setSelectedRole(null);
            }}
            autoCapitalize="characters"
            placeholder="VD: NV001, QA001, LL001..."
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />

          {/* Input: Password */}
          <Text style={styles.label}>Mật khẩu</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="Nhập mật khẩu"
              placeholderTextColor="#94A3B8"
              style={styles.passwordInput}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((s) => !s)}
            >
              <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁"}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hintText}>
            Mật khẩu mặc định: <Text style={styles.hintBold}>123456</Text>
          </Text>

          {/* Error message */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Primary Submit Button (TBS Green) */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {loading ? "Đang kết nối hệ thống..." : "Đăng Nhập"}
            </Text>
          </TouchableOpacity>

          {/* Server Config Button */}
          <TouchableOpacity
            style={styles.serverButton}
            onPress={async () => {
              const current = await getServerUrl();
              setCustomServer(current);
              setShowServerModal(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.serverButtonText}>⚙️ Máy chủ: {serverHost}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Cấu hình Server URL */}
      {showServerModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cấu Hình Địa Chỉ Máy Chủ</Text>
            <Text style={styles.modalSub}>
              Nhập IP máy chủ phân xưởng hoặc Domain của hệ thống TBS HTPH-CLSK
            </Text>
            <TextInput
              value={customServer}
              onChangeText={setCustomServer}
              placeholder="VD: http://192.168.1.100:3000"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowServerModal(false)}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={async () => {
                  if (customServer.trim()) {
                    await setServerUrl(customServer.trim());
                    setServerHost(customServer.trim());
                  }
                  setShowServerModal(false);
                }}
              >
                <Text style={styles.modalSaveText}>Lưu Cấu Hình</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#005A36",
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logoWrap: {
    alignSelf: "center",
    marginBottom: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 12.5,
    color: "#005A36",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 12,
  },
  infoPill: {
    alignSelf: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 18,
  },
  infoPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#005A36",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  badgeCount: {
    backgroundColor: "#ECFDF5",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#005A36",
  },
  demoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  demoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#F8FAFC",
  },
  demoPillActive: {
    borderColor: "#005A36",
    backgroundColor: "#005A36",
    shadowColor: "#005A36",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  demoPillIcon: {
    fontSize: 13,
  },
  demoPillText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 11.5,
  },
  demoPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginTop: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  passwordWrap: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingRight: 44,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  eyeButton: {
    position: "absolute",
    right: 10,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  eyeIcon: {
    fontSize: 16,
  },
  hintText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 5,
  },
  hintBold: {
    fontWeight: "700",
    color: "#005A36",
  },
  errorBox: {
    marginTop: 12,
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "600",
  },
  button: {
    marginTop: 20,
    backgroundColor: "#005A36",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: "#005A36",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  serverButton: {
    marginTop: 16,
    alignSelf: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  serverButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalCancel: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  modalSave: {
    backgroundColor: "#005A36",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: "#005A36",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  modalSaveText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
