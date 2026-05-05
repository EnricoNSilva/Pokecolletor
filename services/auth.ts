import {
  createUserWithEmailAndPassword,
  type User,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "@/services/firebase";

function ensureAuth() {
  if (!auth) {
    throw new Error("Firebase nao configurado. Preencha o arquivo .env.");
  }

  return auth;
}

async function syncUserProfile(user: User, email: string) {
  if (!db) {
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);
  const displayName = email.split("@")[0] || "Treinador";

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email ?? email,
      displayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return;
  }

  await updateDoc(userRef, {
    email: user.email ?? email,
    updatedAt: serverTimestamp(),
  });
}

export async function signInWithEmail(email: string, password: string) {
  const firebaseAuth = ensureAuth();
  const credential = await signInWithEmailAndPassword(
    firebaseAuth,
    email,
    password,
  );
  await syncUserProfile(credential.user, email);
  return credential;
}

export async function signUpWithEmail(email: string, password: string) {
  const firebaseAuth = ensureAuth();
  const credential = await createUserWithEmailAndPassword(
    firebaseAuth,
    email,
    password,
  );

  await syncUserProfile(credential.user, email);

  return credential;
}
