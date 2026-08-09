import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "tbs-htph-clsk-text-scale";

export const TEXT_SCALE_MIN = 0.85;
export const TEXT_SCALE_MAX = 1.3;
const DEFAULT_SCALE = 1;

type TextScaleState = {
  scale: number;
  setScale: (scale: number) => void;
};

const TextScaleContext = createContext<TextScaleState | null>(null);

export function TextScaleProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScaleState] = useState(DEFAULT_SCALE);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = Number(raw);
        if (!Number.isNaN(parsed)) setScaleState(parsed);
      }
    })();
  }, []);

  function setScale(next: number) {
    const clamped = Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, next));
    setScaleState(clamped);
    AsyncStorage.setItem(STORAGE_KEY, String(clamped)).catch(() => {});
  }

  return (
    <TextScaleContext.Provider value={{ scale, setScale }}>{children}</TextScaleContext.Provider>
  );
}

export function useTextScale() {
  const ctx = useContext(TextScaleContext);
  if (!ctx) throw new Error("useTextScale must be used within TextScaleProvider");
  return ctx;
}
