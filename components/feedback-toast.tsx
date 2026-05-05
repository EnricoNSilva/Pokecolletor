import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type FeedbackTone = "success" | "error" | "info";

type FeedbackToastProps = {
  message: string | null;
  tone?: FeedbackTone;
};

const colors = {
  successBg: "#173424",
  successBorder: "#2ED573",
  successText: "#ECFFF1",
  successSubText: "#CBEFD5",
  errorBg: "#351B20",
  errorBorder: "#FF6B6B",
  errorText: "#FFECEC",
  errorSubText: "#FFCACD",
  infoBg: "#2C280F",
  infoBorder: "#FFD700",
  infoText: "#FFF9E6",
  infoSubText: "#FFF0B0",
};

const iconByTone: Record<
  FeedbackTone,
  keyof typeof MaterialCommunityIcons.glyphMap
> = {
  success: "check-circle-outline",
  error: "alert-circle-outline",
  info: "information-outline",
};

export function FeedbackToast({ message, tone = "info" }: FeedbackToastProps) {
  if (!message) {
    return null;
  }

  const palette =
    tone === "success"
      ? {
          backgroundColor: colors.successBg,
          borderColor: colors.successBorder,
          textColor: colors.successText,
          subTextColor: colors.successSubText,
        }
      : tone === "error"
        ? {
            backgroundColor: colors.errorBg,
            borderColor: colors.errorBorder,
            textColor: colors.errorText,
            subTextColor: colors.errorSubText,
          }
        : {
            backgroundColor: colors.infoBg,
            borderColor: colors.infoBorder,
            textColor: colors.infoText,
            subTextColor: colors.infoSubText,
          };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
      ]}
    >
      <View
        style={[styles.iconBadge, { backgroundColor: palette.borderColor }]}
      >
        <MaterialCommunityIcons
          name={iconByTone[tone]}
          size={18}
          color={palette.backgroundColor}
        />
      </View>

      <View style={styles.textColumn}>
        <Text style={[styles.appName, { color: palette.subTextColor }]}>
          PokéCollector
        </Text>
        <Text style={[styles.message, { color: palette.textColor }]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 13,
    elevation: 12,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  appName: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
});
