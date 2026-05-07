import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Deck, getDecksByUser } from "@/services/deck-crud";
import { isFirebaseConfigured } from "@/services/firebase";
import { useFeedbackToast } from "@/components/feedback-toast-provider";

const colors = {
  background: "#1E1E24",
  surface: "#262631",
  border: "rgba(255, 255, 255, 0.08)",
  text: "#F5F5F8",
  muted: "#A5A5B4",
  accent: "#FFD700",
  danger: "#FF6B6B",
  success: "#2ED573",
};

export default function DecksScreen() {
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const hasShownEmptyToastRef = useRef(false);

  async function loadDecks(showLoading = true) {
    if (!isFirebaseConfigured) {
      showFeedback(
        "Firebase não configurado. Preencha as variáveis no .env.",
        "error",
      );
      setLoading(false);
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }

      const userDecks = await getDecksByUser();
      setDecks(userDecks);

      if (userDecks.length === 0 && !hasShownEmptyToastRef.current) {
        showFeedback("Você ainda não tem decks. Crie um novo!", "info");
        hasShownEmptyToastRef.current = true;
      }

      if (userDecks.length > 0) {
        hasShownEmptyToastRef.current = false;
      }
    } catch (error) {
      console.error("Erro ao carregar decks:", error);
      showFeedback("Erro ao carregar decks. Tente novamente.", "error");
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadDecks(!hasLoadedOnce);
    }, [hasLoadedOnce]),
  );

  async function onRefresh() {
    try {
      setRefreshing(true);
      await loadDecks(false);
    } finally {
      setRefreshing(false);
    }
  }

  function handleCreateDeck() {
    router.push("/deck-create");
  }

  function handleEditDeck(deckId: string) {
    router.push({
      pathname: "/deck-cards",
      params: { deckId },
    });
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Carregando decks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Decks</Text>
        <Text style={styles.headerSubtitle}>
          {decks.length} deck{decks.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={decks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.deckCard}
            onPress={() => handleEditDeck(item.id)}
          >
            <View style={styles.deckCardContent}>
              <View style={styles.deckCardInfo}>
                <View style={styles.deckCardHeader}>
                  <Text style={styles.deckCardName} numberOfLines={1}>
                    {item.name}
                  </Text>

                  {!item.isValid && (
                    <View style={styles.invalidBadge}>
                      <MaterialCommunityIcons
                        name="alert-circle"
                        size={14}
                        color={colors.danger}
                      />
                    </View>
                  )}


                </View>

                <Text style={styles.deckCardDescription} numberOfLines={1}>
                  {item.description || "Sem descrição"}
                </Text>

                <Text style={styles.deckCardStats}>
                  {item.cards.length} carta
                  {item.cards.length !== 1 ? "s" : ""} •{" "}
                  {item.cards.reduce((sum, c) => sum + c.quantity, 0)}/60
                </Text>
              </View>

              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={colors.accent}
              />
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons
              name="cards"
              size={56}
              color={colors.muted}
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.emptyTitle}>Nenhum deck criado</Text>
            <Text style={styles.emptyDescription}>
              Crie seu primeiro deck para começar a montar estratégias!
            </Text>
            <Pressable style={styles.createButton} onPress={handleCreateDeck}>
              <MaterialCommunityIcons
                name="plus"
                size={20}
                color={colors.background}
              />
              <Text style={styles.createButtonText}>Criar Deck</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          decks.length > 0 ? (
            <Pressable
              style={styles.createNewButton}
              onPress={handleCreateDeck}
            >
              <MaterialCommunityIcons
                name="plus"
                size={20}
                color={colors.background}
              />
              <Text style={styles.createNewButtonText}>Novo Deck</Text>
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 12,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 4,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
  },
  headerSubtitle: {
    color: colors.muted,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  deckCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  deckCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  deckCardInfo: {
    flex: 1,
    gap: 6,
  },
  deckCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deckCardName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  invalidBadge: {
    padding: 4,
  },

  deckCardDescription: {
    color: colors.muted,
    fontSize: 13,
  },
  deckCardStats: {
    color: colors.muted,
    fontSize: 12,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptyDescription: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  createButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "800",
  },
  createNewButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  createNewButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "800",
  },
});
