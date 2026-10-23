import { Layers3, Palette, Ruler, Weight } from 'lucide-react-native';
import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { CatalogManagerView } from '../components/CatalogManagerModal';
import { brandOptions, filamentCatalog } from '../catalog';
import type { AppPreferences } from '../preferences';
import { colors, radii, type } from '../theme';
import type { CatalogEntry } from '../types';

type Props = {
  catalog: CatalogEntry[];
  presets: CatalogEntry[];
  preferences: AppPreferences;
  onChange: (preferences: AppPreferences) => void;
};

export function CatalogView({ catalog, presets, preferences, onChange }: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 760;

  const stats = useMemo(() => {
    const officialBrands = [
      ...new Set([...catalog, ...presets].map((entry) => entry.vendor).filter(Boolean)),
    ];
    const resolvedBrands = officialBrands.length ? officialBrands : brandOptions;
    const allBrands = new Set([
      ...resolvedBrands,
      ...preferences.customBrands,
      ...Object.keys(preferences.customTypes),
    ]);
    const allTypes = new Set<string>();
    for (const entry of [...catalog, ...presets]) {
      if (entry.vendor && entry.name) allTypes.add(`${entry.vendor}/${entry.name}`);
    }
    if (!catalog.length && !presets.length) {
      for (const [brand, types] of Object.entries(filamentCatalog)) {
        for (const item of types) allTypes.add(`${brand}/${item}`);
      }
    }
    for (const [brand, types] of Object.entries(preferences.customTypes)) {
      for (const item of types) allTypes.add(`${brand}/${item}`);
    }
    const colors =
      preferences.customColors.length +
      Object.values(preferences.customTypeColors).reduce(
        (count, items) => count + items.length,
        0,
      );
    return {
      brands: allBrands.size,
      types: allTypes.size,
      colors,
      tareDefaults: Object.keys(preferences.typeTareDefaults).length,
    };
  }, [
    catalog,
    presets,
    preferences.customBrands,
    preferences.customColors,
    preferences.customTypeColors,
    preferences.customTypes,
    preferences.typeTareDefaults,
  ]);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.pageHead}>
          <View style={styles.pageHeadCopy}>
            <Text style={styles.breadcrumb}>耗材管理</Text>
            <Text style={styles.title}>耗材目录</Text>
            <Text style={styles.subtitle}>
              统一维护品牌、型号、颜色和默认空盘皮重，编辑料盘时直接联动。
            </Text>
          </View>
        </View>

        <View style={[styles.stats, compact && styles.statsCompact]}>
          <Metric icon={<Layers3 color={colors.primary} size={18} />} label="品牌" value={stats.brands} />
          <Metric icon={<Ruler color={colors.primary} size={18} />} label="型号" value={stats.types} />
          <Metric icon={<Palette color={colors.primary} size={18} />} label="自定义颜色" value={stats.colors} />
          <Metric icon={<Weight color={colors.primary} size={18} />} label="型号默认皮重" value={stats.tareDefaults} />
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            隐藏品牌会联动隐藏其型号和颜色。目录调整只影响后续选择，不会修改已有料盘。
          </Text>
        </View>

        <CatalogManagerView
          embedded
          catalog={catalog}
          onChange={onChange}
          preferences={preferences}
          presets={presets}
        />
      </View>
    </ScrollView>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricIcon}>{icon}</View>
      <View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 44,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 1200,
    paddingHorizontal: 24,
    paddingTop: 10,
    width: '100%',
  },
  pageHead: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 76,
  },
  pageHeadCopy: {
    flex: 1,
    minWidth: 0,
  },
  breadcrumb: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  title: {
    ...type.display,
    color: colors.ink,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 3,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  statsCompact: {
    flexWrap: 'wrap',
  },
  metric: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 11,
    minWidth: 150,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  metricIcon: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: 9,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  metricValue: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 21,
    lineHeight: 24,
  },
  metricLabel: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  notice: {
    backgroundColor: colors.mint,
    borderRadius: radii.medium,
    marginBottom: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  noticeText: {
    color: colors.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
  },
});
