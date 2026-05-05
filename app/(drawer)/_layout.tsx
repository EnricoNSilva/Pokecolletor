import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Alert, Pressable } from "react-native";
import { Drawer } from "expo-router/drawer";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";

import { auth } from "@/services/firebase";

const drawerTheme = {
  background: "#1E1E24",
  surface: "#262631",
  text: "#F4F4F8",
  mutedText: "#A4A4B3",
  accent: "#FFD700",
};

export default function DrawerLayout() {
  const router = useRouter();

  async function handleLogout() {
    if (!auth) {
      Alert.alert(
        "Firebase nao configurado",
        "Preencha as variaveis do .env para sair corretamente.",
      );
      return;
    }

    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      Alert.alert("Erro ao sair", "Nao foi possivel encerrar a sessao.");
      console.error("Erro ao fazer logout:", error);
    }
  }

  return (
    <Drawer
      screenOptions={{
        headerStyle: {
          backgroundColor: drawerTheme.background,
        },
        headerTintColor: drawerTheme.text,
        headerTitleStyle: {
          fontWeight: "700",
        },
        drawerStyle: {
          backgroundColor: drawerTheme.background,
        },
        drawerContentStyle: {
          backgroundColor: drawerTheme.background,
        },
        drawerActiveTintColor: drawerTheme.accent,
        drawerInactiveTintColor: drawerTheme.mutedText,
        drawerActiveBackgroundColor: "rgba(255, 215, 0, 0.12)",
        drawerLabelStyle: {
          fontSize: 15,
          fontWeight: "600",
        },
        headerRight: () => (
          <Pressable
            onPress={handleLogout}
            hitSlop={10}
            style={{ marginRight: 16 }}
          >
            <MaterialCommunityIcons
              name="logout"
              size={22}
              color={drawerTheme.accent}
            />
          </Pressable>
        ),
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: "Dashboard",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="view-dashboard"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="sets"
        options={{
          title: "Expansões",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="cards-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="binder"
        options={{
          title: "Meu Fichário",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="book-open-page-variant"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="decks"
        options={{
          title: "Meus Decks",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cards" size={size} color={color} />
          ),
        }}
      />
    </Drawer>
  );
}
