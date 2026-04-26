import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import type { StepFrequencySample } from '@/types/fitness';

interface StepFrequencyChartProps {
  data: StepFrequencySample[];
  width: number;
  height?: number;
}

const LABEL_HOURS = [6, 9, 12, 18, 22];
const LABEL_MAP: Record<number, string> = { 6: '6 AM', 9: '9 AM', 12: 'Noon', 18: '6 PM', 22: '10 PM' };

export function StepFrequencyChart({ data, width, height = 120 }: StepFrequencyChartProps) {
  const { areaPath, linePath, xPositions } = useMemo(() => {
    if (data.length < 2) return { areaPath: '', linePath: '', xPositions: {} };

    const maxSteps = Math.max(...data.map((d) => d.steps), 1);
    const minHour = data[0].hour;
    const maxHour = data[data.length - 1].hour;
    const hourRange = maxHour - minHour || 1;
    const paddingTop = 10;

    const points = data.map((d) => ({
      x: ((d.hour - minHour) / hourRange) * width,
      y: paddingTop + (1 - d.steps / maxSteps) * (height - paddingTop),
      hour: d.hour,
    }));

    let linePath = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) / 3;
      const cp2x = curr.x - (curr.x - prev.x) / 3;
      linePath += ` C ${cp1x},${prev.y} ${cp2x},${curr.y} ${curr.x},${curr.y}`;
    }

    const areaPath =
      linePath +
      ` L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

    const xPositions: Record<number, number> = {};
    for (const p of points) {
      xPositions[p.hour] = p.x;
    }

    return { areaPath, linePath, xPositions };
  }, [data, width, height]);

  const minHour = data[0]?.hour ?? 6;
  const maxHour = data[data.length - 1]?.hour ?? 22;
  const hourRange = maxHour - minHour || 1;

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Colors.primary} stopOpacity="0.45" />
            <Stop offset="100%" stopColor={Colors.primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {areaPath ? (
          <>
            <Path d={areaPath} fill="url(#areaGradient)" />
            <Path d={linePath} stroke={Colors.primaryBright} strokeWidth={2} fill="none" />
          </>
        ) : null}
      </Svg>
      <View style={[styles.labelRow, { width }]}>
        {LABEL_HOURS.map((h) => {
          const pct = (h - minHour) / hourRange;
          if (pct < 0 || pct > 1) return null;
          return (
            <Text
              key={h}
              style={[styles.label, { left: pct * width - 20 }]}
            >
              {LABEL_MAP[h]}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    position: 'relative',
    height: 20,
    marginTop: 4,
  },
  label: {
    position: 'absolute',
    fontSize: 11,
    color: Colors.textMuted,
    width: 40,
    textAlign: 'center',
  },
});
