import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";

const drawerTheme = {
  background: "#1E1E24",
  surface: "#262631",
  text: "#F4F4F8",
  mutedText: "#A4A4B3",
  accent: "#FFD700",
};

export default function DrawerLayout() {
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
    </Drawer>
  );
}
