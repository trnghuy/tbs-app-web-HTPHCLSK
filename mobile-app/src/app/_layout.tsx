import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth-context";
import { TextScaleProvider } from "@/lib/text-scale-context";

export default function RootLayout() {
  return (
    <TextScaleProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
          <Stack.Screen name="login" options={{ animation: "fade" }} />
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          <Stack.Screen name="issue/[id]" options={{ animation: "slide_from_bottom" }} />
        </Stack>
      </AuthProvider>
    </TextScaleProvider>
  );
}
