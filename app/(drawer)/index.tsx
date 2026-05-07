import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getOwnedSetsWithCounts } from "@/services/binder-crud";
import { getDecksByUser } from "@/services/deck-crud";
import { getSets, PokemonTcgSet } from "@/services/pokemon-tcg-api";
import { auth, isFirebaseConfigured } from "@/services/firebase";
import { useFeedbackToast } from "@/components/feedback-toast-provider";
import { useRouter } from "expo-router";

type DashboardStats = {
  decksCount: number;
  ownedSetsCount: number;
  totalOwnedCards: number;
  uniqueOwnedCards: number;
  validDecksCount: number;
};

type CollectionProgress = {
  setId: string;
  setName: string;
  ownedUniqueCards: number;
  totalCardsInSet: number;
  completion: number;
  isComplete: boolean;
};

const colors = {
  background: "#1E1E24",
  surface: "#262631",
  surfaceAlt: "#2F2F3D",
  border: "rgba(255, 255, 255, 0.08)",
  text: "#F5F5F8",
  muted: "#A5A5B4",
  accent: "#FFD700",
  success: "#2ED573",
  danger: "#FF6B6B",
};

export default function DashboardScreen() {
  const router = useRouter();
  const { showFeedback } = useFeedbackToast();

  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [collections, setCollections] = useState<CollectionProgress[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    decksCount: 0,
    ownedSetsCount: 0,
    totalOwnedCards: 0,
    uniqueOwnedCards: 0,
    validDecksCount: 0,
  });

  const displayName = useMemo(() => {
    const currentUser = auth?.currentUser;
    return (
      currentUser?.displayName?.trim() ||
      currentUser?.email?.split("@")[0] ||
      "Treinador"
    );
  }, []);

  const loadDashboard = useCallback(
    async (showLoading = true, signal?: AbortSignal) => {
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

        const [decks, ownedSets, setCatalog] = await Promise.all([
          getDecksByUser({ signal }),
          getOwnedSetsWithCounts({ signal }),
          getSets(1, 250, { signal }),
        ]);

        const setCatalogMap = new Map<string, PokemonTcgSet>(
          setCatalog.data.map((item) => [item.id, item]),
        );

        const mappedCollections = ownedSets
          .map<CollectionProgress>((ownedSet) => {
            const catalogSet = setCatalogMap.get(ownedSet.setId);
            const totalCardsInSet =
              catalogSet?.printedTotal ?? catalogSet?.total ?? 0;
            const completion =
              totalCardsInSet > 0
                ? Math.min(
                    100,
                    Math.round((ownedSet.uniqueCards / totalCardsInSet) * 100),
                  )
                : 0;

            return {
              setId: ownedSet.setId,
              setName: catalogSet?.name ?? ownedSet.setName,
              ownedUniqueCards: ownedSet.uniqueCards,
              totalCardsInSet,
              completion,
              isComplete: completion >= 100,
            };
          })
          .sort(
            (a, b) =>
              b.completion - a.completion ||
              b.ownedUniqueCards - a.ownedUniqueCards ||
              a.setName.localeCompare(b.setName),
          );

        setStats({
          decksCount: decks.length,
          ownedSetsCount: ownedSets.length,
          totalOwnedCards: ownedSets.reduce(
            (sum, item) => sum + item.totalCards,
            0,
          ),
          uniqueOwnedCards: ownedSets.reduce(
            (sum, item) => sum + item.uniqueCards,
            0,
          ),
          validDecksCount: decks.filter((deck) => deck.isValid).length,
        });
        setCollections(mappedCollections);
      } catch (error: any) {
        // Ignora erros de cancelamento (quando o usuario navega para fora)
        if (error.name === "CanceledError" || error.message === "canceled") {
          return;
        }

        if (showLoading) {
          console.error("Erro ao carregar dashboard:", error);
          showFeedback("Erro ao carregar o dashboard.", "error");
        }
      } finally {
        setLoading(false);
        setHasLoadedOnce(true);
      }
    },
    [showFeedback],
  );

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      loadDashboard(!hasLoadedOnce, controller.signal);

      return () => {
        controller.abort();
      };
    }, [hasLoadedOnce, loadDashboard]),
  );

  const quickActions = [
    {
      id: "sets",
      title: "Explorar Expansões",
      subtitle: "Buscar cartas e adicionar ao fichário",
      icon: "cards-outline",
      onPress: () => router.push("/(drawer)/sets"),
    },
    {
      id: "binder",
      title: "Abrir Fichário",
      subtitle: "Ver o que já foi salvo",
      icon: "book-open-page-variant",
      onPress: () => router.push("/(drawer)/binder"),
    },
    {
      id: "decks",
      title: "Gerenciar Decks",
      subtitle: "Criar e editar decks",
      icon: "cards",
      onPress: () => router.push("/(drawer)/decks"),
    },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.eyebrowRow}>
          <View style={styles.badge}>
            <MaterialCommunityIcons
              name="pokeball"
              size={14}
              color={colors.accent}
            />
            <Text style={styles.badgeText}>PokéCollector</Text>
          </View>
        </View>

        <Text style={styles.title}>Olá, {displayName}</Text>
        <Text style={styles.description}>
          Seu centro de comando para montar fichário, criar decks e acompanhar o
          progresso.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <MaterialCommunityIcons
            name="book-open-page-variant"
            size={22}
            color={colors.accent}
          />
          <Text style={styles.statValue}>{stats.ownedSetsCount}</Text>
          <Text style={styles.statLabel}>Expansões no fichário</Text>
        </View>

        <View style={styles.statCard}>
          <MaterialCommunityIcons
            name="cards"
            size={22}
            color={colors.accent}
          />
          <Text style={styles.statValue}>{stats.totalOwnedCards}</Text>
          <Text style={styles.statLabel}>Cartas salvas</Text>
        </View>

        <View style={styles.statCard}>
          <MaterialCommunityIcons
            name="cards-outline"
            size={22}
            color={colors.accent}
          />
          <Text style={styles.statValue}>{stats.uniqueOwnedCards}</Text>
          <Text style={styles.statLabel}>Cartas únicas</Text>
        </View>

        <View style={styles.statCard}>
          <MaterialCommunityIcons
            name="layers-triple"
            size={22}
            color={colors.accent}
          />
          <Text style={styles.statValue}>{stats.decksCount}</Text>
          <Text style={styles.statLabel}>Decks criados</Text>
        </View>

        <View style={styles.statCard}>
          <MaterialCommunityIcons
            name="check-decagram"
            size={22}
            color={colors.success}
          />
          <Text style={styles.statValue}>{stats.validDecksCount}</Text>
          <Text style={styles.statLabel}>Decks válidos</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ações rápidas</Text>
          <Text style={styles.sectionSubtitle}>
            Atalhos principais do projeto
          </Text>
        </View>

        <View style={styles.actionList}>
          {quickActions.map((action) => (
            <Pressable
              key={action.id}
              style={styles.actionCard}
              onPress={action.onPress}
            >
              <View style={styles.actionIconBox}>
                <MaterialCommunityIcons
                  name={action.icon as never}
                  size={22}
                  color={colors.accent}
                />
              </View>
              <View style={styles.actionTextBlock}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={colors.muted}
              />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Coleções</Text>
          <Text style={styles.sectionSubtitle}>
            Cada coleção mostra quanto do set já foi concluído com cartas
            únicas.
          </Text>
        </View>

        {collections.length === 0 ? (
          <View style={styles.emptyCollectionBox}>
            <MaterialCommunityIcons
              name="chart-box-outline"
              size={32}
              color={colors.muted}
            />
            <Text style={styles.emptyCollectionTitle}>
              Nenhuma coleção iniciada ainda
            </Text>
            <Text style={styles.emptyCollectionText}>
              Salve cartas em uma expansão para ver o progresso aparecer aqui.
            </Text>
          </View>
        ) : (
          <View style={styles.collectionList}>
            {collections.map((collection) => (
              <View key={collection.setId} style={styles.collectionCard}>
                <View style={styles.collectionTopRow}>
                  <View style={styles.collectionTextBlock}>
                    <Text style={styles.collectionName} numberOfLines={2}>
                      {collection.setName}
                    </Text>
                    <Text style={styles.collectionMeta}>
                      {collection.ownedUniqueCards} única
                      {collection.ownedUniqueCards !== 1 ? "s" : ""} de{" "}
                      {collection.totalCardsInSet} cartas
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.collectionBadge,
                      collection.isComplete && styles.collectionBadgeComplete,
                    ]}
                  >
                    <Text
                      style={[
                        styles.collectionBadgeText,
                        collection.isComplete &&
                          styles.collectionBadgeTextComplete,
                      ]}
                    >
                      {collection.completion}%
                    </Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${collection.completion}%`,
                        backgroundColor: collection.isComplete
                          ? colors.success
                          : colors.accent,
                      },
                    ]}
                  />
                </View>

                <View style={styles.collectionFooter}>
                  <Text style={styles.collectionFooterText}>
                    {collection.isComplete
                      ? "Coleção completa"
                      : "Progresso em andamento"}
                  </Text>
                  <MaterialCommunityIcons
                    name={collection.isComplete ? "trophy" : "progress-check"}
                    size={18}
                    color={
                      collection.isComplete ? colors.success : colors.muted
                    }
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    gap: 18,
  },
  hero: {
    gap: 10,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  statValue: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 16,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  actionList: {
    gap: 10,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 215, 0, 0.08)",
  },
  actionTextBlock: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  actionSubtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  collectionList: {
    gap: 12,
  },
  collectionCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  collectionTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  collectionTextBlock: {
    flex: 1,
    gap: 4,
  },
  collectionName: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
  },
  collectionMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  collectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 215, 0, 0.12)",
  },
  collectionBadgeComplete: {
    backgroundColor: "rgba(46, 213, 115, 0.14)",
  },
  collectionBadgeText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  collectionBadgeTextComplete: {
    color: colors.success,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  collectionFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  collectionFooterText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  emptyCollectionBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyCollectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyCollectionText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
