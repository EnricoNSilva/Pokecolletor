import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";

import { AuthScreenShell } from "@/components/auth-screen-shell";
import { useFeedbackToast } from "@/components/feedback-toast-provider";
import { signInWithEmail } from "@/services/auth";
import { isFirebaseConfigured } from "@/services/firebase";
import { isValidEmail } from "@/services/validation";

const colors = {
  text: "#F5F5F8",
  muted: "#A5A5B4",
  accent: "#FFD700",
};

export default function LoginScreen() {
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!isFirebaseConfigured) {
      showFeedback(
        "Firebase nao configurado. Preencha as variaveis no .env.",
        "error",
      );
      return;
    }

    if (!email.trim() || !password.trim()) {
      showFeedback("Por favor, preencha e-mail e senha.", "error");
      return;
    }

    if (!isValidEmail(email)) {
      showFeedback("Por favor, insira um e-mail válido.", "error");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmail(email.trim(), password);
      showFeedback("Login realizado com sucesso!", "success");
      router.replace("/");
    } catch (error: any) {
      if (error?.code === "auth/invalid-credential") {
        showFeedback("E-mail ou senha inválidos.", "error");
        return;
      }

      if (error?.code === "auth/user-disabled") {
        showFeedback("Esta conta foi desativada.", "error");
        return;
      }

      if (error?.code === "auth/too-many-requests") {
        showFeedback(
          "Muitas tentativas. Aguarde alguns instantes e tente novamente.",
          "error",
        );
        return;
      }

      if (error?.code === "auth/network-request-failed") {
        showFeedback(
          "Falha de conexão. Verifique sua internet e tente novamente.",
          "error",
        );
        return;
      }

      showFeedback("Erro ao fazer login. Tente novamente.", "error");
      console.error("Erro ao autenticar:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenShell
      badge="Acesso do treinador"
      title="Entrar"
      subtitle="Use seu email e senha para acessar o PokéCollector e continuar sua coleção."
    >
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Senha"
        placeholderTextColor={colors.muted}
        secureTextEntry
        style={styles.input}
      />

      <Pressable
        style={styles.primaryButton}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#1E1E24" />
        ) : (
          <Text style={styles.primaryButtonText}>Entrar</Text>
        )}
      </Pressable>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Ainda não tem conta?</Text>
        <Link href="/register" asChild>
          <Pressable>
            <Text style={styles.linkText}>Criar cadastro</Text>
          </Pressable>
        </Link>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#1E1E24",
    borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    width: "100%",
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    width: "100%",
  },
  primaryButtonText: {
    color: "#1E1E24",
    fontWeight: "800",
    fontSize: 15,
  },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    color: colors.muted,
    fontSize: 13,
  },
  linkText: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 13,
  },
});
