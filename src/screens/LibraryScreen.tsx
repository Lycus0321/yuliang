import {
  AlertTriangle,
  LogOut,
  Package,
  RefreshCw,
  Scale,
  Search,
  SlidersHorizontal,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SpoolCard } from '../components/SpoolCard';
import { colors, radii, type } from '../theme';
import type { Session, Spool } from '../types';

type Filter = 'all' | 'loaded' | 'low';

type Props = {
  session: Session;
  spools: Spool[];
  loading: boolean;
  refreshing: boolean;
  error: string;
  onRefresh: () => void;
  onSelect: (spool: Spool) => void;
  onLogout: () => void;
};

function totalRemaining(spools: Spool[]) {
  return spools.reduce((sum, spool) => sum + Math.max(0, spool.netWeight || 0), 0);
}

function formatKg(grams: number) {
  return (grams / 1000).toFixed(grams >= 10000 ? 1 : 2);
}

export function LibraryScreen({
  session,
  spools,
  loading,
  refreshing,
  error,
  onRefresh,
  onSelect,
  onLogout,
}: Props) {
  const { width } = useWindowDimensions();
  const desktop = width >= 840;
  const columns = desktop ? 2 : 1;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return spools.filter((spool) => {
      if (filter === 'loaded' && !spool.inPrinter) return false;
      if (filter === 'low' && (spool.netWeight || 0) > 250) return false;
      if (!normalized) return true;
      return [
        spool.displayName,
        spool.filamentName,
        spool.filamentVendor,
        spool.filamentType,
        spool.note,
        spool.deviceName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [filter, query, spools]);

  const total = totalRemaining(spools);
  const lowCount = spools.filter((spool) => (spool.netWeight || 0) <= 250).length;
  const loadedCount = spools.filter((spool) => spool.inPrinter).length;

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('退出当前拓竹账号？')) {
        onLogout();
      }
      return;
    }
    const { Alert } = require('react-native') as typeof import('react-native');
    Alert.alert('退出账号', '本机保存的登录令牌将被删除。', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: onLogout },
    ]);
  };

  const header = (
    <View>
      <View style={styles.utilityRow}>
        <View style={styles.brandWrap}>
          <View style={styles.brandMark}>
            <Scale color={colors.white} size={15} strokeWidth={2.2} />
          </View>
          <Text style={styles.brand}>余量</Text>
        </View>
        <View style={styles.utilityActions}>
          {session.demo ? (
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>演示</Text>
            </View>
          ) : (
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>云端已连接</Text>
            </View>
          )}
          <Pressable
            accessibilityLabel="刷新耗材库"
            onPress={onRefresh}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <RefreshCw color={colors.ink} size={18} />
          </Pressable>
          <Pressable
            accessibilityLabel="退出账号"
            onPress={confirmLogout}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <LogOut color={colors.ink} size={18} />
          </Pressable>
        </View>
      </View>

      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>耗材余量</Text>
          <Text style={styles.subtitle}>
            {session.demo ? '本地演示数据' : session.email || '拓竹云端耗材库'}
          </Text>
        </View>
        <View style={styles.spoolCount}>
          <Package color={colors.primary} size={15} />
          <Text style={styles.spoolCountText}>{spools.length} 盘</Text>
        </View>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryMain}>
          <Text style={styles.summaryLabel}>当前总余量</Text>
          <View style={styles.summaryValueRow}>
            <Text style={styles.summaryValue}>{formatKg(total)}</Text>
            <Text style={styles.summaryUnit}>kg</Text>
          </View>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryStat}>
          <Text style={styles.summaryStatValue}>{loadedCount}</Text>
          <Text style={styles.summaryStatLabel}>已装入</Text>
        </View>
        <View style={styles.summaryStat}>
          <Text style={[styles.summaryStatValue, lowCount > 0 && styles.lowValue]}>
            {lowCount}
          </Text>
          <Text style={styles.summaryStatLabel}>低余量</Text>
        </View>
      </View>

      <View style={styles.search}>
        <Search color={colors.muted} size={17} />
        <TextInput
          autoCapitalize="none"
          onChangeText={setQuery}
          placeholder="搜索品牌、材质、颜色"
          placeholderTextColor="#939B95"
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
        />
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterChips}>
          <FilterChip label="全部" active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterChip
            label="已装入"
            active={filter === 'loaded'}
            onPress={() => setFilter('loaded')}
          />
          <FilterChip
            label="低余量"
            active={filter === 'low'}
            onPress={() => setFilter('low')}
          />
        </View>
        <SlidersHorizontal color={colors.muted} size={15} />
      </View>
    </View>
  );

  return (
    <View style={styles.page}>
      {error ? (
        <View style={styles.errorBanner}>
          <AlertTriangle color={colors.danger} size={16} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={onRefresh}>
            <Text style={styles.retryText}>重试</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        key={`spool-grid-${columns}`}
        columnWrapperStyle={desktop ? styles.columnWrapper : undefined}
        contentContainerStyle={[styles.listContent, desktop && styles.listContentDesktop]}
        data={filtered}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          loading ? undefined : (
            <View style={styles.empty}>
              <Package color={colors.muted} size={30} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>没有匹配的耗材</Text>
              <Text style={styles.emptyText}>
                {spools.length ? '调整搜索或筛选条件。' : '拓竹云端耗材库中还没有料盘。'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          spools.length ? (
            <View style={styles.footer}>
              <LogOut color={colors.muted} size={13} />
              <Text style={styles.footerText}>
                点击任意料盘，输入称重结果后会直接写回拓竹云。
              </Text>
            </View>
          ) : undefined
        }
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <View style={desktop ? styles.gridItem : undefined}>
            <SpoolCard spool={item} onPress={() => onSelect(item)} />
          </View>
        )}
        numColumns={columns}
        showsVerticalScrollIndicator={false}
      />

      {loading && !spools.length ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>正在读取云端耗材库</Text>
        </View>
      ) : null}
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active && styles.filterChipActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.background,
    flex: 1,
  },
  listContent: {
    alignSelf: 'center',
    maxWidth: 680,
    paddingBottom: 34,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'web' ? 24 : 55,
    width: '100%',
  },
  listContentDesktop: {
    maxWidth: 1120,
    paddingHorizontal: 30,
    paddingTop: 32,
  },
  columnWrapper: {
    gap: 12,
  },
  gridItem: {
    flex: 1,
    maxWidth: '49.4%',
  },
  utilityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brandWrap: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.small,
    height: 29,
    justifyContent: 'center',
    width: 29,
  },
  brand: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginLeft: 8,
  },
  utilityActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  onlineBadge: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  onlineDot: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    height: 5,
    width: 5,
  },
  onlineText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 13,
  },
  demoBadge: {
    backgroundColor: colors.orangeSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  demoBadgeText: {
    color: colors.orange,
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 13,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.small,
    borderWidth: 1,
    height: 35,
    justifyContent: 'center',
    width: 35,
  },
  pressed: {
    opacity: 0.58,
  },
  titleRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 26,
  },
  title: {
    ...type.display,
    color: colors.ink,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  spoolCount: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingBottom: 3,
  },
  spoolCountText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  summary: {
    alignItems: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: radii.medium,
    flexDirection: 'row',
    marginTop: 20,
    padding: 17,
  },
  summaryMain: {
    flex: 1,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },
  summaryValueRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    marginTop: 4,
  },
  summaryValue: {
    color: colors.white,
    fontSize: 31,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 34,
  },
  summaryUnit: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 2,
    marginLeft: 4,
  },
  summaryDivider: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginHorizontal: 14,
    width: 1,
  },
  summaryStat: {
    justifyContent: 'center',
    minWidth: 50,
  },
  summaryStatValue: {
    color: colors.white,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 23,
  },
  lowValue: {
    color: '#FFC2A9',
  },
  summaryStatLabel: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 9,
    lineHeight: 13,
    marginTop: 2,
  },
  search: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginTop: 18,
    paddingHorizontal: 13,
  },
  searchInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    minHeight: 43,
    paddingVertical: 0,
  },
  filterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 13,
    marginTop: 12,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 7,
  },
  filterChip: {
    backgroundColor: '#E7E9E3',
    borderRadius: radii.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: colors.ink,
  },
  filterText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  filterTextActive: {
    color: colors.white,
  },
  separator: {
    height: 9,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 54,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 12,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  footerText: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 9,
    lineHeight: 14,
  },
  loading: {
    alignItems: 'center',
    backgroundColor: colors.background,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  errorBanner: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.medium,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 18,
    marginTop: 8,
    maxWidth: 644,
    padding: 11,
    width: '100%',
  },
  errorText: {
    color: colors.danger,
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },
  retryText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
});
