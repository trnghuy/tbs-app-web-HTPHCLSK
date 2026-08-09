import { useState } from "react";
import { FlatList, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/scaled-text";
import { colors } from "@/constants/colors";
import { radius } from "@/constants/ui-theme";

export type ComboBoxOption = { id: string; name: string };

// Combobox dùng chung — bấm mở modal chọn 1 giá trị từ danh sách, thay cho các dãy pill luôn
// hiện sẵn. Dùng cho Mức độ nghiêm trọng, Danh mục lỗi (kèm "Khác")...
export function ComboBoxField({
  label,
  placeholder = "Chọn...",
  options,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  options: ComboBoxOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.field} onPress={() => setOpen(true)}>
        <Text style={[styles.fieldText, !selected && styles.fieldPlaceholder]}>
          {selected ? selected.name : placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(o) => o.id}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, item.id === value && styles.optionActive]}
                  onPress={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, item.id === value && styles.optionTextActive]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 10, marginBottom: 6 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  fieldText: { fontSize: 14, color: colors.text },
  fieldPlaceholder: { color: colors.textMuted },
  chevron: { color: colors.textMuted, fontSize: 14 },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 16,
    paddingBottom: 28,
  },
  sheetTitle: { fontWeight: "700", fontSize: 15, color: colors.text, marginBottom: 8 },
  option: { paddingVertical: 13, paddingHorizontal: 8, borderRadius: radius.sm },
  optionActive: { backgroundColor: colors.accentSoft },
  optionText: { fontSize: 14.5, color: colors.text },
  optionTextActive: { color: colors.primaryDark, fontWeight: "700" },
});
