import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { PokemonTcgCard } from "@/services/pokemon-tcg-api";
import { auth, db } from "@/services/firebase";

export type OwnedCard = {
  cardId: string;
  setId: string;
  setName: string;
  cardName: string;
  imageSmall: string;
  quantity: number;
  updatedAt: string;
  createdAt: string;
};

const USERS_COLLECTION = "users";
const BINDER_COLLECTION = "binderCards";

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

function getBinderCollectionRef() {
  const firestore = ensureDb();
  const userId = ensureUserId();

  return collection(firestore, USERS_COLLECTION, userId, BINDER_COLLECTION);
}

export async function getOwnedCardsBySet(setId: string): Promise<OwnedCard[]> {
  const binderRef = getBinderCollectionRef();
  const binderQuery = query(binderRef, where("setId", "==", setId));
  const snapshot = await getDocs(binderQuery);

  return snapshot.docs.map((item) => item.data() as OwnedCard);
}

export async function addOwnedCard(
  card: PokemonTcgCard,
  setId: string,
  setName: string,
  quantity = 1,
): Promise<void> {
  const firestore = ensureDb();
  const userId = ensureUserId();
  const now = new Date().toISOString();

  await setDoc(
    doc(firestore, USERS_COLLECTION, userId, BINDER_COLLECTION, card.id),
    {
      cardId: card.id,
      setId,
      setName,
      cardName: card.name,
      imageSmall: card.images.small,
      quantity,
      updatedAt: now,
      createdAt: now,
    } satisfies OwnedCard,
  );
}

export async function updateOwnedCardQuantity(
  cardId: string,
  quantity: number,
): Promise<void> {
  const firestore = ensureDb();
  const userId = ensureUserId();

  if (quantity <= 0) {
    await deleteOwnedCard(cardId);
    return;
  }

  await updateDoc(
    doc(firestore, USERS_COLLECTION, userId, BINDER_COLLECTION, cardId),
    {
      quantity,
      updatedAt: new Date().toISOString(),
    },
  );
}

export async function deleteOwnedCard(cardId: string): Promise<void> {
  const firestore = ensureDb();
  const userId = ensureUserId();
  await deleteDoc(
    doc(firestore, USERS_COLLECTION, userId, BINDER_COLLECTION, cardId),
  );
}

export type OwnedSet = {
  setId: string;
  setName: string;
  totalCards: number;
  uniqueCards: number;
};

export async function getOwnedSetsWithCounts(options?: {
  signal?: AbortSignal;
}): Promise<OwnedSet[]> {
  const binderRef = getBinderCollectionRef();
  const snapshot = await getDocs(binderRef);

  const setsMap = new Map<string, OwnedSet>();

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as OwnedCard;

    if (setsMap.has(data.setId)) {
      const existing = setsMap.get(data.setId)!;
      setsMap.set(data.setId, {
        ...existing,
        totalCards: existing.totalCards + data.quantity,
        uniqueCards: existing.uniqueCards + 1,
      });
    } else {
      setsMap.set(data.setId, {
        setId: data.setId,
        setName: data.setName,
        totalCards: data.quantity,
        uniqueCards: 1,
      });
    }
  });

  return Array.from(setsMap.values()).sort(
    (a, b) => new Date(b.setId).getTime() - new Date(a.setId).getTime(),
  );
}
