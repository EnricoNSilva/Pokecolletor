import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  addCardToDeck,
  createDeck,
  DeckCard,
  DeckValidation,
  getDeckById,
  removeCardFromDeck,
  updateCardQuantityInDeck,
  updateDeck,
  validateDeck,
} from "@/services/deck-crud";
import { getCardsBySet } from "@/services/pokemon-tcg-api";
import { isFirebaseConfigured } from "@/services/firebase";
import { getOwnedCardsBySet, OwnedCard } from "@/services/binder-crud";
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

export default function DeckBuilderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ deckId?: string }>();
  const { showFeedback } = useFeedbackToast();

  const isEditing = !!params.deckId;

  const [deckName, setDeckName] = useState("");
  const [deckDescription, setDeckDescription] = useState("");
  const [isSimulated, setIsSimulated] = useState(false);
  const [deckCards, setDeckCards] = useState<DeckCard[]>([]);
  const [validation, setValidation] = useState<DeckValidation | null>(null);

  const [searchExpansion, setSearchExpansion] = useState("");
  const [availableCards, setAvailableCards] = useState<any[]>([]);
  const [ownedCards, setOwnedCards] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Carrega deck sempre que a tela volta ao foco
  useFocusEffect(
    useCallback(() => {
      async function loadDeck() {
        if (!isEditing) {
          return;
        }

        try {
          const deck = await getDeckById(params.deckId!);
          if (!deck) {
            showFeedback("Deck não encontrado.", "error");
            router.back();
            return;
          }

          setDeckName(deck.name);
          setDeckDescription(deck.description);
          setIsSimulated(deck.isSimulated);
          setDeckCards(deck.cards);
          setValidation(validateDeck(deck.cards));
        } catch (error) {
          console.error("Erro ao carregar deck:", error);
          showFeedback("Erro ao carregar deck.", "error");
          router.back();
        }
      }

      void loadDeck();
    }, [isEditing, params.deckId, router, showFeedback]),
  );

  // Carrega cartas de uma expansão
  async function handleSearchExpansion() {
    if (!searchExpansion.trim()) {
      showFeedback("Digite o ID ou nome da expansão.", "error");
      return;
    }

    try {
      setLoading(true);

      // Busca cartas da expansão
      const response = await getCardsBySet(searchExpansion, 1, 100);
      setAvailableCards(response.data);

      // Se não é simulado, carrega as cartas que o usuário tem
      if (!isSimulated) {
        const ownedCardsData = await getOwnedCardsBySet(searchExpansion);
        const ownedMap = ownedCardsData.reduce<Record<string, number>>(
          (acc, card) => {
            acc[card.cardId] = card.quantity;
            return acc;
          },
          {},
        );
        setOwnedCards(ownedMap);
      }

      showFeedback(`${response.data.length} cartas encontradas!`, "success");
    } catch (error) {
      console.error("Erro ao buscar cartas:", error);
      showFeedback("Erro ao buscar cartas da expansão.", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleAddCard(card: any) {
    if (!isSimulated) {
      const owned = ownedCards[card.id] || 0;
      const alreadyInDeck =
        deckCards.find((c) => c.cardId === card.id)?.quantity || 0;

      if (alreadyInDeck >= owned) {
        showFeedback(`Você só tem ${owned} cópia(s) desta carta.`, "error");
        return;
      }
    }

    setDeckCards((prev) => {
      const updated = addCardToDeck(prev, card, 1);
      setValidation(validateDeck(updated));
      return updated;
    });
  }

  function handleRemoveCard(cardId: string) {
    setDeckCards((prev) => {
      const updated = removeCardFromDeck(prev, cardId);
      setValidation(validateDeck(updated));
      return updated;
    });
  }

  function handleChangeQuantity(cardId: string, quantity: number) {
    if (!isSimulated && quantity > 0) {
      const card = deckCards.find((c) => c.cardId === cardId);
      if (card) {
        const owned = ownedCards[cardId] || 0;
        if (quantity > owned) {
          showFeedback(`Você só tem ${owned} cópia(s) desta carta.`, "error");
          return;
        }
      }
    }

    setDeckCards((prev) => {
      const updated = updateCardQuantityInDeck(prev, cardId, quantity);
      setValidation(validateDeck(updated));
      return updated;
    });
  }

  async function handleSaveDeck() {
    if (!deckName.trim()) {
      showFeedback("Digite um nome para o deck.", "error");
      return;
    }

    if (deckCards.length === 0) {
      showFeedback("Adicione pelo menos uma carta ao deck.", "error");
      return;
    }

    if (!validation?.isValid) {
      Alert.alert(
        "Deck inválido",
        validation?.errors.join("\n") || "Verifique as regras do Pokémon TCG.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Salvar mesmo assim", onPress: () => performSave() },
        ],
      );
      return;
    }

    performSave();
  }

  async function performSave() {
    try {
      if (isEditing) {
        await updateDeck(
          params.deckId!,
          deckName,
          deckDescription,
          deckCards,
          isSimulated,
        );
        showFeedback("Deck atualizado com sucesso!", "success");
      } else {
        await createDeck(deckName, deckDescription, deckCards, isSimulated);
        showFeedback("Deck criado com sucesso!", "success");
      }

      router.replace("/(drawer)/decks");
    } catch (error) {
      console.error("Erro ao salvar deck:", error);
      showFeedback("Erro ao salvar deck.", "error");
    }
  }

  const totalCards = deckCards.reduce((sum, c) => sum + c.quantity, 0);
  const totalUnique = deckCards.length;

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
          <Pressable onPress={() => router.back()}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={colors.text}
            />
          </Pressable>
          <Text style={styles.headerTitle}>
            {isEditing ? "Editar Deck" : "Novo Deck"}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Tipo de Deck */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Deck</Text>
          <View style={styles.toggleGroup}>
            <Pressable
              style={[
                styles.toggleButton,
                !isSimulated && styles.toggleButtonActive,
              ]}
              onPress={() => setIsSimulated(false)}
            >
              <MaterialCommunityIcons
                name="briefcase"
                size={20}
                color={!isSimulated ? colors.background : colors.muted}
              />
              <Text
                style={[
                  styles.toggleButtonText,
                  !isSimulated && styles.toggleButtonTextActive,
                ]}
              >
                Real
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.toggleButton,
                isSimulated && styles.toggleButtonActive,
              ]}
              onPress={() => setIsSimulated(true)}
            >
              <MaterialCommunityIcons
                name="lightbulb"
                size={20}
                color={isSimulated ? colors.background : colors.muted}
              />
              <Text
                style={[
                  styles.toggleButtonText,
                  isSimulated && styles.toggleButtonTextActive,
                ]}
              >
                Simulado
              </Text>
            </Pressable>
          </View>

          {isSimulated && (
            <View style={styles.infoBox}>
              <MaterialCommunityIcons
                name="information"
                size={16}
                color={colors.accent}
              />
              <Text style={styles.infoText}>
                Você pode usar qualquer carta neste deck.
              </Text>
            </View>
          )}

          {!isSimulated && (
            <View style={styles.infoBox}>
              <MaterialCommunityIcons
                name="information"
                size={16}
                color={colors.success}
              />
              <Text style={styles.infoText}>
                Apenas cartas que você possui podem ser usadas.
              </Text>
            </View>
          )}
        </View>

        {/* Informações do Deck */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações</Text>

          <TextInput
            style={styles.input}
            placeholder="Nome do deck"
            placeholderTextColor={colors.muted}
            value={deckName}
            onChangeText={setDeckName}
          />

          <TextInput
            style={[styles.input, styles.inputLarge]}
            placeholder="Descrição (opcional)"
            placeholderTextColor={colors.muted}
            value={deckDescription}
            onChangeText={setDeckDescription}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Buscar Cartas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adicionar Cartas</Text>

          <View style={styles.searchGroup}>
            <TextInput
              style={styles.searchInput}
              placeholder="ID da expansão (ex: sv04.5)"
              placeholderTextColor={colors.muted}
              value={searchExpansion}
              onChangeText={setSearchExpansion}
            />
            <Pressable
              style={styles.searchButton}
              onPress={handleSearchExpansion}
              disabled={loading}
            >
              {loading ? (
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

          {availableCards.length > 0 && (
            <FlatList
              data={availableCards}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const alreadyAdded =
                  deckCards.find((c) => c.cardId === item.id)?.quantity || 0;
                const owned = ownedCards[item.id] || 0;
                const canAdd =
                  isSimulated || (alreadyAdded < owned && owned > 0);

                return (
                  <Pressable
                    style={styles.availableCard}
                    onPress={() =>
                      setExpandedCardId(
                        expandedCardId === item.id ? null : item.id,
                      )
                    }
                  >
                    <Image
                      source={{ uri: item.images.small }}
                      style={styles.cardImage}
                      contentFit="contain"
                    />

                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {item.supertype}
                        {item.subtypes && ` • ${item.subtypes.join(", ")}`}
                      </Text>

                      {!isSimulated && (
                        <Text
                          style={[
                            styles.cardOwned,
                            owned === 0 && styles.cardOwnedZero,
                          ]}
                        >
                          Você tem: {owned}
                        </Text>
                      )}
                    </View>

                    {canAdd && (
                      <Pressable
                        style={styles.addButton}
                        onPress={() => handleAddCard(item)}
                      >
                        <MaterialCommunityIcons
                          name="plus"
                          size={20}
                          color={colors.background}
                        />
                      </Pressable>
                    )}

                    {!canAdd && !isSimulated && (
                      <View style={styles.addButtonDisabled}>
                        <MaterialCommunityIcons
                          name="lock"
                          size={20}
                          color={colors.muted}
                        />
                      </View>
                    )}

                    {alreadyAdded > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{alreadyAdded}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          )}
        </View>

        {/* Cartas no Deck */}
        {deckCards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Cartas no Deck ({totalCards}/60)
            </Text>

            <FlatList
              data={deckCards}
              keyExtractor={(item) => item.cardId}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const owned = ownedCards[item.cardId] || 0;
                return (
                  <View style={styles.deckCardRow}>
                    <View style={styles.deckCardInfo}>
                      <Text style={styles.deckCardName} numberOfLines={1}>
                        {item.cardName}
                      </Text>
                      {!isSimulated && owned > 0 && (
                        <Text style={styles.deckCardOwned}>
                          Tem: {owned} • Deck: {item.quantity}
                        </Text>
                      )}
                    </View>

                    <View style={styles.quantityControls}>
                      <Pressable
                        style={styles.quantityButton}
                        onPress={() =>
                          handleChangeQuantity(
                            item.cardId,
                            Math.max(0, item.quantity - 1),
                          )
                        }
                      >
                        <MaterialCommunityIcons
                          name="minus"
                          size={16}
                          color={colors.text}
                        />
                      </Pressable>

                      <Text style={styles.quantityText}>{item.quantity}</Text>

                      <Pressable
                        style={styles.quantityButton}
                        onPress={() =>
                          handleChangeQuantity(item.cardId, item.quantity + 1)
                        }
                      >
                        <MaterialCommunityIcons
                          name="plus"
                          size={16}
                          color={colors.text}
                        />
                      </Pressable>

                      <Pressable
                        style={styles.deleteButton}
                        onPress={() => handleRemoveCard(item.cardId)}
                      >
                        <MaterialCommunityIcons
                          name="trash-can"
                          size={16}
                          color={colors.danger}
                        />
                      </Pressable>
                    </View>
                  </View>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          </View>
        )}

        {/* Validação */}
        {validation && (
          <View
            style={[
              styles.validationBox,
              validation.isValid
                ? styles.validationBoxSuccess
                : styles.validationBoxError,
            ]}
          >
            <View style={styles.validationHeader}>
              <MaterialCommunityIcons
                name={validation.isValid ? "check-circle" : "alert-circle"}
                size={20}
                color={validation.isValid ? colors.success : colors.danger}
              />
              <Text
                style={[
                  styles.validationTitle,
                  validation.isValid
                    ? styles.validationTitleSuccess
                    : styles.validationTitleError,
                ]}
              >
                {validation.isValid ? "Deck válido!" : "Deck inválido"}
              </Text>
            </View>

            <Text style={styles.validationStat}>
              Total: {totalCards}/60 cartas
            </Text>
            <Text style={styles.validationStat}>
              Pokémon Básico: {validation.hasBasicPokemon ? "✓" : "✗"}
            </Text>

            {validation.errors.length > 0 && (
              <View style={styles.errorsList}>
                {validation.errors.map((error, idx) => (
                  <Text key={idx} style={styles.errorItem}>
                    • {error}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Botão Salvar */}
        <Pressable
          style={[
            styles.saveButton,
            (!deckName.trim() || deckCards.length === 0) &&
              styles.saveButtonDisabled,
          ]}
          onPress={handleSaveDeck}
          disabled={!deckName.trim() || deckCards.length === 0}
        >
          <MaterialCommunityIcons
            name="check"
            size={20}
            color={colors.background}
          />
          <Text style={styles.saveButtonText}>
            {isEditing ? "Atualizar Deck" : "Criar Deck"}
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
  section: {
    marginTop: 24,
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  toggleGroup: {
    flexDirection: "row",
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
  },
  toggleButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  toggleButtonText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  toggleButtonTextActive: {
    color: colors.background,
  },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  infoText: {
    color: colors.accent,
    fontSize: 12,
    flex: 1,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  inputLarge: {
    minHeight: 60,
    paddingTop: 10,
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
  availableCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    overflow: "hidden",
    position: "relative",
  },
  cardImage: {
    width: 50,
    height: 70,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  cardInfo: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  cardName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  cardMeta: {
    color: colors.muted,
    fontSize: 11,
  },
  cardOwned: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "600",
  },
  cardOwnedZero: {
    color: colors.danger,
  },
  addButton: {
    backgroundColor: colors.accent,
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    margin: 8,
  },
  addButtonDisabled: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    margin: 8,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: colors.danger,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "700",
  },
  deckCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  deckCardInfo: {
    flex: 1,
    gap: 4,
  },
  deckCardName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  deckCardOwned: {
    color: colors.muted,
    fontSize: 11,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginHorizontal: 6,
    minWidth: 20,
    textAlign: "center",
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  validationBox: {
    backgroundColor: "rgba(46, 213, 115, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  validationBoxSuccess: {
    borderColor: colors.success,
  },
  validationBoxError: {
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderColor: colors.danger,
  },
  validationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  validationTitle: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "700",
  },
  validationTitleSuccess: {
    color: colors.success,
  },
  validationTitleError: {
    color: colors.danger,
  },
  validationStat: {
    color: colors.muted,
    fontSize: 12,
  },
  errorsList: {
    gap: 4,
  },
  errorItem: {
    color: colors.danger,
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "800",
  },
});
