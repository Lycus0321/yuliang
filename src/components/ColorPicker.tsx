import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { colors, radii, shadow } from '../theme';

const colorSwatches = [
  '#000000',
  '#3A3A3C',
  '#8E8E93',
  '#C7C7CC',
  '#FFFFFF',
  '#D6001C',
  '#FF3B30',
  '#FF6A13',
  '#FF9016',
  '#FCE300',
  '#C2E189',
  '#61C680',
  '#00AE42',
  '#68724D',
  '#00B1B7',
  '#56B7E6',
  '#0086D6',
  '#0056B8',
  '#0A2989',
  '#5B6579',
  '#8A75D1',
  '#69398E',
  '#FABBCB',
  '#9D432C',
  '#4F2C1D',
  '#875718',
  '#A6A9AA',
  '#D1D3D5',
  '#7F7E83',
  '#034638',
];

type Hsv = {
  h: number;
  s: number;
  v: number;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function ColorPicker({ value, onChange }: Props) {
  const parsedValue = parseHex(value);
  const normalized = parsedValue || '#808080';
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(normalized));
  const hsvRef = useRef(hsv);
  const panelSize = useRef({ height: 1, width: 1 });
  const hueWidth = useRef(1);
  const lastEmitted = useRef(normalized);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!parsedValue || parsedValue === lastEmitted.current) return;
    const next = hexToHsv(parsedValue);
    hsvRef.current = next;
    lastEmitted.current = parsedValue;
    setHsv(next);
  }, [parsedValue]);

  const emitRef = useRef((next: Hsv) => {});
  emitRef.current = (next: Hsv) => {
    hsvRef.current = next;
    setHsv(next);
    const hex = hsvToHex(next);
    lastEmitted.current = hex;
    onChangeRef.current(hex);
  };

  const updateSaturationRef = useRef((x: number, y: number) => {});
  updateSaturationRef.current = (x: number, y: number) => {
    const saturation = clamp(x / panelSize.current.width, 0, 1);
    const brightness = clamp(1 - y / panelSize.current.height, 0, 1);
    emitRef.current({
      ...hsvRef.current,
      s: saturation,
      v: brightness,
    });
  };

  const updateHueRef = useRef((x: number) => {});
  updateHueRef.current = (x: number) => {
    emitRef.current({
      ...hsvRef.current,
      h: clamp(x / hueWidth.current, 0, 1) * 360,
    });
  };

  const saturationResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => updateFromEvent(event, updateSaturationRef.current),
      onPanResponderMove: (event) => updateFromEvent(event, updateSaturationRef.current),
    }),
  ).current;

  const hueResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        updateHueRef.current(event.nativeEvent.locationX);
      },
      onPanResponderMove: (event) => {
        updateHueRef.current(event.nativeEvent.locationX);
      },
    }),
  ).current;

  const thumbLeft = `${hsv.s * 100}%` as const;
  const thumbTop = `${(1 - hsv.v) * 100}%` as const;
  const hueLeft = `${(hsv.h / 360) * 100}%` as const;

  const selectPreset = (hex: string) => {
    const next = hexToHsv(hex);
    hsvRef.current = next;
    lastEmitted.current = hex;
    setHsv(next);
    onChange(hex);
  };

  const changeHex = (next: string) => {
    const upper = next.toUpperCase();
    onChange(upper);
    const parsed = parseHex(upper);
    if (parsed) {
      const nextHsv = hexToHsv(parsed);
      hsvRef.current = nextHsv;
      lastEmitted.current = parsed;
      setHsv(nextHsv);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <Text style={styles.label}>颜色选择</Text>
        <Text style={styles.value}>{normalized}</Text>
      </View>

      <View
        {...saturationResponder.panHandlers}
        accessibilityLabel="颜色饱和度和明度选择区"
        accessibilityRole="adjustable"
        accessibilityValue={{ text: normalized }}
        onLayout={(event) => {
          panelSize.current = {
            height: event.nativeEvent.layout.height,
            width: event.nativeEvent.layout.width,
          };
        }}
        style={[
          styles.saturationPanel,
          { backgroundColor: hsvToHex({ h: hsv.h, s: 1, v: 1 }) },
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', 'rgba(255,255,255,0)']}
          end={{ x: 1, y: 0 }}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0)', '#000000']}
          end={{ x: 0, y: 1 }}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              backgroundColor: normalized,
              left: thumbLeft,
              top: thumbTop,
            },
          ]}
        />
      </View>

      <View
        {...hueResponder.panHandlers}
        accessibilityLabel="色相选择条"
        accessibilityRole="adjustable"
        onLayout={(event) => {
          hueWidth.current = event.nativeEvent.layout.width;
        }}
        style={styles.hueTouch}
      >
        <View style={styles.hueTrack}>
          <LinearGradient
            colors={[
              '#FF0000',
              '#FFFF00',
              '#00FF00',
              '#00FFFF',
              '#0000FF',
              '#FF00FF',
              '#FF0000',
            ]}
            end={{ x: 1, y: 0 }}
            pointerEvents="none"
            start={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[
              styles.hueThumb,
              {
                backgroundColor: hsvToHex({ h: hsv.h, s: 1, v: 1 }),
                left: hueLeft,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.hexRow}>
        <Text style={styles.hexLabel}>HEX 色值（可选）</Text>
        <TextInput
          accessibilityLabel="HEX 色值"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          onChangeText={changeHex}
          placeholder="#RRGGBB"
          placeholderTextColor={colors.muted}
          selectionColor={colors.primary}
          style={styles.input}
          underlineColorAndroid="transparent"
          value={value}
        />
      </View>

      <View>
        <Text style={styles.presetLabel}>常用颜色</Text>
        <View style={styles.swatches}>
          {colorSwatches.map((hex) => {
            const selected = normalized === hex;
            return (
              <Pressable
                accessibilityLabel={`选择颜色 ${hex}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                hitSlop={6}
                key={hex}
                onPress={() => selectPreset(hex)}
                style={({ pressed }) => [
                  styles.swatch,
                  { backgroundColor: hex },
                  selected && styles.swatchSelected,
                  pressed && styles.pressed,
                ]}
              >
                {selected ? (
                  <Check
                    color={isLightColor(hex) ? colors.ink : colors.white}
                    size={15}
                    strokeWidth={2.4}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function updateFromEvent(
  event: GestureResponderEvent,
  update: (x: number, y: number) => void,
) {
  update(event.nativeEvent.locationX, event.nativeEvent.locationY);
}

function parseHex(value: string) {
  const clean = value.replace('#', '').trim();
  return /^[0-9A-Fa-f]{6}$/.test(clean) ? `#${clean.toUpperCase()}` : null;
}

function normalizeHex(value: string) {
  return parseHex(value) || '#808080';
}

function hsvToHex({ h, s, v }: Hsv) {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 1);
  const brightness = clamp(v, 0, 1);
  const chroma = brightness * saturation;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const offset = brightness - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment < 1) [red, green] = [chroma, secondary];
  else if (segment < 2) [red, green] = [secondary, chroma];
  else if (segment < 3) [green, blue] = [chroma, secondary];
  else if (segment < 4) [green, blue] = [secondary, chroma];
  else if (segment < 5) [red, blue] = [secondary, chroma];
  else [red, blue] = [chroma, secondary];

  return `#${[red, green, blue]
    .map((channel) =>
      Math.round((channel + offset) * 255)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase(),
    )
    .join('')}`;
}

function hexToHsv(hex: string): Hsv {
  const clean = normalizeHex(hex).replace('#', '');
  const value = Number.parseInt(clean, 16);
  const red = ((value >> 16) & 255) / 255;
  const green = ((value >> 8) & 255) / 255;
  const blue = (value & 255) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;

  let hue = 0;
  if (delta) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }

  return {
    h: hue < 0 ? hue + 360 : hue,
    s: maximum ? delta / maximum : 0,
    v: maximum,
  };
}

function isLightColor(hex: string) {
  const clean = normalizeHex(hex).replace('#', '');
  const value = Number.parseInt(clean, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return red * 0.299 + green * 0.587 + blue * 0.114 > 170;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radii.input,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  value: {
    color: colors.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  saturationPanel: {
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    height: 156,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: {
    borderColor: colors.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
    position: 'absolute',
    width: 20,
    ...shadow,
  },
  hueTrack: {
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    height: 22,
    position: 'relative',
  },
  hueTouch: {
    height: 44,
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  hueThumb: {
    borderColor: colors.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 26,
    marginLeft: -13,
    marginTop: -3,
    position: 'absolute',
    width: 26,
    ...shadow,
  },
  hexRow: {
    alignItems: 'stretch',
    gap: 6,
  },
  hexLabel: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.input,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    minHeight: 44,
    outlineWidth: 0,
    paddingHorizontal: 11,
    width: '100%',
  },
  presetLabel: {
    color: colors.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    marginBottom: 8,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatch: {
    alignItems: 'center',
    borderColor: 'rgba(29,29,31,0.12)',
    borderRadius: 9,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  swatchSelected: {
    borderColor: colors.ink,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.68,
  },
});
