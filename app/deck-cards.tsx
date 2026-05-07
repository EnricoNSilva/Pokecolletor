import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  addCardToDeck,
  Deck,
  DeckCard,
  DeckValidation,
  getDeckById,
  removeCardFromDeck,
  updateCardQuantityInDeck,
  updateDeck,
  validateDeck,
} from "@/services/deck-crud";
import { getCardsByName, PokemonTcgCard } from "@/services/pokemon-tcg-api";
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

type DisplayCard = {
  id: string;
  name: string;
  imageSmall: string;
  subtitle: string;
  quantity: number;
  supertype?: string;
  subtypes?: string[];
};

function isBasicEnergy(
  card: Pick<PokemonTcgCard, "supertype" | "subtypes"> | DeckCard,
) {
  return card.supertype === "Energy" && card.subtypes?.includes("Basic");
}

function getSameNameQuantity(
  cards: DeckCard[],
  cardName: string,
  excludeCardId?: string,
) {
  return cards.reduce((total, card) => {
    if (card.cardName !== cardName) {
      return total;
    }

    if (excludeCardId && card.cardId === excludeCardId) {
      return total;
    }

    return total + card.quantity;
  }, 0);
}

export default function DeckCardsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ deckId?: string }>();
  const { showFeedback } = useFeedbackToast();
  const searchInputRef = useRef<TextInput | null>(null);

  const deckId = typeof params.deckId === "string" ? params.deckId : "";

  const [deck, setDeck] = useState<Deck | null>(null);
  const [validation, setValidation] = useState<DeckValidation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PokemonTcgCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const trimmedQuery = searchQuery.trim();
  const searchMode = trimmedQuery.length > 0;

  function handleGoBack() {
    Keyboard.dismiss();
    searchInputRef.current?.blur();

    try {
      router.back();
    } catch {
      router.replace("/(drawer)/decks");
    }
  }

  const loadDeck = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        const deckData = await getDeckById(deckId);

        if (!deckData) {
          showFeedback("Deck não encontrado.", "error");
          handleGoBack();
          return;
        }

        setDeck(deckData);
        setValidation(validateDeck(deckData.cards));
      } catch (error) {
        console.error("Erro ao carregar deck:", error);
        showFeedback("Erro ao carregar deck.", "error");
        handleGoBack();
      } finally {
        setLoading(false);
        setHasLoadedOnce(true);
      }
    },
    [deckId, showFeedback],
  );

  useFocusEffect(
    useCallback(() => {
      if (!deckId) {
        return;
      }

      void loadDeck(!hasLoadedOnce);
    }, [deckId, hasLoadedOnce, loadDeck]),
  );

  async function handleSearch(queryText = trimmedQuery) {
    if (!queryText) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await getCardsByName(queryText, 1, 100);
      setSearchResults(response.data);
    } catch (error) {
      console.error("Erro ao buscar cartas:", error);
      showFeedback("Erro ao buscar cartas. Tente novamente.", "error");
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    if (!trimmedQuery) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      void handleSearch(trimmedQuery);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [trimmedQuery]);

  function updateLocalDeck(nextCards: DeckCard[]) {
    if (!deck) {
      return;
    }

    const nextDeck = { ...deck, cards: nextCards };
    setDeck(nextDeck);
    setValidation(validateDeck(nextCards));
  }

  function handleAddCard(card: PokemonTcgCard) {
    if (!deck) {
      return;
    }

    const totalCards = deck.cards.reduce(
      (sum, current) => sum + current.quantity,
      0,
    );
    if (totalCards >= 60) {
      showFeedback(
        "Seu deck já tem 60 cartas. Remova algumas antes de adicionar mais.",
        "error",
      );
      return;
    }

    const sameNameQuantity = getSameNameQuantity(deck.cards, card.name);
    if (!isBasicEnergy(card) && sameNameQuantity >= 4) {
      showFeedback(
        `Você já atingiu o limite de 4 cópias para ${card.name}.`,
        "error",
      );
      return;
    }

    updateLocalDeck(addCardToDeck(deck.cards, card, 1));
  }

  function handleRemoveCard(cardId: string) {
    if (!deck) {
      return;
    }

    updateLocalDeck(removeCardFromDeck(deck.cards, cardId));
  }

  function handleChangeQuantity(cardId: string, quantity: number) {
    if (!deck) {
      return;
    }

    const currentCard = deck.cards.find((card) => card.cardId === cardId);
    if (!currentCard) {
      return;
    }

    const totalCards = deck.cards.reduce(
      (sum, current) => sum + current.quantity,
      0,
    );
    const currentQuantity = currentCard.quantity;
    const difference = quantity - currentQuantity;

    if (difference > 0 && totalCards + difference > 60) {
      showFeedback("Seu deck não pode ter mais de 60 cartas.", "error");
      return;
    }

    const otherSameNameQuantity = getSameNameQuantity(
      deck.cards,
      currentCard.cardName,
      currentCard.cardId,
    );

    if (!isBasicEnergy(currentCard) && otherSameNameQuantity + quantity > 4) {
      showFeedback(`Máximo de 4 cópias para ${currentCard.cardName}.`, "error");
      return;
    }

    updateLocalDeck(updateCardQuantityInDeck(deck.cards, cardId, quantity));
  }

  async function handleSaveDeck() {
    if (!deck) {
      return;
    }

    try {
      Keyboard.dismiss();
      searchInputRef.current?.blur();

      await updateDeck(
        deckId,
        deck.name,
        deck.description,
        deck.cards,
        deck.isSimulated,
      );
      showFeedback("Deck salvo com sucesso!", "success");
      router.replace("/(drawer)/decks");
    } catch (error) {
      console.error("Erro ao salvar deck:", error);
      showFeedback("Erro ao salvar deck.", "error");
    }
  }

  async function onRefresh() {
    try {
      setRefreshing(true);

      if (searchMode) {
        await handleSearch(trimmedQuery);
        return;
      }

      await loadDeck(false);
    } finally {
      setRefreshing(false);
    }
  }

  const totalCards =
    deck?.cards.reduce((sum, current) => sum + current.quantity, 0) || 0;
  const canAddMoreCards = totalCards < 60;

  const displayCards: DisplayCard[] = searchMode
    ? searchResults.map((card) => ({
        id: card.id,
        name: card.name,
        imageSmall: card.images.small,
        subtitle: card.set.name,
        quantity:
          deck?.cards.find((item) => item.cardId === card.id)?.quantity ?? 0,
        supertype: card.supertype,
        subtypes: card.subtypes,
      }))
    : (deck?.cards ?? []).map((card) => ({
        id: card.cardId,
        name: card.cardName,
        imageSmall: card.imageSmall,
        subtitle: card.supertype || "",
        quantity: card.quantity,
        supertype: card.supertype,
        subtypes: card.subtypes,
      }));

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Carregando deck...</Text>
      </View>
    );
  }

  if (!deck) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Deck não encontrado</Text>
      </View>
    );
  }

  function renderCardTile(card: DisplayCard) {
    if (!deck) {
      return null;
    }

    const deckCard = deck.cards.find((item) => item.cardId === card.id);
    const isOnDeck = !!deckCard;

    const sameNameQuantity = getSameNameQuantity(
      deck.cards,
      card.name,
      deckCard?.cardId,
    );
    const canAddThisCard =
      canAddMoreCards && (isBasicEnergy(card) || sameNameQuantity < 4);
    const canIncreaseThisCard =
      canAddMoreCards &&
      (isBasicEnergy(card) || sameNameQuantity + card.quantity < 4);

    return (
      <View style={styles.cardTile}>
        <Image
          source={{ uri: card.imageSmall }}
          style={styles.cardImage}
          contentFit="contain"
        />

        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={2}>
            {card.name}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {card.subtitle}
          </Text>
          <Text style={styles.cardQuantityMeta}>
            {isOnDeck ? `No deck: ${card.quantity}` : "Fora do deck"}
          </Text>
        </View>

        {searchMode ? (
          isOnDeck ? (
            <View style={styles.quantityControls}>
              <Pressable
                style={styles.quantityButton}
                onPress={() =>
                  handleChangeQuantity(card.id, Math.max(0, card.quantity - 1))
                }
              >
                <MaterialCommunityIcons
                  name="minus"
                  size={14}
                  color={colors.text}
                />
              </Pressable>

              <Text style={styles.quantityText}>{card.quantity}</Text>

              <Pressable
                style={[
                  styles.quantityButton,
                  !canIncreaseThisCard && styles.quantityButtonDisabled,
                ]}
                onPress={() =>
                  canIncreaseThisCard &&
                  handleChangeQuantity(card.id, card.quantity + 1)
                }
                disabled={!canIncreaseThisCard}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={14}
                  color={canIncreaseThisCard ? colors.text : colors.muted}
                />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[
                styles.addButton,
                !canAddThisCard && styles.addButtonDisabled,
              ]}
              onPress={() =>
                handleAddCard({
                  id: card.id,
                  name: card.name,
                  number: "",
                  rarity: undefined,
                  supertype: card.supertype,
                  subtypes: card.subtypes,
                  images: { small: card.imageSmall, large: card.imageSmall },
                  set: { id: "", name: card.subtitle, series: "" },
                })
              }
              disabled={!canAddThisCard}
            >
              <MaterialCommunityIcons
                name="plus"
                size={20}
                color={canAddThisCard ? colors.background : colors.muted}
              />
            </Pressable>
          )
        ) : (
          <View style={styles.quantityControls}>
            <Pressable
              style={styles.quantityButton}
              onPress={() =>
                handleChangeQuantity(card.id, Math.max(0, card.quantity - 1))
              }
            >
              <MaterialCommunityIcons
                name="minus"
                size={14}
                color={colors.text}
              />
            </Pressable>

            <Text style={styles.quantityText}>{card.quantity}</Text>

            <Pressable
              style={[
                styles.quantityButton,
                !canIncreaseThisCard && styles.quantityButtonDisabled,
              ]}
              onPress={() =>
                canIncreaseThisCard &&
                handleChangeQuantity(card.id, card.quantity + 1)
              }
              disabled={!canIncreaseThisCard}
            >
              <MaterialCommunityIcons
                name="plus"
                size={14}
                color={canIncreaseThisCard ? colors.text : colors.muted}
              />
            </Pressable>

            <Pressable
              style={styles.deleteButton}
              onPress={() => handleRemoveCard(card.id)}
            >
              <MaterialCommunityIcons
                name="trash-can"
                size={14}
                color={colors.danger}
              />
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleGoBack}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={colors.text}
          />
        </Pressable>

        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>{deck.name}</Text>
          <Text style={styles.headerSubtitle}>{totalCards}/60 cartas</Text>
        </View>

        <Pressable onPress={handleSaveDeck}>
          <MaterialCommunityIcons
            name="check"
            size={24}
            color={colors.success}
          />
        </Pressable>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchGroup}>
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Buscar por nome de Pokémon"
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => void handleSearch()}
          />
          <Pressable
            style={styles.searchButton}
            onPress={() => void handleSearch()}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator size={20} color={colors.background} />
            ) : (
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color={colors.background}
              />
            )}
          </Pressable>
        </View>
      </View>

      {validation && (
        <View
          style={[
            styles.validationBar,
            validation.isValid
              ? styles.validationBarSuccess
              : styles.validationBarError,
          ]}
        >
          <MaterialCommunityIcons
            name={validation.isValid ? "check-circle" : "alert-circle"}
            size={16}
            color={validation.isValid ? colors.success : colors.danger}
          />
          <Text
            style={[
              styles.validationText,
              validation.isValid
                ? styles.validationTextSuccess
                : styles.validationTextError,
            ]}
          >
            {validation.isValid
              ? "Deck válido"
              : validation.errors[0] || "Deck inválido"}
          </Text>
        </View>
      )}

      <FlatList
        data={displayCards}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons
              name={searchMode ? "magnify" : "cards"}
              size={56}
              color={colors.muted}
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.emptyTitle}>
              {searchMode ? "Nenhuma carta encontrada" : "Deck vazio"}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchMode
                ? "Tente outro nome de Pokémon."
                : "Pesquise por um Pokémon para adicionar as cartas."}
            </Text>
          </View>
        }
        renderItem={({ item }) => renderCardTile(item)}
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
  errorText: {
    color: colors.danger,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  searchGroup: {
    flexDirection: "row",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  searchButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  validationBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "rgba(46, 213, 115, 0.1)",
  },
  validationBarError: {
    backgroundColor: "rgba(255, 107, 107, 0.1)",
  },
  validationBarSuccess: {
    backgroundColor: "rgba(46, 213, 115, 0.1)",
  },
  validationText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  validationTextSuccess: {
    color: colors.success,
  },
  validationTextError: {
    color: colors.danger,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  cardTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: 160,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  cardInfo: {
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 2,
  },
  cardName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  cardMeta: {
    color: colors.muted,
    fontSize: 10,
  },
  cardQuantityMeta: {
    color: colors.muted,
    fontSize: 10,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginTop: 4,
  },
  quantityButton: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonDisabled: {
    opacity: 0.4,
  },
  quantityText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    marginHorizontal: 4,
    minWidth: 16,
    textAlign: "center",
  },
  addButton: {
    backgroundColor: colors.accent,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
    marginBottom: 8,
    marginTop: 8,
  },
  addButtonDisabled: {
    backgroundColor: colors.muted,
    opacity: 0.4,
  },
  deleteButton: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: "center",
  },
  emptyDescription: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
