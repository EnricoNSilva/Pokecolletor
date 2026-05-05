import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as Haptics from "expo-haptics";
import { Accelerometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

const colors = {
  background: "#1E1E24",
  surface: "#262631",
  surfaceAlt: "#2F2F3D",
  border: "rgba(255, 255, 255, 0.08)",
  text: "#F5F5F8",
  muted: "#A5A5B4",
  accent: "#FFD700",
  success: "#2ED573",
  danger: "#FF6B6B",
};

const SOUND_URIS = {
  flip: "https://actions.google.com/sounds/v1/foley/coins_3.ogg",
  dice: "https://actions.google.com/sounds/v1/cartoon/pop.ogg",
  timer: "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg",
};

type TimerStatus = "idle" | "running" | "paused";

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function ToolsScreen() {
  const [coinResult, setCoinResult] = useState<"Cara" | "Coroa" | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);

  const [diceValue, setDiceValue] = useState(1);
  const [lastRollSource, setLastRollSource] = useState<"botao" | "shake" | null>(
    null,
  );
  const [shakeEnabled, setShakeEnabled] = useState(true);
  const [shakeSupported, setShakeSupported] = useState(Platform.OS !== "web");

  const [timerPreset, setTimerPreset] = useState(30);
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>("idle");

  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shakeCooldownRef = useRef(0);

  const flipSoundRef = useRef<Audio.Sound | null>(null);
  const diceSoundRef = useRef<Audio.Sound | null>(null);
  const timerSoundRef = useRef<Audio.Sound | null>(null);

  async function playSound(kind: "flip" | "dice" | "timer") {
    try {
      const soundRef =
        kind === "flip"
          ? flipSoundRef.current
          : kind === "dice"
            ? diceSoundRef.current
            : timerSoundRef.current;

      if (!soundRef) {
        return;
      }

      await soundRef.replayAsync();
    } catch (error) {
      console.warn("Nao foi possivel tocar som:", error);
    }
  }

  async function triggerHaptic(style: "light" | "success" | "warning") {
    try {
      if (style === "light") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      await Haptics.notificationAsync(
        style === "success"
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
    } catch (error) {
      console.warn("Haptics indisponivel:", error);
    }
  }

  async function handleFlipCoin() {
    if (isFlipping) {
      return;
    }

    setIsFlipping(true);
    await triggerHaptic("light");
    await playSound("flip");

    setTimeout(async () => {
      const result = Math.random() < 0.5 ? "Cara" : "Coroa";
      setCoinResult(result);
      setIsFlipping(false);
      await triggerHaptic("success");
    }, 650);
  }

  async function rollDice(source: "botao" | "shake") {
    const next = Math.floor(Math.random() * 6) + 1;
    setDiceValue(next);
    setLastRollSource(source);
    await triggerHaptic("light");
    await playSound("dice");
  }

  function changePreset(next: number) {
    if (timerStatus === "running") {
      return;
    }

    setTimerPreset(next);
    setRemainingSeconds(next);
    setTimerStatus("idle");
  }

  function stopTimerInterval() {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }

  function resetTimer() {
    stopTimerInterval();
    setRemainingSeconds(timerPreset);
    setTimerStatus("idle");
  }

  function startTimer() {
    if (remainingSeconds <= 0) {
      setRemainingSeconds(timerPreset);
    }

    setTimerStatus("running");
  }

  function pauseTimer() {
    stopTimerInterval();
    setTimerStatus("paused");
  }

  useEffect(() => {
    async function setupAudio() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          shouldDuckAndroid: true,
          staysActiveInBackground: false,
          playThroughEarpieceAndroid: false,
        });

        const [flip, dice, timer] = await Promise.all([
          Audio.Sound.createAsync({ uri: SOUND_URIS.flip }),
          Audio.Sound.createAsync({ uri: SOUND_URIS.dice }),
          Audio.Sound.createAsync({ uri: SOUND_URIS.timer }),
        ]);

        flipSoundRef.current = flip.sound;
        diceSoundRef.current = dice.sound;
        timerSoundRef.current = timer.sound;
      } catch (error) {
        console.warn("Falha ao preparar audio das ferramentas:", error);
      }
    }

    setupAudio();

    return () => {
      stopTimerInterval();
      void flipSoundRef.current?.unloadAsync();
      void diceSoundRef.current?.unloadAsync();
      void timerSoundRef.current?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (timerStatus !== "running") {
      stopTimerInterval();
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setRemainingSeconds((previous) => {
        if (previous <= 1) {
          stopTimerInterval();
          setTimerStatus("idle");
          void triggerHaptic("warning");
          void playSound("timer");
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => stopTimerInterval();
  }, [timerStatus]);

  useEffect(() => {
    if (!shakeEnabled) {
      return;
    }

    if (Platform.OS === "web") {
      setShakeSupported(false);
      return;
    }

    let subscription: { remove: () => void } | null = null;
    let mounted = true;

    async function setupAccelerometer() {
      try {
        const available = await Accelerometer.isAvailableAsync();
        if (!mounted) {
          return;
        }

        setShakeSupported(available);

        if (!available) {
          return;
        }

        Accelerometer.setUpdateInterval(150);

        subscription = Accelerometer.addListener(({ x, y, z }) => {
          const acceleration = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();

          if (acceleration < 1.9) {
            return;
          }

          if (now - shakeCooldownRef.current < 1200) {
            return;
          }

          shakeCooldownRef.current = now;
          void rollDice("shake");
        });
      } catch (error) {
        if (mounted) {
          setShakeSupported(false);
          setShakeEnabled(false);
        }
        console.warn("Acelerometro indisponivel:", error);
      }
    }

    void setupAccelerometer();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [shakeEnabled]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="tools" size={14} color={colors.accent} />
          <Text style={styles.badgeText}>Ferramentas</Text>
        </View>
        <Text style={styles.title}>Centro de Partida</Text>
        <Text style={styles.subtitle}>
          Use acelerometro, vibracao e som para apoiar suas partidas de TCG.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Coin Flip</Text>
          <MaterialCommunityIcons name="circle-double" size={20} color={colors.accent} />
        </View>

        <Text style={styles.resultValue}>
          {isFlipping ? "Girando..." : coinResult ?? "Pronto para lançar"}
        </Text>

        <Pressable
          style={[styles.primaryButton, isFlipping && styles.disabledButton]}
          onPress={handleFlipCoin}
          disabled={isFlipping}
        >
          <Text style={styles.primaryButtonText}>Lancar moeda</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Dado d6</Text>
          <MaterialCommunityIcons name="dice-6" size={20} color={colors.accent} />
        </View>

        <Text style={styles.resultValue}>{diceValue}</Text>
        <Text style={styles.helperText}>
          Ultima rolagem: {lastRollSource === "shake" ? "chacoalhar" : lastRollSource ?? "-"}
        </Text>
        {!shakeSupported ? (
          <Text style={styles.warningText}>Acelerometro indisponivel neste dispositivo.</Text>
        ) : null}

        <View style={styles.inlineRowBetween}>
          <Text style={styles.switchLabel}>Rolar ao chacoalhar</Text>
          <Switch
            value={shakeEnabled}
            onValueChange={setShakeEnabled}
            disabled={!shakeSupported}
            trackColor={{ false: colors.surfaceAlt, true: "rgba(255, 215, 0, 0.45)" }}
            thumbColor={shakeEnabled ? colors.accent : colors.muted}
          />
        </View>

        <Pressable style={styles.primaryButton} onPress={() => void rollDice("botao")}>
          <Text style={styles.primaryButtonText}>Rolar dado</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Timer de turno</Text>
          <MaterialCommunityIcons name="timer-outline" size={20} color={colors.accent} />
        </View>

        <Text style={styles.timerText}>{formatTime(remainingSeconds)}</Text>
        <Text style={styles.helperText}>Ao zerar, dispara vibracao e som.</Text>

        <View style={styles.presetRow}>
          {[30, 45, 60].map((preset) => (
            <Pressable
              key={preset}
              style={[
                styles.presetPill,
                timerPreset === preset && styles.presetPillActive,
              ]}
              onPress={() => changePreset(preset)}
            >
              <Text
                style={[
                  styles.presetPillText,
                  timerPreset === preset && styles.presetPillTextActive,
                ]}
              >
                {preset}s
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.actionRow}>
          {timerStatus === "running" ? (
            <Pressable style={styles.secondaryButton} onPress={pauseTimer}>
              <Text style={styles.secondaryButtonText}>Pausar</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.primaryButtonCompact} onPress={startTimer}>
              <Text style={styles.primaryButtonText}>Iniciar</Text>
            </Pressable>
          )}

          <Pressable style={styles.secondaryButton} onPress={resetTimer}>
            <Text style={styles.secondaryButtonText}>Resetar</Text>
          </Pressable>
        </View>
      </View>

      {Platform.OS === "web" ? (
        <View style={styles.noticeCard}>
          <MaterialCommunityIcons name="information-outline" size={18} color={colors.muted} />
          <Text style={styles.noticeText}>
            No navegador, acelerometro/haptics podem ter suporte parcial conforme dispositivo.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 30,
    gap: 14,
  },
  hero: {
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  resultValue: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
  },
  helperText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  warningText: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryButtonCompact: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "800",
  },
  inlineRowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  switchLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  timerText: {
    color: colors.text,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "900",
    letterSpacing: 1,
  },
  presetRow: {
    flexDirection: "row",
    gap: 8,
  },
  presetPill: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  presetPillActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(255, 215, 0, 0.16)",
  },
  presetPillText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  presetPillTextActive: {
    color: colors.accent,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  noticeCard: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
  },
  noticeText: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
});