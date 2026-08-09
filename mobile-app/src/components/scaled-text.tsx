import { forwardRef } from "react";
import { StyleSheet, Text as RNText, type TextProps } from "react-native";
import { useTextScale } from "@/lib/text-scale-context";

// Text thay thế cho react-native's Text — tự nhân fontSize theo tỉ lệ cỡ chữ người dùng chọn ở
// màn hình Cá nhân (mặc định 1.0 = không đổi). Import từ đây thay vì "react-native" ở mọi màn
// hình để cỡ chữ áp dụng toàn app.
export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...rest }, ref) {
  const { scale } = useTextScale();
  const flat = StyleSheet.flatten(style) || {};
  const fontSize = typeof flat.fontSize === "number" ? flat.fontSize : 14;

  return <RNText ref={ref} style={[style, { fontSize: fontSize * scale }]} {...rest} />;
});
