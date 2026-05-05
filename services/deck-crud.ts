import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "@/services/firebase";
import { PokemonTcgCard } from "@/services/pokemon-tcg-api";

export type DeckCard = {
  cardId: string;
  cardName: string;
  quantity: number;
  supertype?: string; // "Pokémon", "Trainer", "Energy"
  subtypes?: string[]; // ["Basic"], ["Stage 1"], etc
  imageSmall: string;
};

export type Deck = {
  id: string;
  name: string;
  description: string;
  cards: DeckCard[];
  isSimulated: boolean; // true = pode usar cartas que não tem; false = só cartas que tem
  isValid: boolean; // Calcula baseado nas regras
  createdAt: string;
  updatedAt: string;
};

export type DeckValidation = {
  isValid: boolean;
  totalCards: number;
  hasBasicPokemon: boolean;
  duplicateViolations: Array<{ name: string; count: number }>;
  errors: string[];
};

const USERS_COLLECTION = "users";
const DECKS_COLLECTION = "decks";

function ensureDb() {
  if (!db) {
    throw new Error("Firebase nao configurado. Preencha o arquivo .env.");
  }
  return db;
}

function ensureUserId() {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error("Usuario nao autenticado. Faça login novamente.");
  }
  return currentUser.uid;
}

function getDecksCollectionRef() {
  const firestore = ensureDb();
  const userId = ensureUserId();
  return collection(firestore, USERS_COLLECTION, userId, DECKS_COLLECTION);
}

/**
 * Valida se um deck segue as regras do Pokémon TCG:
 * - Exatamente 60 cartas
 * - Pelo menos 1 Pokémon Básico
 * - Máximo 4 cópias do mesmo nome (exceto Energias Básicas)
 */
export function validateDeck(cards: DeckCard[]): DeckValidation {
  const errors: string[] = [];
  const duplicateViolations: Array<{ name: string; count: number }> = [];

  // Contar total de cartas
  const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);

  if (totalCards !== 60) {
    errors.push(`Deck tem ${totalCards} cartas, deve ter exatamente 60.`);
  }

  // Verificar Pokémon Básico
  const hasBasicPokemon = cards.some(
    (card) =>
      card.supertype === "Pokémon" &&
      card.subtypes &&
      card.subtypes.includes("Basic"),
  );

  if (!hasBasicPokemon) {
    errors.push("Deck precisa de pelo menos 1 Pokémon Básico.");
  }

  // Verificar máximo 4 cópias (exceto Energias Básicas)
  const cardCounts = new Map<string, number>();

  cards.forEach((card) => {
    const count = cardCounts.get(card.cardName) || 0;
    cardCounts.set(card.cardName, count + card.quantity);
  });

  cardCounts.forEach((count, cardName) => {
    const deckCard = cards.find((card) => card.cardName === cardName);
    const isBasicEnergy =
      deckCard?.supertype === "Energy" && deckCard.subtypes?.includes("Basic");

    if (count > 4 && !isBasicEnergy) {
      errors.push(`${cardName}: ${count} cópias (máximo 4)`);
      duplicateViolations.push({ name: cardName, count });
    }
  });

  return {
    isValid: errors.length === 0,
    totalCards,
    hasBasicPokemon,
    duplicateViolations,
    errors,
  };
}

/**
 * Cria um novo deck
 */
export async function createDeck(
  name: string,
  description: string,
  cards: DeckCard[],
  isSimulated: boolean,
): Promise<Deck> {
  const firestore = ensureDb();
  const userId = ensureUserId();
  const now = new Date().toISOString();

  const validation = validateDeck(cards);
  const deckRef = doc(
    collection(firestore, USERS_COLLECTION, userId, DECKS_COLLECTION),
  );

  const deck: Deck = {
    id: deckRef.id,
    name,
    description,
    cards,
    isSimulated,
    isValid: validation.isValid,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(deckRef, {
    name: deck.name,
    description: deck.description,
    cards: deck.cards,
    isSimulated: deck.isSimulated,
    isValid: deck.isValid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return deck;
}

/**
 * Retorna todos os decks do usuário
 */
export async function getDecksByUser(): Promise<Deck[]> {
  const decksRef = getDecksCollectionRef();
  const snapshot = await getDocs(decksRef);

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      name: data.name || "",
      description: data.description || "",
      cards: data.cards || [],
      isSimulated: data.isSimulated ?? false,
      isValid: data.isValid ?? false,
      createdAt:
        data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
      updatedAt:
        data.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
    } as Deck;
  });
}

/**
 * Obtém um deck específico
 */
export async function getDeckById(deckId: string): Promise<Deck | null> {
  const firestore = ensureDb();
  const userId = ensureUserId();
  const deckRef = doc(
    firestore,
    USERS_COLLECTION,
    userId,
    DECKS_COLLECTION,
    deckId,
  );

  const snapshot = await getDoc(deckRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    id: deckId,
    name: data.name || "",
    description: data.description || "",
    cards: data.cards || [],
    isSimulated: data.isSimulated ?? false,
    isValid: data.isValid ?? false,
    createdAt:
      data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
    updatedAt:
      data.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
  } as Deck;
}

/**
 * Atualiza um deck existente
 */
export async function updateDeck(
  deckId: string,
  name: string,
  description: string,
  cards: DeckCard[],
  isSimulated: boolean,
): Promise<void> {
  const firestore = ensureDb();
  const userId = ensureUserId();

  const validation = validateDeck(cards);

  const deckRef = doc(
    firestore,
    USERS_COLLECTION,
    userId,
    DECKS_COLLECTION,
    deckId,
  );

  await updateDoc(deckRef, {
    name,
    description,
    cards,
    isSimulated,
    isValid: validation.isValid,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deleta um deck
 */
export async function deleteDeck(deckId: string): Promise<void> {
  const firestore = ensureDb();
  const userId = ensureUserId();

  const deckRef = doc(
    firestore,
    USERS_COLLECTION,
    userId,
    DECKS_COLLECTION,
    deckId,
  );

  await deleteDoc(deckRef);
}

/**
 * Adiciona uma carta ao deck
 */
export function addCardToDeck(
  cards: DeckCard[],
  card: PokemonTcgCard,
  quantity: number,
): DeckCard[] {
  const existing = cards.find((c) => c.cardId === card.id);

  if (existing) {
    return cards.map((c) =>
      c.cardId === card.id ? { ...c, quantity: c.quantity + quantity } : c,
    );
  }

  return [
    ...cards,
    {
      cardId: card.id,
      cardName: card.name,
      quantity,
      supertype: card.supertype,
      subtypes: card.subtypes,
      imageSmall: card.images.small,
    },
  ];
}

/**
 * Remove uma carta do deck
 */
export function removeCardFromDeck(
  cards: DeckCard[],
  cardId: string,
): DeckCard[] {
  return cards.filter((c) => c.cardId !== cardId);
}

/**
 * Atualiza quantidade de uma carta no deck
 */
export function updateCardQuantityInDeck(
  cards: DeckCard[],
  cardId: string,
  quantity: number,
): DeckCard[] {
  if (quantity <= 0) {
    return removeCardFromDeck(cards, cardId);
  }

  return cards.map((c) => (c.cardId === cardId ? { ...c, quantity } : c));
}
