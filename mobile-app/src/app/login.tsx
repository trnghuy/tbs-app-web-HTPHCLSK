import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text } from "@/components/scaled-text";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { colors } from "@/constants/colors";
import { BrandMark } from "@/components/brand-mark";

// ─── DEMO_QUICK_LOGIN — chỉ dùng để demo, xoá cả khối này (và <QuickLoginRow/> bên dưới) khi
// triển khai thật, quay lại đăng nhập nhập tay bình thường. ─────────────────────────────────
const DEMO_ACCOUNTS: { code: string; label: string; icon: string }[] = [
  { code: "NV001", label: "Vận hành", icon: "🧑‍🏭" },
  { code: "QA001", label: "QA", icon: "🔍" },
  { code: "LL001", label: "Trưởng line", icon: "🧑‍🔧" },
  { code: "CN001", label: "Công nghệ", icon: "🧪" },
  { code: "TP001", label: "Trưởng phòng ban", icon: "🗂️" },
  { code: "BT001", label: "Bảo trì", icon: "🛠️" },
  { code: "GD001", label: "Giám đốc", icon: "🎯" },
];
const DEMO_PASSWORD = "123456";
// ─────────────────────────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { token, login } = useAuth();
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (token) return <Redirect href="/(tabs)" />;

  async function doLogin(code: string, pass: string) {
    setError(null);
    setLoading(true);
    try {
      await login(code.trim(), pass);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không thể đăng nhập");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    await doLogin(employeeCode, password);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="dark" />
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <BrandMark size={48} />
        </View>
        <Text style={styles.title}>Quản Lý Sự Cố Chất Lượng</Text>
        <Text style={styles.subtitle}>Đăng nhập để tiếp tục</Text>

        {/* DEMO_QUICK_LOGIN — xoá cả block này khi triển khai thật */}
        <Text style={styles.label}>Demo: chọn nhanh vai trò</Text>
        <View style={styles.demoRow}>
          {DEMO_ACCOUNTS.map((acc) => (
            <TouchableOpacity
              key={acc.code}
              style={styles.demoPill}
              onPress={() => doLogin(acc.code, DEMO_PASSWORD)}
              disabled={loading}
            >
              <Text style={styles.demoPillText}>
                {acc.icon} {acc.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.divider} />
        {/* /DEMO_QUICK_LOGIN */}

        <Text style={styles.label}>Tên đăng nhập</Text>
        <TextInput
          value={employeeCode}
          onChangeText={setEmployeeCode}
          autoCapitalize="characters"
          placeholder="Nhập tên đăng nhập"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Mật khẩu</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="Nhập mật khẩu"
            placeholderTextColor={colors.textMuted}
            style={styles.passwordInput}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((s) => !s)}
          >
            <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁"}</Text>
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // DEMO_QUICK_LOGIN — xoá cùng lúc với block JSX phía trên khi triển khai thật
  demoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  demoPill: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.accentSoft,
  },
  demoPillText: { color: colors.primaryDark, fontWeight: "600", fontSize: 12.5 },
  divider: { height: 1, backgroundColor: colors.border, marginTop: 18 },
  container: {
    flex: 1,
    backgroundColor: colors.lightGreenBg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  logoWrap: {
    alignSelf: "center",
    marginBottom: 16,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: "700", color: colors.text, textAlign: "center" },
  subtitle: { fontSize: 13, color: colors.textMuted, textAlign: "center", marginTop: 4, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  passwordWrap: { position: "relative", justifyContent: "center" },
  passwordInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingRight: 44,
    paddingVertical: 12,
    fontSize: 15,
  },
  eyeButton: {
    position: "absolute",
    right: 10,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  eyeIcon: { fontSize: 17 },
  error: {
    color: colors.danger,
    marginTop: 12,
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 8,
  },
  button: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
