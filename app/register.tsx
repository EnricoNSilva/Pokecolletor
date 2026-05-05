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
import { signUpWithEmail } from "@/services/auth";
import { isFirebaseConfigured } from "@/services/firebase";
import { isStrongPassword, isValidEmail } from "@/services/validation";

const colors = {
  text: "#F5F5F8",
  muted: "#A5A5B4",
  accent: "#FFD700",
};

export default function RegisterScreen() {
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!isFirebaseConfigured) {
      showFeedback(
        "Firebase nao configurado. Preencha as variaveis no .env.",
        "error",
      );
      return;
    }

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      showFeedback("Por favor, preencha todos os campos.", "error");
      return;
    }

    if (!isValidEmail(email)) {
      showFeedback("Por favor, insira um e-mail válido.", "error");
      return;
    }

    if (!isStrongPassword(password)) {
      showFeedback("A senha deve ter pelo menos 6 caracteres.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showFeedback("As senhas não coincidem.", "error");
      return;
    }

    try {
      setLoading(true);
      await signUpWithEmail(email.trim(), password);
      showFeedback("Cadastro realizado com sucesso!", "success");
      router.replace("/");
    } catch (error: any) {
      if (error?.code === "auth/email-already-in-use") {
        showFeedback("Este e-mail já está em uso.", "error");
        return;
      }

      if (error?.code === "auth/weak-password") {
        showFeedback("A senha deve ter pelo menos 6 caracteres.", "error");
        return;
      }

      if (error?.code === "auth/invalid-email") {
        showFeedback("Por favor, insira um e-mail válido.", "error");
        return;
      }

      if (error?.code === "auth/network-request-failed") {
        showFeedback(
          "Falha de conexão. Verifique sua internet e tente novamente.",
          "error",
        );
        return;
      }

      showFeedback("Erro ao cadastrar usuário. Tente novamente.", "error");
      console.error("Erro ao cadastrar:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenShell
      badge="Novo treinador"
      title="Registrar"
      subtitle="Crie sua conta para salvar o fichário no Firebase e continuar de onde parou."
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

      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirmar senha"
        placeholderTextColor={colors.muted}
        secureTextEntry
        style={styles.input}
      />

      <Pressable
        style={styles.primaryButton}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#1E1E24" />
        ) : (
          <Text style={styles.primaryButtonText}>Criar conta</Text>
        )}
      </Pressable>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Já tem conta?</Text>
        <Link href="/login" asChild>
          <Pressable>
            <Text style={styles.linkText}>Entrar</Text>
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
