import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { onAuthStateChanged, User } from "firebase/auth";

import { FeedbackToastProvider } from "@/components/feedback-toast-provider";
import { auth } from "@/services/firebase";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<User | null>(null);
  const isAuthenticated = useMemo(() => Boolean(session), [session]);

  useEffect(() => {
    if (!auth) {
      setSession(null);
      setIsReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setSession(nextUser);
      setIsReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const currentRoute = segments[0];
    const isAuthRoute = currentRoute === "login" || currentRoute === "register";

    if (!session && !isAuthRoute) {
      router.replace("/login");
      return;
    }

    if (session && isAuthRoute) {
      router.replace("/");
    }
  }, [isReady, router, segments, session]);

  if (!isReady) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <FeedbackToastProvider>
          <StatusBar style="light" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#FFD700" />
          </View>
        </FeedbackToastProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <FeedbackToastProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: "#1E1E24",
            },
          }}
        >
          <Stack.Screen name="login" redirect={isAuthenticated} />
          <Stack.Screen name="register" redirect={isAuthenticated} />
          <Stack.Screen name="(drawer)" redirect={!isAuthenticated} />
          <Stack.Screen name="deck" redirect={!isAuthenticated} />
          <Stack.Screen
            name="modal"
            options={{
              presentation: "modal",
            }}
          />
        </Stack>
      </FeedbackToastProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E24",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E1E24",
  },
});
