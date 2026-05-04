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
import { db } from "@/services/firebase";

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

const BINDER_COLLECTION = "binderCards";

function ensureDb() {
  if (!db) {
    throw new Error("Firebase nao configurado. Preencha o arquivo .env.");
  }

  return db;
}

export async function getOwnedCardsBySet(setId: string): Promise<OwnedCard[]> {
  const firestore = ensureDb();
  const binderRef = collection(firestore, BINDER_COLLECTION);
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
  const now = new Date().toISOString();

  await setDoc(doc(firestore, BINDER_COLLECTION, card.id), {
    cardId: card.id,
    setId,
    setName,
    cardName: card.name,
    imageSmall: card.images.small,
    quantity,
    updatedAt: now,
    createdAt: now,
  } satisfies OwnedCard);
}

export async function updateOwnedCardQuantity(
  cardId: string,
  quantity: number,
): Promise<void> {
  const firestore = ensureDb();

  if (quantity <= 0) {
    await deleteOwnedCard(cardId);
    return;
  }

  await updateDoc(doc(firestore, BINDER_COLLECTION, cardId), {
    quantity,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteOwnedCard(cardId: string): Promise<void> {
  const firestore = ensureDb();
  await deleteDoc(doc(firestore, BINDER_COLLECTION, cardId));
}
