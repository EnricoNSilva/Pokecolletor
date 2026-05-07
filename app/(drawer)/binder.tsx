import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getOwnedSetsWithCounts, OwnedSet } from "@/services/binder-crud";
import { isFirebaseConfigured } from "@/services/firebase";
import { useFeedbackToast } from "@/components/feedback-toast-provider";

const colors = {
  background: "#1E1E24",
  surface: "#262631",
  border: "rgba(255, 255, 255, 0.08)",
  text: "#F5F5F8",
  muted: "#A5A5B4",
  accent: "#FFD700",
};

export default function BinderScreen() {
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();
  const [sets, setSets] = useState<OwnedSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const hasShownEmptyToastRef = useRef(false);

  async function loadOwnedSets(showLoading = true) {
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

      const ownedSets = await getOwnedSetsWithCounts();
      setSets(ownedSets);

      if (ownedSets.length === 0 && !hasShownEmptyToastRef.current) {
        showFeedback(
          "Você ainda não tem cartas salvas. Acesse uma expansão para começar!",
          "info",
        );
        hasShownEmptyToastRef.current = true;
      }

      if (ownedSets.length > 0) {
        hasShownEmptyToastRef.current = false;
      }
    } catch (error) {
      console.error("Erro ao carregar expansões do fichário:", error);
      showFeedback("Erro ao carregar o fichário. Tente novamente.", "error");
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadOwnedSets(!hasLoadedOnce);
    }, [hasLoadedOnce]),
  );

  async function onRefresh() {
    try {
      setRefreshing(true);
      await loadOwnedSets(false);
    } finally {
      setRefreshing(false);
    }
  }
  
  // Navega para a tela de deck com as cartas da expansão dentro do fichário
  function handleNavigateToSet(set: OwnedSet) {
    router.push({
      pathname: "/deck",
      params: { setId: set.setId, setName: set.setName, ownedOnly: "true" },
    });
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Carregando fichário...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meu Fichário</Text>
        <Text style={styles.headerSubtitle}>
          {sets.length} expansão{sets.length !== 1 ? "ões" : ""} com cartas
        </Text>
      </View>

      <FlatList
        data={sets}
        keyExtractor={(item) => item.setId}
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
            style={styles.setCard}
            onPress={() => handleNavigateToSet(item)}
          >
            <View style={styles.setCardContent}>
              <View style={styles.setCardInfo}>
                <Text style={styles.setCardName} numberOfLines={2}>
                  {item.setName}
                </Text>
                <Text style={styles.setCardMeta}>
                  {item.uniqueCards} carta{item.uniqueCards !== 1 ? "s" : ""} •{" "}
                  {item.totalCards} cópia{item.totalCards !== 1 ? "s" : ""}
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
              name="folder-open-outline"
              size={56}
              color={colors.muted}
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.emptyTitle}>Fichário vazio</Text>
            <Text style={styles.emptyDescription}>
              Acesse uma expansão e marque as cartas que você tem para começar
              seu fichário.
            </Text>
            <Pressable
              style={styles.exploreButton}
              onPress={() => router.push("/(drawer)/sets")}
            >
              <Text style={styles.exploreButtonText}>Explorar expansões</Text>
            </Pressable>
          </View>
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
  setCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  setCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  setCardInfo: {
    flex: 1,
  },
  setCardName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 4,
  },
  setCardMeta: {
    color: colors.muted,
    fontSize: 13,
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
  exploreButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  exploreButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "800",
  },
});
