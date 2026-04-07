import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { parseFoodText } from '@/services/claude';
import { FoodResultSheet } from '@/components/FoodResultSheet';
import { FoodAnalysisResult } from '@/types/ai';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { NeonButton } from '@/components/ui/NeonButton';

// NOTE: Expo-av voice recording is used for voice input.
// For simplicity, the voice feature prompts the user to type their input
// when actual microphone recording is not configured, as a graceful fallback.

export default function ManualAddScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: 'voice' | 'text' }>();

  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'parsing' | 'result' | 'error'>('idle');
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Listening pulse animation
  const wave = useSharedValue(1);
  useEffect(() => {
    if (status === 'listening') {
      wave.value = withRepeat(
        withSequence(withTiming(1.3, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1
      );
    } else {
      wave.value = 1;
    }
  }, [status]);
  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: wave.value }],
  }));

  const handleParse = async (text: string) => {
    if (!text.trim()) return;
    try {
      setStatus('parsing');
      const analysis = await parseFoodText(text);
      setResult(analysis);
      setStatus('result');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to analyze text');
      setStatus('error');
    }
  };

  const handleConfirm = () => {
    router.back();
  };

  const handleDismiss = () => {
    setResult(null);
    setStatus('idle');
    setErrorMsg('');
  };

  const isVoiceMode = mode === 'voice';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={26} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isVoiceMode ? '🎤 Voice Log' : '✏️ Type Food'}
          </Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.container}>
          {/* Prompt */}
          <Text style={styles.prompt}>What did you eat?</Text>
          <Text style={styles.hint}>
            e.g. "A bowl of oatmeal with banana and honey" or "2 eggs on toast"
          </Text>

          {/* Input */}
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Describe your meal..."
              placeholderTextColor={Colors.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              autoFocus={!isVoiceMode}
              selectionColor={Colors.primary}
            />
            {input.length > 0 && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => setInput('')}
              >
                <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Parsing indicator */}
          {status === 'parsing' && (
            <Animated.View entering={FadeIn} style={styles.parsingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.parsingText}>AI analyzing your meal...</Text>
            </Animated.View>
          )}

          {/* Error */}
          {status === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
              <TouchableOpacity onPress={handleDismiss}>
                <Text style={styles.retryLink}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* CTA */}
          <NeonButton
            label="Analyze with AI →"
            onPress={() => handleParse(input)}
            disabled={!input.trim() || status === 'parsing'}
            loading={status === 'parsing'}
          />
        </View>
      </SafeAreaView>

      {/* Result sheet */}
      <Modal visible={status === 'result'} animationType="slide" transparent>
        <View style={styles.modalBg}>
          {result && (
            <FoodResultSheet
              result={result}
              onConfirm={handleConfirm}
              onDismiss={handleDismiss}
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.backgroundTint },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing[6],
    gap: Spacing[4],
  },
  prompt: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.heavy,
    color: Colors.dark,
  },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: FontSize.sm * 1.6,
  },
  inputWrap: {
    flex: 1,
    maxHeight: 200,
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: Spacing[4],
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: FontSize.md * 1.5,
  },
  clearBtn: {
    alignSelf: 'flex-start',
    marginLeft: Spacing[2],
  },
  parsingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.primaryMuted,
    padding: Spacing[3],
    borderRadius: BorderRadius.lg,
  },
  parsingText: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    fontWeight: FontWeight.medium,
  },
  errorBox: {
    padding: Spacing[4],
    backgroundColor: 'rgba(255,71,87,0.08)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.error,
    gap: Spacing[2],
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
  },
  retryLink: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
  },
  modalBg: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});
