import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getCardsBySet, PokemonTcgCard } from "@/services/pokemon-tcg-api";
import {
  addOwnedCard,
  deleteOwnedCard,
  getOwnedCardsBySet,
  OwnedCard,
  updateOwnedCardQuantity,
} from "../services/binder-crud";
import { isFirebaseConfigured } from "../services/firebase";

const colors = {
  background: "#1E1E24",
  surface: "#262631",
  border: "rgba(255, 255, 255, 0.08)",
  text: "#F5F5F8",
  muted: "#A5A5B4",
  accent: "#FFD700",
};

function compareCardNumber(left: string, right: string) {
  const leftNormalized = left.trim();
  const rightNormalized = right.trim();

  const leftMatch = leftNormalized.match(/^(\d+)([a-zA-Z]*)$/);
  const rightMatch = rightNormalized.match(/^(\d+)([a-zA-Z]*)$/);

  if (leftMatch && rightMatch) {
    const leftBase = Number(leftMatch[1]);
    const rightBase = Number(rightMatch[1]);

    if (leftBase !== rightBase) {
      return leftBase - rightBase;
    }

    const leftSuffix = leftMatch[2].toLowerCase();
    const rightSuffix = rightMatch[2].toLowerCase();

    return leftSuffix.localeCompare(rightSuffix);
  }

  return leftNormalized.localeCompare(rightNormalized, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function sortCardsByNumber(list: PokemonTcgCard[]) {
  return [...list].sort((left, right) => {
    const numberOrder = compareCardNumber(left.number, right.number);

    if (numberOrder !== 0) {
      return numberOrder;
    }

    return left.name.localeCompare(right.name, undefined, {
      sensitivity: "base",
    });
  });
}

export default function DeckScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    setId?: string;
    setName?: string;
    ownedOnly?: string;
  }>();

  const setId = typeof params.setId === "string" ? params.setId : "";
  const setName =
    typeof params.setName === "string" ? params.setName : "Expansão";
  const ownedOnly = params.ownedOnly === "true";

  const [cards, setCards] = useState<PokemonTcgCard[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [ownedQuantities, setOwnedQuantities] = useState<
    Record<string, number>
  >({});
  const [pendingCardIds, setPendingCardIds] = useState<Record<string, boolean>>(
    {},
  );
  const loadingPageRef = useRef<number | null>(null);
  const isSearching = search.trim().length > 0;

  function blurFocusedElementOnWeb() {
    if (Platform.OS !== "web") {
      return;
    }

    const activeElement = (globalThis as { document?: Document }).document
      ?.activeElement as HTMLElement | null;

    activeElement?.blur?.();
  }

  const totalOwnedCount = Object.keys(ownedQuantities).length;

  const filteredCards = useMemo(() => {
    const visibleCards = ownedOnly
      ? cards.filter((card) => (ownedQuantities[card.id] ?? 0) > 0)
      : cards;
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return visibleCards;
    }

    return visibleCards.filter(
      (card) =>
        card.name.toLowerCase().includes(normalizedSearch) ||
        card.number.toLowerCase().includes(normalizedSearch),
    );
  }, [cards, ownedOnly, ownedQuantities, search]);

  const gridCards = useMemo(() => {
    const nextCards = [...filteredCards];

    if (nextCards.length % 2 === 1) {
      nextCards.push({ id: "__placeholder__" } as PokemonTcgCard);
    }

    return nextCards;
  }, [filteredCards]);



  function withPending(cardId: string, isPending: boolean) {
    setPendingCardIds((previous) => ({
      ...previous,
      [cardId]: isPending,
    }));
  }

  async function loadOwnedCards() {
    if (!setId || !isFirebaseConfigured) {
      setOwnedQuantities({});
      return;
    }

    try {
      const ownedCards = await getOwnedCardsBySet(setId);
      const ownedMap = ownedCards.reduce<Record<string, number>>(
        (accumulator: Record<string, number>, current: OwnedCard) => {
          accumulator[current.cardId] = current.quantity;
          return accumulator;
        },
        {},
      );

      setOwnedQuantities(ownedMap);
    } catch (loadOwnedError) {
      console.error("Erro ao carregar cartas do fichario:", loadOwnedError);
    }
  }

  async function loadCards(nextPage = 1, append = false) {
    if (!setId) {
      setError("ID da expansão não informado.");
      setLoading(false);
      return;
    }

    if (loadingPageRef.current === nextPage) {
      return;
    }

    try {
      loadingPageRef.current = nextPage;
      if (nextPage === 1 && !append) {
        setLoading(true);
      }

      setError(null);
      const response = await getCardsBySet(setId, nextPage, 24);

      setCards((previous) => {
        if (!append) {
          return sortCardsByNumber(response.data);
        }

        // Filter out any duplicates just in case
        const existingIds = new Set(previous.map((c) => c.id));
        const newCards = response.data.filter((c) => !existingIds.has(c.id));

        return sortCardsByNumber([...previous, ...newCards]);
      });

      setPage(response.page);
      setTotalCount(response.totalCount);
    } catch (loadError: any) {
      setError("Não foi possível carregar as cartas desta expansão.");
      const isTimeout = loadError?.code === "ECONNABORTED" || loadError?.message?.includes("timeout");
      
      Alert.alert(
        isTimeout ? "Tempo esgotado" : "Erro ao buscar cartas",
        isTimeout 
          ? "A conexão está lenta. Tente novamente em instantes." 
          : "Tente novamente em alguns segundos."
      );
      console.error("Erro ao carregar cartas por set:", loadError);
    } finally {
      loadingPageRef.current = null;
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function onRefresh() {
    try {
      setRefreshing(true);
      await loadCards(1, false);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLoadMore() {
    if (isSearching || loadingMore || loading || !hasMore || loadingPageRef.current !== null) {
      return;
    }

    setLoadingMore(true);
    await loadCards(page + 1, true);
  }

  useEffect(() => {
    loadCards(1, false);
  }, [setId]);

  useEffect(() => {
    loadOwnedCards();
  }, [setId]);

  async function handleToggleOwned(card: PokemonTcgCard) {
    if (!isFirebaseConfigured) {
      Alert.alert(
        "Firebase nao configurado",
        "Crie um arquivo .env com as chaves do Firebase.",
      );
      return;
    }

    const currentQuantity = ownedQuantities[card.id] ?? 0;

    try {
      withPending(card.id, true);

      if (currentQuantity > 0) {
        await deleteOwnedCard(card.id);
        setOwnedQuantities((previous) => {
          const next = { ...previous };
          delete next[card.id];
          return next;
        });
      } else {
        await addOwnedCard(card, setId, setName, 1);
        setOwnedQuantities((previous) => ({
          ...previous,
          [card.id]: 1,
        }));
      }
    } catch (toggleError) {
      Alert.alert(
        "Erro no CRUD",
        "Nao foi possivel atualizar o fichario no Firebase.",
      );
      console.error("Erro ao alternar carta no fichario:", toggleError);
    } finally {
      withPending(card.id, false);
    }
  }

  async function handleChangeQuantity(cardId: string, nextQuantity: number) {
    if (!isFirebaseConfigured) {
      Alert.alert(
        "Firebase nao configurado",
        "Crie um arquivo .env com as chaves do Firebase.",
      );
      return;
    }

    try {
      withPending(cardId, true);
      await updateOwnedCardQuantity(cardId, nextQuantity);

      setOwnedQuantities((previous) => {
        if (nextQuantity <= 0) {
          const next = { ...previous };
          delete next[cardId];
          return next;
        }

        return {
          ...previous,
          [cardId]: nextQuantity,
        };
      });
    } catch (updateError) {
      Alert.alert(
        "Erro ao atualizar quantidade",
        "Tente novamente em alguns segundos.",
      );
      console.error("Erro ao atualizar quantidade no Firebase:", updateError);
    } finally {
      withPending(cardId, false);
    }
  }

  const hasMore = ownedOnly
    ? filteredCards.length < totalOwnedCount
    : cards.length < totalCount;
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Carregando cartas...</Text>
      </View>
    );
  }

  if (error && cards.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorTitle}>Falha ao carregar cartas</Text>
        <Text style={styles.errorDescription}>{error}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => loadCards(1, false)}
        >
          <Text style={styles.retryButtonLabel}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            blurFocusedElementOnWeb();
            router.back();
          }}
          hitSlop={10}
          style={styles.backButton}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={colors.text}
          />
        </Pressable>

        <View style={styles.topBarTextBlock}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {setName}
          </Text>
          <Text style={styles.topBarSubtitle}>Cartas da expansão</Text>
        </View>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar carta por nome ou número..."
        placeholderTextColor={colors.muted}
        style={styles.searchInput}
      />

      <FlatList
        data={gridCards}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item }) => {
          if (item.id === "__placeholder__") {
            return <View style={styles.cardPlaceholder} />;
          }

          return (
            <View style={styles.card}>
              <Image
                source={{ uri: item.images.small }}
                style={styles.cardImage}
                contentFit="cover"
              />
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.cardMeta}>#{item.number}</Text>
                <Text style={styles.cardMeta}>
                  {item.rarity ?? "Raridade não informada"}
                </Text>

                <View style={styles.crudArea}>
                  <Pressable
                    onPress={() => handleToggleOwned(item)}
                    disabled={Boolean(pendingCardIds[item.id])}
                    style={[
                      styles.ownedButton,
                      ownedQuantities[item.id]
                        ? styles.ownedButtonActive
                        : undefined,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        ownedQuantities[item.id]
                          ? "checkbox-marked"
                          : "checkbox-blank-outline"
                      }
                      size={16}
                      color={ownedQuantities[item.id] ? "#1E1E24" : colors.text}
                    />
                    <Text
                      style={[
                        styles.ownedButtonText,
                        ownedQuantities[item.id]
                          ? styles.ownedButtonTextActive
                          : undefined,
                      ]}
                    >
                      Eu tenho
                    </Text>
                  </Pressable>

                  {ownedQuantities[item.id] ? (
                    <View style={styles.qtyRow}>
                      <Pressable
                        onPress={() =>
                          handleChangeQuantity(
                            item.id,
                            (ownedQuantities[item.id] ?? 1) - 1,
                          )
                        }
                        disabled={Boolean(pendingCardIds[item.id])}
                        style={styles.qtyButton}
                      >
                        <MaterialCommunityIcons
                          name="minus"
                          size={16}
                          color={colors.text}
                        />
                      </Pressable>

                      <Text style={styles.qtyText}>
                        x{ownedQuantities[item.id]}
                      </Text>

                      <Pressable
                        onPress={() =>
                          handleChangeQuantity(
                            item.id,
                            (ownedQuantities[item.id] ?? 1) + 1,
                          )
                        }
                        disabled={Boolean(pendingCardIds[item.id])}
                        style={styles.qtyButton}
                      >
                        <MaterialCommunityIcons
                          name="plus"
                          size={16}
                          color={colors.text}
                        />
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : !hasMore && filteredCards.length > 0 ? (
            <View style={styles.footerEnd}>
              <Text style={styles.footerEndText}>
                {ownedOnly
                  ? "Todas as suas cartas desta coleção foram carregadas."
                  : "Fim da lista de cartas."}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Nenhuma carta encontrada</Text>
            <Text style={styles.emptyDescription}>
              Tente outro termo de busca nesta expansão.
            </Text>
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
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 15,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  errorDescription: {
    color: colors.muted,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonLabel: {
    color: "#1E1E24",
    fontWeight: "700",
    fontSize: 14,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  topBarTextBlock: {
    flex: 1,
    gap: 2,
  },
  topBarTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  topBarSubtitle: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 18,
  },
  columns: {
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
  },
  cardPlaceholder: {
    flex: 1,
    marginBottom: 10,
    opacity: 0,
  },
  cardImage: {
    width: "100%",
    aspectRatio: 0.72,
  },
  cardInfo: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  cardName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    minHeight: 32,
  },
  cardMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  crudArea: {
    marginTop: 8,
    gap: 8,
  },
  ownedButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1E1E24",
  },
  ownedButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  ownedButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  ownedButtonTextActive: {
    color: "#1E1E24",
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E1E24",
  },
  qtyText: {
    minWidth: 36,
    textAlign: "center",
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  footerLoading: {
    paddingVertical: 14,
  },
  emptyBox: {
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyDescription: {
    color: colors.muted,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  footerEnd: {
    paddingVertical: 32,
    alignItems: "center",
  },
  footerEndText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
});
