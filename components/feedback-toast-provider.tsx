import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";

import { FeedbackToast } from "@/components/feedback-toast";

type FeedbackTone = "success" | "error" | "info";

type FeedbackToastContextValue = {
  showFeedback: (
    message: string,
    tone?: FeedbackTone,
    durationMs?: number,
  ) => void;
};

const FeedbackToastContext = createContext<FeedbackToastContextValue | null>(
  null,
);

type FeedbackToastProviderProps = {
  children: ReactNode;
};

export function FeedbackToastProvider({
  children,
}: FeedbackToastProviderProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<FeedbackTone>("info");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideFeedback = useCallback(() => {
    setMessage(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showFeedback = useCallback(
    (
      nextMessage: string,
      nextTone: FeedbackTone = "info",
      durationMs = 3000,
    ) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setMessage(nextMessage);
      setTone(nextTone);
      timeoutRef.current = setTimeout(() => {
        hideFeedback();
      }, durationMs);
    },
    [hideFeedback],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      showFeedback,
    }),
    [showFeedback],
  );

  return (
    <FeedbackToastContext.Provider value={value}>
      {children}
      <View pointerEvents="none" style={styles.toastContainer}>
        <FeedbackToast message={message} tone={tone} />
      </View>
    </FeedbackToastContext.Provider>
  );
}

export function useFeedbackToast() {
  const context = useContext(FeedbackToastContext);

  if (!context) {
    throw new Error(
      "useFeedbackToast deve ser usado dentro de FeedbackToastProvider.",
    );
  }

  return context;
}

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    left: 14,
    right: 14,
    top: 18,
    zIndex: 9999,
    elevation: 20,
  },
});
