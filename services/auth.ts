import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

import { auth } from '@/services/firebase';

function ensureAuth() {
  if (!auth) {
    throw new Error('Firebase nao configurado. Preencha o arquivo .env.');
  }

  return auth;
}

export async function signInWithEmail(email: string, password: string) {
  const firebaseAuth = ensureAuth();
  return signInWithEmailAndPassword(firebaseAuth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  const firebaseAuth = ensureAuth();
  return createUserWithEmailAndPassword(firebaseAuth, email, password);
}
