import { useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import { Text } from "@/components/scaled-text";
import { colors } from "@/constants/colors";
import { radius } from "@/constants/ui-theme";

const TRACK_HEIGHT = 6;
const THUMB_SIZE = 26;

// Thanh kéo chỉnh cỡ chữ toàn app — tự viết bằng PanResponder (không cần cài thêm package
// native nào), kéo trái/phải để tăng/giảm trong khoảng [min, max].
export function FontSizeSlider({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const ratio = trackWidth > 0 ? (value - min) / (max - min) : 0;
  const thumbLeft = ratio * trackWidth;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gesture) => {
        if (trackWidth <= 0) return;
        const x = Math.min(trackWidth, Math.max(0, gesture.moveX - gesture.x0 + (valueRef.current - min) / (max - min) * trackWidth));
        const next = min + (x / trackWidth) * (max - min);
        onChange(Math.min(max, Math.max(min, next)));
      },
    }),
  ).current;

  function handleTrackTouch(evt: { nativeEvent: { locationX: number } }) {
    if (trackWidth <= 0) return;
    const x = Math.min(trackWidth, Math.max(0, evt.nativeEvent.locationX));
    const next = min + (x / trackWidth) * (max - min);
    onChange(Math.min(max, Math.max(min, next)));
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.endLabel, { fontSize: 13 }]}>A</Text>
      <View
        style={styles.trackTouchArea}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTrackTouch}
      >
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: thumbLeft }]} />
        </View>
        <View
          style={[styles.thumb, { left: Math.max(0, thumbLeft - THUMB_SIZE / 2) }]}
          {...panResponder.panHandlers}
        />
      </View>
      <Text style={[styles.endLabel, { fontSize: 20 }]}>A</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  endLabel: { color: colors.textMuted, fontWeight: "700" },
  trackTouchArea: { flex: 1, height: THUMB_SIZE, justifyContent: "center" },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  trackFill: { height: TRACK_HEIGHT, backgroundColor: colors.primary },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    top: "50%",
    marginTop: -THUMB_SIZE / 2,
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
