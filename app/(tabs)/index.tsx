import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  RefreshControl,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────
type Category = 'nose' | 'eyes' | 'oral';

interface TreatmentItem {
  id: string;
  name: string;
  dosesPerDay: number;
  startDate: string;   // ISO date YYYY-MM-DD
  endDate?: string;    // ISO date YYYY-MM-DD (optional)
  category: Category;
}

// ─── Treatment Plan ───────────────────────────────────────────────────────────
const treatmentPlan: TreatmentItem[] = [
  {
    id: 'levophta',
    name: 'Levophta',
    dosesPerDay: 2,
    startDate: '2026-04-15',
    endDate: '2026-04-29',
    category: 'eyes',
  },
  {
    id: 'naabak',
    name: 'Naabak',
    dosesPerDay: 2,
    startDate: '2026-04-15',
    endDate: '2026-06-13',
    category: 'eyes',
  },
  {
    id: 'physiol',
    name: 'Physiol',
    dosesPerDay: 6,
    startDate: '2026-04-15',
    category: 'nose',
  },
  {
    id: 'thealose',
    name: 'Thealose',
    dosesPerDay: 2,
    startDate: '2026-04-15',
    category: 'eyes',
  },
];

// ─── Category Config ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<Category, { label: string; emoji: string; color: string; bg: string }> = {
  eyes:  { label: 'Eyes',  emoji: '👁️', color: '#007AFF', bg: 'rgba(0,122,255,0.10)' },
  nose:  { label: 'Nose',  emoji: '💧', color: '#5856D6', bg: 'rgba(88,86,214,0.10)' },
  oral:  { label: 'Oral',  emoji: '💊', color: '#34C759', bg: 'rgba(52,199,89,0.10)'  },
};

// ─── Date Helpers ─────────────────────────────────────────────────────────────
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysRemaining(endDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = parseISO(endDate);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

function isCompleted(item: TreatmentItem): boolean {
  if (!item.endDate) return false;
  return daysRemaining(item.endDate) < 0;
}

function formatEndDate(iso: string): string {
  return parseISO(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── Storage ──────────────────────────────────────────────────────────────────
type DailyDoses = Record<string, number>; // { [id]: dosesTaken }

async function loadDoses(dateKey: string): Promise<DailyDoses> {
  try {
    const raw = await AsyncStorage.getItem(`doses_${dateKey}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

async function saveDoses(dateKey: string, doses: DailyDoses) {
  try {
    await AsyncStorage.setItem(`doses_${dateKey}`, JSON.stringify(doses));
  } catch {}
}

// ─── Circle Progress ──────────────────────────────────────────────────────────
function CircleDose({
  filled,
  color,
  onPress,
  disabled,
}: {
  filled: boolean;
  color: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const fill  = useRef(new Animated.Value(filled ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(fill, {
      toValue: filled ? 1 : 0,
      useNativeDriver: false,
      speed: 22,
      bounciness: 10,
    }).start();
  }, [filled]);

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.85, useNativeDriver: true, speed: 40 }).start();

  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 14 }).start();
    if (!disabled) onPress();
  };

  const bgColor     = fill.interpolate({ inputRange: [0,1], outputRange: ['rgba(0,0,0,0)', color] });
  const borderColor = fill.interpolate({ inputRange: [0,1], outputRange: ['#C7C7CC', color] });

  return (
    <TouchableOpacity activeOpacity={1} onPressIn={pressIn} onPressOut={pressOut}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} disabled={disabled}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Animated.View style={[styles.circle, { backgroundColor: bgColor, borderColor }]}>
          {filled && <Text style={styles.circleTick}>✓</Text>}
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Days Pill ────────────────────────────────────────────────────────────────
function DaysPill({ item }: { item: TreatmentItem }) {
  if (!item.endDate) {
    return (
      <View style={styles.pill}>
        <Text style={[styles.pillText, { color: '#8E8E93' }]}>Ongoing</Text>
      </View>
    );
  }
  const rem = daysRemaining(item.endDate);
  const urgentColor = rem <= 3 ? '#FF3B30' : rem <= 7 ? '#FF9500' : '#34C759';
  return (
    <View style={[styles.pill, { backgroundColor: `${urgentColor}18` }]}>
      <Text style={[styles.pillText, { color: urgentColor }]}>
        {rem === 0 ? 'Last day' : rem > 0 ? `${rem}d left` : 'Done'}
      </Text>
    </View>
  );
}

// ─── Medicine Card ────────────────────────────────────────────────────────────
function MedicineCard({
  item,
  dosesTaken,
  onTap,
  completed,
}: {
  item: TreatmentItem;
  dosesTaken: number;
  onTap: (id: string, newCount: number) => void;
  completed: boolean;
}) {
  const cat = CATEGORY_CONFIG[item.category];
  const progress = Math.min(dosesTaken, item.dosesPerDay) / item.dosesPerDay;
  const allDone  = dosesTaken >= item.dosesPerDay;

  const toggleDose = (i: number) => {
    // Tap filled → unfill (decrement), tap empty → fill (increment)
    const newCount = i < dosesTaken ? i : i + 1;
    onTap(item.id, newCount);
  };

  return (
    <View style={[styles.card, completed && styles.cardCompleted]}>

      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
          <Text style={styles.catEmoji}>{cat.emoji}</Text>
          <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
        </View>
        <DaysPill item={item} />
      </View>

      {/* Name + subtitle */}
      <Text style={[styles.cardName, allDone && !completed && styles.cardNameDone,
                    completed && styles.cardNameCompleted]}>
        {item.name}
      </Text>

      {item.endDate && (
        <Text style={styles.cardDate}>
          Until {formatEndDate(item.endDate)}
        </Text>
      )}

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[
          styles.progressFill,
          { width: `${progress * 100}%`,
            backgroundColor: completed ? '#C7C7CC' : allDone ? '#34C759' : cat.color },
        ]} />
      </View>

      {/* Circles row */}
      <View style={styles.circleRow}>
        {Array.from({ length: item.dosesPerDay }).map((_, i) => (
          <CircleDose
            key={i}
            filled={i < dosesTaken}
            color={completed ? '#C7C7CC' : allDone ? '#34C759' : cat.color}
            onPress={() => toggleDose(i)}
            disabled={completed}
          />
        ))}
        <Text style={styles.doseCount}>
          {Math.min(dosesTaken, item.dosesPerDay)}/{item.dosesPerDay}
        </Text>
      </View>

    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{count}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TrackerScreen() {
  const insets = useSafeAreaInsets();
  const today  = todayISO();

  const [doses, setDoses]         = useState<DailyDoses>({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDoses(today).then(setDoses);
  }, [today]);

  const handleTap = useCallback((id: string, newCount: number) => {
    setDoses(prev => {
      const next = { ...prev, [id]: Math.max(0, newCount) };
      saveDoses(today, next);
      return next;
    });
  }, [today]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setDoses(await loadDoses(today));
    setTimeout(() => setRefreshing(false), 500);
  }, [today]);

  // Partition into active vs completed
  const activeItems    = treatmentPlan.filter(i => !isCompleted(i));
  const completedItems = treatmentPlan.filter(i => isCompleted(i));

  // Overall progress (active only)
  const totalActive = activeItems.reduce((s, i) => s + i.dosesPerDay, 0);
  const doneActive  = activeItems.reduce((s, i) => s + Math.min(doses[i.id] ?? 0, i.dosesPerDay), 0);
  const pct = totalActive > 0 ? Math.round((doneActive / totalActive) * 100) : 100;

  const allActiveDone = doneActive === totalActive && totalActive > 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Glassmorphism Header ─── */}
      <BlurView intensity={85} tint="light"
        style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerInner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerDate}>{dateStr}</Text>
            <Text style={styles.headerTitle}>Treatment</Text>
          </View>

          {/* Ring progress */}
          <View style={styles.ring}>
            <Text style={[styles.ringPct, allActiveDone && { color: '#34C759' }]}>{pct}%</Text>
            <Text style={[styles.ringLabel, allActiveDone && { color: '#34C759' }]}>done</Text>
          </View>
        </View>

        {/* Overall progress bar */}
        <View style={styles.headerBar}>
          <View style={[
            styles.headerBarFill,
            { width: `${pct}%`, backgroundColor: allActiveDone ? '#34C759' : '#007AFF' },
          ]} />
        </View>
      </BlurView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 108 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor="#007AFF" progressViewOffset={insets.top + 90} />
        }
      >
        {/* ── Active ─── */}
        <SectionTitle title="TODAY'S DOSES" count={activeItems.length} />

        {activeItems.map(item => (
          <MedicineCard
            key={item.id}
            item={item}
            dosesTaken={doses[item.id] ?? 0}
            onTap={handleTap}
            completed={false}
          />
        ))}

        {/* ── All done banner ─── */}
        {allActiveDone && (
          <View style={styles.doneBanner}>
            <Text style={styles.doneBannerEmoji}>🎉</Text>
            <Text style={styles.doneBannerText}>All done for today!</Text>
            <Text style={styles.doneBannerSub}>Great job taking care of yourself.</Text>
          </View>
        )}

        {/* ── Completed ─── */}
        {completedItems.length > 0 && (
          <>
            <SectionTitle title="COMPLETED" count={completedItems.length} />
            {completedItems.map(item => (
              <MedicineCard
                key={item.id}
                item={item}
                dosesTaken={doses[item.id] ?? 0}
                onTap={handleTap}
                completed
              />
            ))}
          </>
        )}

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const FF = Platform.select({ ios: '-apple-system', android: 'sans-serif', default: 'System' });
const FFM = Platform.select({ ios: '-apple-system', android: 'sans-serif-medium', default: 'System' });

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  // ── Header
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.09)',
  },
  headerInner: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 20, paddingBottom: 10,
  },
  headerDate: { fontFamily: FF, fontSize: 12, color: '#8E8E93', fontWeight: '500', letterSpacing: 0.2, marginBottom: 2 },
  headerTitle: { fontFamily: FFM, fontSize: 30, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.5 },
  ring: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: 'rgba(0,122,255,0.10)',
    borderWidth: 2.5, borderColor: '#007AFF',
    alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },
  ringPct: { fontFamily: FFM, fontSize: 14, fontWeight: '700', color: '#007AFF' },
  ringLabel: { fontSize: 9, color: '#007AFF', fontWeight: '500', marginTop: -1 },
  headerBar: { height: 3, backgroundColor: '#E5E5EA', marginHorizontal: 20, marginBottom: 12, borderRadius: 2, overflow: 'hidden' },
  headerBarFill: { height: 3, borderRadius: 2 },

  // ── Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  // ── Section
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 10, marginLeft: 4 },
  sectionTitle: { fontFamily: FFM, fontSize: 12, fontWeight: '600', color: '#8E8E93', letterSpacing: 0.7 },
  sectionBadge: { backgroundColor: '#E5E5EA', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 8 },
  sectionBadgeText: { fontFamily: FFM, fontSize: 11, fontWeight: '600', color: '#8E8E93' },

  // ── Card
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 22, marginBottom: 12,
    padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  cardCompleted: { backgroundColor: '#F8F8F8', opacity: 0.7 },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },

  catBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  catEmoji: { fontSize: 13, marginRight: 4 },
  catLabel: { fontSize: 12, fontWeight: '600', fontFamily: FFM },

  pill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(52,199,89,0.12)' },
  pillText: { fontSize: 12, fontWeight: '600', fontFamily: FFM },

  cardName: { fontFamily: FFM, fontSize: 20, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.3, marginBottom: 2 },
  cardNameDone: { color: '#34C759' },
  cardNameCompleted: { color: '#C7C7CC' },
  cardDate: { fontFamily: FF, fontSize: 12, color: '#8E8E93', marginBottom: 10 },

  progressTrack: { height: 3, backgroundColor: '#F2F2F7', borderRadius: 2, overflow: 'hidden', marginBottom: 14 },
  progressFill: { height: 3, borderRadius: 2 },

  // ── Circles
  circleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  circle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  circleTick: { color: '#FFF', fontSize: 15, fontWeight: '700', lineHeight: 17 },
  doseCount: { fontFamily: FFM, fontSize: 12, fontWeight: '600', color: '#8E8E93', marginLeft: 4 },

  // ── Done banner
  doneBanner: {
    backgroundColor: '#34C759', borderRadius: 20, padding: 22, alignItems: 'center', marginVertical: 8,
    shadowColor: '#34C759', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 14, elevation: 5,
  },
  doneBannerEmoji: { fontSize: 38, marginBottom: 6 },
  doneBannerText: { fontFamily: FFM, fontSize: 18, fontWeight: '700', color: '#FFF' },
  doneBannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
});
