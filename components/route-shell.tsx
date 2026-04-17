import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

type RouteShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  notes: string[];
  footerLabel: string;
};

const colors = {
  background: "#1E1E24",
  surface: "#272733",
  surfaceAlt: "#2F2F3D",
  text: "#F5F5F8",
  muted: "#A5A5B4",
  accent: "#FFD700",
  border: "rgba(255, 255, 255, 0.08)",
};

export function RouteShell({
  eyebrow,
  title,
  description,
  notes,
  footerLabel,
}: RouteShellProps) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.badge}>
            <MaterialCommunityIcons
              name="star"
              size={16}
              color={colors.accent}
            />
            <Text style={styles.badgeText}>Base do projeto</Text>
          </View>
          <Text style={styles.cardTitle}>
            Estrutura pronta para as próximas telas
          </Text>
        </View>

        <View style={styles.notesList}>
          {notes.map((note) => (
            <View key={note} style={styles.noteRow}>
              <View style={styles.noteDot} />
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>{footerLabel}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 18,
  },
  hero: {
    gap: 10,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 16,
  },
  cardHeader: {
    gap: 12,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
  },
  badgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  notesList: {
    gap: 12,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  noteDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 7,
    backgroundColor: colors.accent,
  },
  noteText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 8,
  },
  footerLabel: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});
