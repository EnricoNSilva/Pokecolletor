import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigation, useRouter } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getSets, PokemonTcgSet } from "@/services/pokemon-tcg-api";

const colors = {
  background: "#1E1E24",
  surface: "#262631",
  border: "rgba(255, 255, 255, 0.08)",
  text: "#F5F5F8",
  muted: "#A5A5B4",
  accent: "#FFD700",
};

const CUSTOM_HEADER_HEIGHT = 64;
const SEARCH_BAR_HEIGHT = 52;
const TOP_BAR_GAP = 8;
const TOP_BAR_HEIGHT = CUSTOM_HEADER_HEIGHT + SEARCH_BAR_HEIGHT + TOP_BAR_GAP;

export default function SetsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [sets, setSets] = useState<PokemonTcgSet[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topBarTranslateY = useRef(new Animated.Value(0)).current;
  const lastOffsetYRef = useRef(0);
  const isTopBarVisibleRef = useRef(true);

  const preferredSeriesHints = [
    "mega",
    "scarlet & violet",
    "sword & shield",
    "sun & moon",
    "xy",
  ];

  async function loadSets(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

    try {
      setError(null);
      const response = await getSets(1, 40);
      setSets(response.data);
    } catch (loadError) {
      setError("Não foi possível carregar as expansões agora.");
      Alert.alert(
        "Erro ao buscar expansões",
        "Verifique sua conexão e tente novamente em alguns segundos.",
      );
      console.error("Erro ao carregar sets da API Pokémon TCG:", loadError);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    try {
      setRefreshing(true);
      await loadSets(false);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadSets();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });

    return () => {
      navigation.setOptions({
        headerShown: true,
      });
    };
  }, [navigation]);

  function animateTopBar(show: boolean) {
    const shouldAnimate = show
      ? !isTopBarVisibleRef.current
      : isTopBarVisibleRef.current;

    if (!shouldAnimate) {
      return;
    }

    isTopBarVisibleRef.current = show;

    Animated.timing(topBarTranslateY, {
      toValue: show ? 0 : -TOP_BAR_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const currentOffsetY = event.nativeEvent.contentOffset.y;
    const delta = currentOffsetY - lastOffsetYRef.current;

    if (currentOffsetY <= 0) {
      animateTopBar(true);
      lastOffsetYRef.current = 0;
      return;
    }

    if (delta > 8 && currentOffsetY > 40) {
      animateTopBar(false);
    } else if (delta < -4) {
      animateTopBar(true);
    }

    lastOffsetYRef.current = currentOffsetY;
  }

  const filteredSets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sets.filter(
      (set) =>
        (!selectedSeries || set.series === selectedSeries) &&
        (!normalizedSearch ||
          set.name.toLowerCase().includes(normalizedSearch) ||
          set.series.toLowerCase().includes(normalizedSearch)),
    );
  }, [search, selectedSeries, sets]);

  const spotlightSeries = useMemo(() => {
    const seriesMap = new Map<string, PokemonTcgSet>();

    for (const set of sets) {
      if (!seriesMap.has(set.series)) {
        seriesMap.set(set.series, set);
      }
    }

    const availableSeries = Array.from(seriesMap.entries()).map(
      ([series, set]) => ({
        series,
        set,
      }),
    );

    const picked: Array<{ series: string; set: PokemonTcgSet }> = [];
    const usedSeries = new Set<string>();

    for (const hint of preferredSeriesHints) {
      const match = availableSeries.find((item) =>
        item.series.toLowerCase().includes(hint),
      );

      if (match && !usedSeries.has(match.series)) {
        picked.push(match);
        usedSeries.add(match.series);
      }
    }

    for (const item of availableSeries) {
      if (picked.length >= 6) {
        break;
      }

      if (!usedSeries.has(item.series)) {
        picked.push(item);
        usedSeries.add(item.series);
      }
    }

    return picked;
  }, [sets]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Carregando expansões...</Text>
      </View>
    );
  }

  if (error && sets.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorTitle}>Falha ao carregar dados</Text>
        <Text style={styles.errorDescription}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => loadSets()}>
          <Text style={styles.retryButtonLabel}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.topBar,
          {
            transform: [{ translateY: topBarTranslateY }],
          },
        ]}
      >
        <View style={styles.customHeader}>
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            hitSlop={10}
            style={styles.menuButton}
          >
            <MaterialCommunityIcons name="menu" size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.customHeaderTitle}>Expansões</Text>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nome ou série..."
          placeholderTextColor={colors.muted}
          style={styles.searchInputPinned}
        />
      </Animated.View>

      <FlatList
        data={filteredSets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.subtitle}>
                Selecione uma coleção para carregar as cartas e começar o
                controle do seu fichário.
              </Text>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Blocos em destaque</Text>
              {selectedSeries ? (
                <Pressable onPress={() => setSelectedSeries(null)}>
                  <Text style={styles.clearFilter}>Limpar filtro</Text>
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.spotlightList}
            >
              {spotlightSeries.map((item) => {
                const isActive = selectedSeries === item.series;

                return (
                  <Pressable
                    key={item.series}
                    onPress={() => setSelectedSeries(item.series)}
                    style={[
                      styles.spotlightCard,
                      isActive && styles.spotlightCardActive,
                    ]}
                  >
                    <Image
                      source={{ uri: item.set.images.logo }}
                      style={styles.spotlightLogo}
                      contentFit="contain"
                    />
                    <Text style={styles.spotlightLabel} numberOfLines={1}>
                      {item.series}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/deck",
                params: {
                  setId: item.id,
                  setName: item.name,
                },
              })
            }
            style={styles.card}
          >
            <View style={styles.cardTop}>
              <Image
                source={{ uri: item.images.symbol }}
                style={styles.symbol}
                contentFit="contain"
              />
              <View style={styles.cardTextBlock}>
                <Text style={styles.cardSeries}>{item.series}</Text>
                <Text style={styles.cardTitle}>{item.name}</Text>
              </View>
            </View>

            <Image
              source={{ uri: item.images.logo }}
              style={styles.logo}
              contentFit="contain"
            />

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Cartas: {item.total}</Text>
              <Text style={styles.metaText}>
                Lançamento: {item.releaseDate}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Nenhuma expansão encontrada</Text>
            <Text style={styles.emptyDescription}>
              Tente outro termo de busca ou atualize para recarregar os dados.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 15,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  errorDescription: {
    color: colors.muted,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonLabel: {
    color: "#1E1E24",
    fontWeight: "700",
    fontSize: 14,
  },
  header: {
    marginTop: TOP_BAR_HEIGHT + 12,
    marginBottom: 10,
    gap: 4,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    gap: TOP_BAR_GAP,
  },
  customHeader: {
    height: CUSTOM_HEADER_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  customHeaderTitle: {
    color: colors.text,
    fontSize: 34 / 2,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.accent,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
  searchInputPinned: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  clearFilter: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  spotlightList: {
    gap: 10,
    paddingBottom: 12,
  },
  spotlightCard: {
    width: 176,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 10,
    gap: 8,
  },
  spotlightCardActive: {
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  spotlightLogo: {
    width: "100%",
    height: 42,
  },
  spotlightLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 20,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 14,
  },
  cardTop: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  symbol: {
    width: 44,
    height: 44,
  },
  cardTextBlock: {
    flex: 1,
    gap: 2,
  },
  cardSeries: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  logo: {
    width: "100%",
    height: 64,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    rowGap: 4,
  },
  metaText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "500",
  },
  emptyBox: {
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyDescription: {
    color: colors.muted,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
});
