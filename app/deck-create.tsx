import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { createDeck } from "@/services/deck-crud";
import { useFeedbackToast } from "@/components/feedback-toast-provider";

const colors = {
  background: "#1E1E24",
  surface: "#262631",
  border: "rgba(255, 255, 255, 0.08)",
  text: "#F5F5F8",
  muted: "#A5A5B4",
  accent: "#FFD700",
};

export default function DeckCreateScreen() {
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();

  const [deckName, setDeckName] = useState("");
  const [isSimulated, setIsSimulated] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleGoBack() {
    try {
      router.back();
    } catch {
      router.replace("/(drawer)/decks");
    }
  }

  async function handleCreateDeck() {
    if (!deckName.trim()) {
      showFeedback("Digite um nome para o deck.", "error");
      return;
    }

    try {
      setLoading(true);
      const newDeck = await createDeck(deckName, "", [], isSimulated);
      showFeedback("Deck criado! Adicione cartas agora.", "success");
      router.push({
        pathname: "/deck-cards",
        params: { deckId: newDeck.id },
      });
    } catch (error) {
      console.error("Erro ao criar deck:", error);
      showFeedback("Erro ao criar deck.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleGoBack}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={colors.text}
            />
          </Pressable>
          <Text style={styles.headerTitle}>Novo Deck</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <MaterialCommunityIcons
            name="cards"
            size={64}
            color={colors.accent}
          />
          <Text style={styles.heroTitle}>Vamos criar um novo deck!</Text>
          <Text style={styles.heroDescription}>
            Escolha um nome e o tipo de deck para começar
          </Text>
        </View>

        {/* Nome do Deck */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Nome do Deck *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Blastoise Control"
            placeholderTextColor={colors.muted}
            value={deckName}
            onChangeText={setDeckName}
            editable={!loading}
          />
        </View>

        {/* Tipo de Deck */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Tipo de Deck *</Text>

          <Pressable
            style={[styles.typeCard, !isSimulated && styles.typeCardActive]}
            onPress={() => setIsSimulated(false)}
            disabled={loading}
          >
            <View style={styles.typeCardContent}>
              <MaterialCommunityIcons
                name="briefcase"
                size={32}
                color={!isSimulated ? colors.background : colors.muted}
              />
              <View style={styles.typeCardInfo}>
                <Text
                  style={[
                    styles.typeCardTitle,
                    !isSimulated && styles.typeCardTitleActive,
                  ]}
                >
                  Deck Real
                </Text>
                <Text
                  style={[
                    styles.typeCardDescription,
                    !isSimulated && styles.typeCardDescriptionActive,
                  ]}
                >
                  Apenas cartas que você possui
                </Text>
              </View>
            </View>
          </Pressable>

          <Pressable
            style={[styles.typeCard, isSimulated && styles.typeCardActive]}
            onPress={() => setIsSimulated(true)}
            disabled={loading}
          >
            <View style={styles.typeCardContent}>
              <MaterialCommunityIcons
                name="lightbulb"
                size={32}
                color={isSimulated ? colors.background : colors.muted}
              />
              <View style={styles.typeCardInfo}>
                <Text
                  style={[
                    styles.typeCardTitle,
                    isSimulated && styles.typeCardTitleActive,
                  ]}
                >
                  Deck Simulado
                </Text>
                <Text
                  style={[
                    styles.typeCardDescription,
                    isSimulated && styles.typeCardDescriptionActive,
                  ]}
                >
                  Qualquer combinação de cartas
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <MaterialCommunityIcons
            name="information"
            size={16}
            color={colors.accent}
          />
          <Text style={styles.infoText}>
            Você poderá adicionar cartas na próxima etapa
          </Text>
        </View>

        {/* Botão */}
        <Pressable
          style={[
            styles.createButton,
            (!deckName.trim() || loading) && styles.createButtonDisabled,
          ]}
          onPress={handleCreateDeck}
          disabled={!deckName.trim() || loading}
        >
          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color={colors.background}
          />
          <Text style={styles.createButtonText}>
            {loading ? "Criando..." : "Próximo"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  hero: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  heroDescription: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
  section: {
    marginTop: 24,
    gap: 12,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
  },
  typeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  typeCardActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  typeCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  typeCardInfo: {
    flex: 1,
    gap: 4,
  },
  typeCardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  typeCardTitleActive: {
    color: colors.background,
  },
  typeCardDescription: {
    color: colors.muted,
    fontSize: 12,
  },
  typeCardDescriptionActive: {
    color: "rgba(30, 30, 36, 0.7)",
  },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 24,
  },
  infoText: {
    color: colors.accent,
    fontSize: 12,
    flex: 1,
  },
  createButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 32,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "800",
  },
});
