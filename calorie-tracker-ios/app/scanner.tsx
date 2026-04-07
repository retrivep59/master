import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { analyzeFoodImage } from '@/services/claude';
import { FoodResultSheet } from '@/components/FoodResultSheet';
import { FoodAnalysisResult } from '@/types/ai';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

export default function ScannerScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<'idle' | 'capturing' | 'analyzing' | 'result' | 'error'>('idle');
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [errorMsg, setErrorMsg] = useState('');

  const scanPulse = useSharedValue(0.4);
  React.useEffect(() => {
    scanPulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0.4, { duration: 800 })),
      -1
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: scanPulse.value }));

  const handleCapture = async () => {
    if (!cameraRef.current || status !== 'idle') return;
    try {
      setStatus('capturing');
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      if (!photo) throw new Error('No photo captured');
      setPhotoUri(photo.uri);
      setStatus('analyzing');
      const analysis = await analyzeFoodImage(photo.uri);
      setResult(analysis);
      setStatus('result');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Analysis failed');
      setStatus('error');
    }
  };

  const handleConfirm = () => {
    router.back();
  };

  const handleDismiss = () => {
    setResult(null);
    setPhotoUri(undefined);
    setStatus('idle');
    setErrorMsg('');
  };

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permissionWrap}>
          <Ionicons name="camera-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionDesc}>
            CalorieAI needs camera access to identify your food using AI.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      {/* Camera */}
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* UI overlay */}
      <SafeAreaView style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>AI Scanner</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Scanning frame */}
        <View style={styles.frameWrap}>
          <View style={styles.frame}>
            {/* Corner guides */}
            {['tl', 'tr', 'bl', 'br'].map((pos) => (
              <View
                key={pos}
                style={[
                  styles.corner,
                  pos.startsWith('t') ? styles.cornerTop : styles.cornerBottom,
                  pos.endsWith('r') ? styles.cornerRight : styles.cornerLeft,
                ]}
              />
            ))}
          </View>
          <Animated.Text style={[styles.scanningText, pulseStyle]}>
            {status === 'analyzing' ? '🧠 Analyzing...' : '📸 Point at your food'}
          </Animated.Text>
        </View>

        {/* Analyzing overlay */}
        {status === 'analyzing' && (
          <Animated.View entering={FadeIn} style={styles.analyzingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.analyzingText}>AI is identifying your food...</Text>
          </Animated.View>
        )}

        {/* Error state */}
        {status === 'error' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMsg || 'Could not analyze image'}</Text>
            <TouchableOpacity onPress={handleDismiss}>
              <Text style={styles.retryLink}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Capture button */}
        {(status === 'idle' || status === 'error') && (
          <View style={styles.captureRow}>
            <Text style={styles.hintText}>Tap to capture and analyze</Text>
            <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* Result bottom sheet */}
      <Modal visible={status === 'result'} animationType="slide" transparent>
        <View style={styles.modalBg}>
          {result && (
            <FoodResultSheet
              result={result}
              photoUri={photoUri}
              onConfirm={handleConfirm}
              onDismiss={handleDismiss}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const FRAME_SIZE = 260;
const CORNER_LEN = 24;
const CORNER_WIDTH = 3;

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
    width: FRAME_SIZE,
    height: FRAME_SIZE,
  },
  corner: {
    position: 'absolute',
    width: CORNER_LEN,
    height: CORNER_LEN,
    borderColor: Colors.primary,
  },
  cornerTop: { top: 0, borderTopWidth: CORNER_WIDTH },
  cornerBottom: { bottom: 0, borderBottomWidth: CORNER_WIDTH },
  cornerLeft: { left: 0, borderLeftWidth: CORNER_WIDTH },
  cornerRight: { right: 0, borderRightWidth: CORNER_WIDTH },
  scanningText: {
    color: '#fff',
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[4],
  },
  analyzingText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  errorBox: {
    margin: Spacing[5],
    padding: Spacing[4],
    backgroundColor: 'rgba(255,71,87,0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.error,
    alignItems: 'center',
    gap: Spacing[2],
  },
  errorText: {
    color: '#fff',
    fontSize: FontSize.base,
    textAlign: 'center',
  },
  retryLink: {
    color: Colors.primary,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  captureRow: {
    alignItems: 'center',
    paddingBottom: Spacing[8],
    gap: Spacing[3],
  },
  hintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.sm,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
  },
  permissionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[8],
    gap: Spacing[4],
  },
  permissionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
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
  modalBg: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
});
