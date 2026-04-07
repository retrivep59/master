import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lookupBarcode } from '@/services/openfoodfacts';
import { useFoodLogStore } from '@/store/foodLogStore';
import { useSmartSuggestions } from '@/hooks/useSmartSuggestions';
import { FoodItem, MealEntry } from '@/types/food';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

export default function BarcodeScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<FoodItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [adding, setAdding] = useState(false);
  const { addEntry } = useFoodLogStore();
  const { mealType } = useSmartSuggestions();

  const handleBarcodeScan = async ({ data }: { data: string }) => {
    if (!scanning || loading) return;
    setScanning(false);
    setLoading(true);
    try {
      const item = await lookupBarcode(data);
      if (item) {
        setFound(item);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!found) return;
    setAdding(true);
    const entry: MealEntry = {
      id: `entry-${Date.now()}`,
      foodItem: found,
      mealType,
      quantity: 1,
      loggedAt: new Date().toISOString(),
    };
    await addEntry(entry);
    setAdding(false);
    router.back();
  };

  const handleReset = () => {
    setFound(null);
    setNotFound(false);
    setScanning(true);
    setLoading(false);
  };

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permWrap}>
          <Ionicons name="barcode-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Grant Access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanning ? handleBarcodeScan : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
      />

      <SafeAreaView style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Barcode Scanner</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Scanning frame */}
        {!found && !notFound && (
          <View style={styles.frameWrap}>
            <View style={styles.frame}>
              <View style={[styles.edge, styles.edgeTL]} />
              <View style={[styles.edge, styles.edgeTR]} />
              <View style={[styles.edge, styles.edgeBL]} />
              <View style={[styles.edge, styles.edgeBR]} />
            </View>
            <Text style={styles.scanHint}>
              {loading ? '🔍 Looking up product...' : '📦 Point at a barcode'}
            </Text>
            {loading && <ActivityIndicator color={Colors.primary} />}
          </View>
        )}

        {/* Not found */}
        {notFound && (
          <View style={styles.notFoundWrap}>
            <GlassCard style={styles.resultCard}>
              <Text style={styles.notFoundIcon}>😕</Text>
              <Text style={styles.notFoundTitle}>Product not found</Text>
              <Text style={styles.notFoundDesc}>
                This barcode wasn't found in the database.
                Try the AI scanner instead.
              </Text>
              <View style={styles.notFoundActions}>
                <NeonButton label="Scan Again" onPress={handleReset} size="md" />
                <NeonButton
                  label="AI Scan Instead"
                  onPress={() => {
                    router.back();
                    setTimeout(() => router.push('/scanner'), 50);
                  }}
                  variant="outline"
                  size="md"
                />
              </View>
            </GlassCard>
          </View>
        )}

        {/* Found result */}
        {found && (
          <View style={styles.resultWrap}>
            <GlassCard style={styles.resultCard}>
              <Text style={styles.productBrand}>{found.brand}</Text>
              <Text style={styles.productName}>{found.name}</Text>
              <Text style={styles.servingSize}>{found.servingSize} per serving</Text>

              <View style={styles.nutrRow}>
                <NutrCell label="Calories" value={`${found.nutrition.calories}`} unit="kcal" accent />
                <NutrCell label="Protein" value={`${found.nutrition.protein}`} unit="g" color={Colors.protein} />
                <NutrCell label="Carbs" value={`${found.nutrition.carbs}`} unit="g" color={Colors.carbs} />
                <NutrCell label="Fat" value={`${found.nutrition.fat}`} unit="g" color={Colors.fat} />
              </View>

              <View style={styles.resultActions}>
                <NeonButton
                  label={`Add ${found.nutrition.calories} kcal`}
                  onPress={handleAdd}
                  loading={adding}
                />
                <NeonButton label="Scan Again" onPress={handleReset} variant="outline" />
              </View>
            </GlassCard>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function NutrCell({
  label,
  value,
  unit,
  accent,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
  color?: string;
}) {
  return (
    <View style={nutrStyles.cell}>
      <Text style={[nutrStyles.value, accent && { color: Colors.primaryDark }, color && { color }]}>
        {value}
      </Text>
      <Text style={nutrStyles.unit}>{unit}</Text>
      <Text style={nutrStyles.label}>{label}</Text>
    </View>
  );
}

const nutrStyles = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center' },
  value: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.heavy,
    color: Colors.dark,
  },
  unit: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});

const FRAME_W = 280;
const FRAME_H = 140;
const E = 20;
const EW = 2.5;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1, backgroundColor: Colors.backgroundTint },
  overlay: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  frameWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[4],
  },
  frame: {
    width: FRAME_W,
    height: FRAME_H,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
  },
  edge: {
    position: 'absolute',
    width: E,
    height: E,
    borderColor: Colors.primary,
  },
  edgeTL: { top: -1, left: -1, borderTopWidth: EW, borderLeftWidth: EW },
  edgeTR: { top: -1, right: -1, borderTopWidth: EW, borderRightWidth: EW },
  edgeBL: { bottom: -1, left: -1, borderBottomWidth: EW, borderLeftWidth: EW },
  edgeBR: { bottom: -1, right: -1, borderBottomWidth: EW, borderRightWidth: EW },
  scanHint: {
    color: '#fff',
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  notFoundWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing[5],
  },
  resultWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing[5],
  },
  resultCard: {
    gap: Spacing[3],
  },
  notFoundIcon: { fontSize: 36, textAlign: 'center' },
  notFoundTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
    textAlign: 'center',
  },
  notFoundDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  notFoundActions: { gap: Spacing[3] },
  productBrand: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  productName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.heavy,
    color: Colors.dark,
  },
  servingSize: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  nutrRow: {
    flexDirection: 'row',
    paddingVertical: Spacing[2],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  resultActions: { gap: Spacing[3] },
  permWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[4],
    padding: Spacing[8],
  },
  permTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
  },
  permBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    borderRadius: 999,
  },
  permBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
  },
});
