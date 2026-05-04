import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { FeedbackToast } from '@/components/feedback-toast';

const colors = {
  background: '#1E1E24',
  surface: '#262631',
  border: 'rgba(255, 255, 255, 0.08)',
  text: '#F5F5F8',
  muted: '#A5A5B4',
  accent: '#FFD700',
};

type AuthScreenShellProps = {
  title: string;
  subtitle: string;
  badge: string;
  children: ReactNode;
  feedbackMessage?: string | null;
  feedbackTone?: 'success' | 'error' | 'info';
};

export function AuthScreenShell({
  title,
  subtitle,
  badge,
  children,
  feedbackMessage,
  feedbackTone,
}: AuthScreenShellProps) {
  const { width } = useWindowDimensions();
  const isCompact = width < 420;

  return (
    <View style={styles.container}>
      <View style={styles.glow} />

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isCompact ? styles.scrollContentCompact : styles.scrollContentRegular,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="pokeball" size={16} color={colors.accent} />
              <Text style={styles.badgeText}>{badge}</Text>
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={[styles.card, isCompact ? styles.cardCompact : styles.cardRegular]}>
            <FeedbackToast message={feedbackMessage ?? null} tone={feedbackTone} />
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 28,
  },
  scrollContentCompact: {
    paddingTop: 44,
    paddingBottom: 20,
  },
  scrollContentRegular: {
    paddingTop: 72,
    paddingBottom: 28,
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 180,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  hero: {
    gap: 10,
    marginBottom: 18,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 14,
    width: '100%',
    alignSelf: 'center',
    maxWidth: 460,
  },
  cardCompact: {
    padding: 16,
  },
  cardRegular: {
    padding: 18,
  },
});
