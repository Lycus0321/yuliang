import { LinearGradient } from 'expo-linear-gradient';
import {
  CloudCheck,
  Nfc,
  Pencil,
  Scale,
  SquarePen,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { colors, radii, rgba, shadow } from '../theme';
import type { Spool } from '../types';

type Props = {
  layout?: 'grid' | 'list';
  spool: Spool;
  onPress: () => void;
  onEdit?: () => void;
  onWeigh?: () => void;
  style?: ViewStyle | ViewStyle[];
};

function spoolName(spool: Spool) {
  return spool.displayName || spool.filamentName || spool.filamentType || '未命名耗材';
}

function location(spool: Spool) {
  if (!spool.inPrinter) return '';
  if (spool.slotId === 255 || spool.amsType === 0) return '外置';
  const ams =
    typeof spool.amsId === 'number'
      ? spool.amsId >= 128
        ? 'AMS HT'
        : `AMS ${spool.amsId + 1}`
      : 'AMS';
  const slot = typeof spool.slotId === 'number' ? `${spool.slotId + 1} 号位` : '';
  return [ams, slot].filter(Boolean).join(' · ');
}

function colorValue(spool: Spool) {
  const value = spool.color || '#68726C';
  return value.startsWith('#') ? value : `#${value}`;
}

export function SpoolCard({
  layout = 'grid',
  spool,
  onPress,
  onEdit,
  onWeigh,
  style,
}: Props) {
  const { width } = useWindowDimensions();
  const compactList = width < 640;
  const editAction = onEdit || onPress;
  const weighAction = onWeigh || onPress;
  const [hovered, setHovered] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<'weigh' | 'edit' | null>(null);
  const lift = useRef(new Animated.Value(0)).current;
  const total = Math.max(1, spool.totalNetWeight || 1000);
  const remaining = Math.max(0, Math.round(spool.netWeight || 0));
  const percent = Math.max(0, Math.min(100, (remaining / total) * 100));
  const rfid = spool.createType !== 'manual';
  const locationLabel = location(spool);
  const accent = colorValue(spool);
  const gradientColors = [
    rgba(accent, 0.3),
    rgba(accent, 0.11),
    'rgba(255,255,255,0.92)',
  ] as const;

  const updateHover = (value: boolean) => {
    setHovered(value);
    Animated.timing(lift, {
      toValue: value ? 1 : 0,
      duration: 180,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: true,
    }).start();
  };

  const translateY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -1] });
  const quickActions = (
    <View style={styles.quickActions}>
      <View style={styles.quickActionWrap}>
        <Pressable
          accessibilityLabel="称重"
          accessibilityHint="打开这盘耗材的重量校准"
          accessibilityRole="button"
          hitSlop={10}
          onHoverIn={() => setHoveredAction('weigh')}
          onHoverOut={() => setHoveredAction(null)}
          onPress={weighAction}
          style={({ pressed }) => [
            styles.quickButton,
            styles.quickButtonPrimary,
            pressed && styles.pressed,
          ]}
        >
          <Scale color={colors.primary} size={16} strokeWidth={1.7} />
        </Pressable>
        {hoveredAction === 'weigh' ? (
          <View pointerEvents="none" style={styles.quickTooltip}>
            <Text style={styles.quickTooltipText}>称重</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.quickActionWrap}>
        <Pressable
          accessibilityLabel="编辑"
          accessibilityHint="打开这盘耗材的基本信息"
          accessibilityRole="button"
          hitSlop={10}
          onHoverIn={() => setHoveredAction('edit')}
          onHoverOut={() => setHoveredAction(null)}
          onPress={editAction}
          style={({ pressed }) => [styles.quickButton, pressed && styles.pressed]}
        >
          <SquarePen color={colors.muted} size={16} strokeWidth={1.7} />
        </Pressable>
        {hoveredAction === 'edit' ? (
          <View pointerEvents="none" style={styles.quickTooltip}>
            <Text style={styles.quickTooltipText}>编辑</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (layout === 'list') {
    return (
      <Animated.View
        style={[
          styles.shell,
          styles.shellList,
          style,
          {
            transform: [{ translateY }],
            shadowOpacity: hovered ? 0.12 : 0.06,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${spoolName(spool)}，剩余 ${remaining} 克`}
          onHoverIn={() => updateHover(true)}
          onHoverOut={() => updateHover(false)}
          onPress={onPress}
          style={({ pressed }) => [styles.card, styles.cardList, pressed && styles.pressed]}
        >
          <LinearGradient
            colors={gradientColors}
            end={{ x: 1, y: 1 }}
            pointerEvents="none"
            start={{ x: 0, y: 0 }}
            style={styles.cardGradient}
          />
          <View style={styles.listRow}>
            <View style={styles.listPrimary}>
              <View style={[styles.titleSwatch, { backgroundColor: accent }]}>
                <View style={styles.titleSwatchCore} />
              </View>
              <View style={styles.titleWrap}>
                <Text numberOfLines={1} style={styles.title}>
                  {spoolName(spool)}
                </Text>
                <Text numberOfLines={1} style={styles.subline}>
                  {spool.filamentVendor || '未知品牌'} ·{' '}
                  {spool.filamentName || spool.filamentType || '未知材质'}
                </Text>
                {compactList ? (
                  <View style={styles.listCompactMeta}>
                    {locationLabel ? (
                      <Text numberOfLines={1} style={styles.listLocation}>
                        {locationLabel}
                      </Text>
                    ) : null}
                    {remaining === 0 ? (
                      <Text style={styles.listCompactEmpty}>已用尽</Text>
                    ) : null}
                    <View
                      style={[
                        styles.listCompactMode,
                        rfid && styles.listCompactModeRfid,
                      ]}
                    >
                      {rfid ? (
                        <Nfc color={colors.primary} size={11} strokeWidth={1.7} />
                      ) : (
                        <Pencil color={colors.muted} size={10} strokeWidth={1.7} />
                      )}
                      <Text
                        style={[
                          styles.listCompactModeText,
                          rfid && styles.listCompactModeTextRfid,
                        ]}
                      >
                        {rfid ? 'RFID' : '手动'}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>

            {!compactList ? (
              <View style={styles.listMeta}>
                {locationLabel ? (
                  <View style={styles.locationBadge}>
                    <CloudCheck color={colors.primary} size={13} strokeWidth={1.8} />
                    <Text style={styles.locationText}>{locationLabel}</Text>
                  </View>
                ) : null}
                <View style={styles.listModeRow}>
                  {remaining === 0 ? (
                    <View style={[styles.mode, styles.modeEmpty]}>
                      <Text style={[styles.modeText, styles.modeTextEmpty]}>已用尽</Text>
                    </View>
                  ) : null}
                  <View style={[styles.mode, rfid && styles.modeRfid]}>
                    {rfid ? (
                      <Nfc color={colors.primary} size={14} strokeWidth={1.7} />
                    ) : (
                      <Pencil color={colors.muted} size={13} strokeWidth={1.7} />
                    )}
                    <Text style={[styles.modeText, rfid && styles.modeTextRfid]}>
                      {rfid ? 'RFID' : '手动'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            <View style={[styles.listMetric, compactList && styles.listMetricCompact]}>
              <View style={[styles.metric, styles.metricList]}>
                <Text style={[styles.grams, styles.listGrams]}>{remaining}</Text>
                <Text style={styles.unit}>g</Text>
                <Text style={styles.percent}>{Math.round(percent)}%</Text>
              </View>
              <View style={styles.progress}>
                <View
                  style={[
                    styles.progressFill,
                    remaining === 0 && styles.progressEmpty,
                    { width: `${percent}%` as `${number}%` },
                  ]}
                />
              </View>
            </View>

          </View>
        </Pressable>
        {quickActions}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.shell,
        style,
        {
          transform: [{ translateY }],
          shadowOpacity: hovered ? 0.12 : 0.06,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${spoolName(spool)}，剩余 ${remaining} 克`}
        onHoverIn={() => updateHover(true)}
        onHoverOut={() => updateHover(false)}
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <LinearGradient
          colors={gradientColors}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          style={styles.cardGradient}
        />

        <View style={styles.body}>
          <View style={styles.head}>
            <View
              style={[
                styles.titleSwatch,
                { backgroundColor: accent },
              ]}
            >
              <View style={styles.titleSwatchCore} />
            </View>
            <View style={styles.titleWrap}>
              <Text numberOfLines={1} style={styles.title}>
                {spoolName(spool)}
              </Text>
              <Text numberOfLines={1} style={styles.subline}>
                {spool.filamentVendor || '未知品牌'} ·{' '}
                {spool.filamentName || spool.filamentType || '未知材质'}
              </Text>
            </View>
            <View style={styles.headerBadges}>
              {remaining === 0 ? (
                <View style={[styles.mode, styles.modeEmpty]}>
                  <Text style={[styles.modeText, styles.modeTextEmpty]}>
                    已用尽
                  </Text>
                </View>
              ) : null}
              <View style={[styles.mode, rfid && styles.modeRfid]}>
                {rfid ? (
                  <Nfc color={colors.primary} size={14} strokeWidth={1.7} />
                ) : (
                  <Pencil color={colors.muted} size={13} strokeWidth={1.7} />
                )}
                <Text style={[styles.modeText, rfid && styles.modeTextRfid]}>
                  {rfid ? 'RFID' : '手动'}
                </Text>
              </View>
            </View>
          </View>

          {locationLabel ? (
            <View style={styles.meta}>
              <View style={styles.locationBadge}>
                <CloudCheck color={colors.primary} size={13} strokeWidth={1.8} />
                <Text style={styles.locationText}>{locationLabel}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.metric}>
            <Text style={styles.grams}>{remaining}</Text>
            <Text style={styles.unit}>g</Text>
            <Text style={styles.percent}>{Math.round(percent)}%</Text>
          </View>

          <View style={styles.progress}>
            <View
              style={[
                styles.progressFill,
                remaining === 0 && styles.progressEmpty,
                { width: `${percent}%` as `${number}%` },
              ]}
            />
          </View>
        </View>
      </Pressable>
      {quickActions}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: radii.medium,
    shadowColor: '#1A2B23',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  shellList: {
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 12,
  },
  card: {
    borderRadius: radii.medium,
    overflow: 'hidden',
    padding: 13,
    position: 'relative',
  },
  cardList: {
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  cardGradient: {
    ...StyleSheet.absoluteFill,
  },
  pressed: {
    opacity: 0.72,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  listRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingRight: 62,
  },
  listPrimary: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0,
  },
  listMeta: {
    gap: 5,
    width: 180,
  },
  listModeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  listLocation: {
    color: colors.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  listCompactMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  listCompactEmpty: {
    color: colors.danger,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  listCompactMode: {
    alignItems: 'center',
    backgroundColor: 'rgba(29,29,31,0.055)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 3,
    minHeight: 18,
    paddingHorizontal: 5,
  },
  listCompactModeRfid: {
    backgroundColor: colors.mint,
  },
  listCompactModeText: {
    color: colors.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  listCompactModeTextRfid: {
    color: colors.primary,
  },
  listMetric: {
    width: 150,
  },
  listMetricCompact: {
    width: 96,
  },
  metricList: {
    marginTop: 0,
  },
  listGrams: {
    fontSize: 21,
    lineHeight: 25,
  },
  head: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingRight: 62,
  },
  titleSwatch: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: 9,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  titleSwatchCore: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 999,
    borderWidth: 1,
    height: 9,
    width: 9,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 20,
  },
  subline: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  quickActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    position: 'absolute',
    right: 13,
    top: 20,
    zIndex: 2,
  },
  quickActionWrap: {
    position: 'relative',
  },
  quickButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(29,29,31,0.045)',
    borderRadius: 8,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  quickButtonPrimary: {
    backgroundColor: colors.mint,
  },
  quickTooltip: {
    backgroundColor: colors.ink,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    position: 'absolute',
    right: 0,
    top: 29,
    zIndex: 4,
  },
  quickTooltipText: {
    color: colors.white,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  meta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  headerBadges: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginLeft: 'auto',
  },
  locationBadge: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    minHeight: 24,
    paddingHorizontal: 7,
  },
  locationText: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  mode: {
    alignItems: 'center',
    backgroundColor: 'rgba(29,29,31,0.055)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    marginLeft: 'auto',
    minHeight: 24,
    paddingHorizontal: 7,
  },
  modeRfid: {
    backgroundColor: colors.mint,
  },
  modeEmpty: {
    backgroundColor: colors.dangerSoft,
  },
  modeText: {
    color: colors.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 16,
  },
  modeTextRfid: {
    color: colors.primary,
  },
  modeTextEmpty: {
    color: colors.danger,
  },
  metric: {
    alignItems: 'baseline',
    flexDirection: 'row',
    marginTop: 9,
  },
  grams: {
    fontFamily: 'Inter_700Bold',
    fontSize: 25,
    letterSpacing: -0.02,
    lineHeight: 29,
  },
  unit: {
    color: colors.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginLeft: 2,
  },
  percent: {
    color: colors.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    marginLeft: 'auto',
  },
  progress: {
    backgroundColor: 'rgba(29,29,31,0.08)',
    borderRadius: 999,
    height: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: '100%',
  },
  progressEmpty: {
    backgroundColor: colors.danger,
  },
});
