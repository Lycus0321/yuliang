import {
  AlertTriangle,
  Check,
  ChevronDown,
  Layers3,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SpoolCard } from '../components/SpoolCard';
import { colors, radii, type } from '../theme';
import type { Spool, SpoolEditorTab } from '../types';

export type Filter = 'all' | 'loaded' | 'low' | 'depleted';
export type SortMode = 'default' | 'weightAsc' | 'weightDesc' | 'name';
export type ViewMode = 'grid' | 'list';

export type LibraryViewState = {
  query: string;
  filter: Filter;
  material: string;
  sort: SortMode;
  viewMode: ViewMode;
};

export const defaultLibraryViewState: LibraryViewState = {
  query: '',
  filter: 'all',
  material: 'all',
  sort: 'default',
  viewMode: 'grid',
};

const sortOptions: { id: SortMode; label: string }[] = [
  { id: 'default', label: '默认排序' },
  { id: 'weightAsc', label: '余量从少到多' },
  { id: 'weightDesc', label: '余量从多到少' },
  { id: 'name', label: '名称排序' },
];

const materialOrder = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'PC', 'PA', '其他'];

function materialGroup(spool: Spool) {
  const value = `${spool.filamentType || ''} ${spool.filamentName || ''}`.toUpperCase();
  if (value.includes('PLA')) return 'PLA';
  if (value.includes('PETG')) return 'PETG';
  if (value.includes('ABS')) return 'ABS';
  if (value.includes('ASA')) return 'ASA';
  if (value.includes('TPU')) return 'TPU';
  if (value.includes('PC')) return 'PC';
  if (value.includes('PA')) return 'PA';
  return '其他';
}

type Props = {
  state: LibraryViewState;
  spools: Spool[];
  loading: boolean;
  refreshing: boolean;
  error: string;
  onRefresh: () => void;
  onOpenSpool: (spool: Spool, tab?: SpoolEditorTab) => void;
  onStateChange: (state: LibraryViewState) => void;
};

export function LibraryView({
  state,
  spools,
  loading,
  refreshing,
  error,
  onRefresh,
  onOpenSpool,
  onStateChange,
}: Props) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 48, 1200);
  const columns = contentWidth >= 1000 ? 3 : contentWidth >= 680 ? 2 : 1;
  const compact = contentWidth < 680;
  const { filter, material, query, sort, viewMode } = state;
  const [sortOpen, setSortOpen] = useState(false);
  const updateState = (patch: Partial<LibraryViewState>) => {
    onStateChange({ ...state, ...patch });
  };
  const availableMaterials = useMemo(
    () => materialOrder.filter((item) => spools.some((spool) => materialGroup(spool) === item)),
    [spools],
  );

  useEffect(() => {
    if (material !== 'all' && !availableMaterials.includes(material)) {
      onStateChange({ ...state, material: 'all' });
    }
  }, [availableMaterials, material, onStateChange, state]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return spools.filter((spool) => {
      const depleted = (spool.netWeight || 0) <= 0;
      if (filter === 'depleted' && !depleted) return false;
      if (filter !== 'depleted' && depleted) return false;
      if (filter === 'loaded' && !spool.inPrinter) return false;
      if (filter === 'low' && (spool.netWeight || 0) > 250) return false;
      if (material !== 'all' && materialGroup(spool) !== material) return false;
      if (!normalized) return true;
      return [
        spool.displayName,
        spool.filamentName,
        spool.filamentVendor,
        spool.filamentType,
        spool.color,
        ...(spool.colors || []),
        spool.note,
        spool.deviceName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [filter, material, query, spools]);

  const grouped = useMemo(() => {
    const map = new Map<string, Spool[]>();
    const sorted = [...filtered].sort((left, right) => {
      if (sort === 'weightAsc') return (left.netWeight || 0) - (right.netWeight || 0);
      if (sort === 'weightDesc') return (right.netWeight || 0) - (left.netWeight || 0);
      if (sort === 'name') {
        return (left.displayName || left.filamentName || '').localeCompare(
          right.displayName || right.filamentName || '',
          'zh-CN',
        );
      }
      return 0;
    });
    for (const spool of sorted) {
      const group = materialGroup(spool);
      map.set(group, [...(map.get(group) || []), spool]);
    }
    return [...map.entries()].sort(([left], [right]) => {
      const leftIndex = materialOrder.indexOf(left);
      const rightIndex = materialOrder.indexOf(right);
      if (leftIndex >= 0 || rightIndex >= 0) {
        return (leftIndex < 0 ? 999 : leftIndex) - (rightIndex < 0 ? 999 : rightIndex);
      }
      return left.localeCompare(right);
    });
  }, [filtered, sort]);

  const activeSpools = spools.filter((spool) => (spool.netWeight || 0) > 0);
  const depletedCount = spools.length - activeSpools.length;
  const total = activeSpools.reduce((sum, spool) => sum + (spool.netWeight || 0), 0);
  const loadedCount = activeSpools.filter((spool) => spool.inPrinter).length;
  const lowCount = activeSpools.filter((spool) => (spool.netWeight || 0) <= 250).length;
  const materials = new Set(activeSpools.map(materialGroup)).size;
  const sortLabel = sortOptions.find((option) => option.id === sort)?.label || '排序';

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          colors={[colors.primary]}
          onRefresh={onRefresh}
          refreshing={refreshing}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.breadcrumb}>耗材管理</Text>
            <Text style={styles.title}>耗材库</Text>
          </View>
          <View style={styles.headingActions}>
            {!compact ? (
              <View style={styles.search}>
                <Search color={colors.muted} size={17} strokeWidth={1.7} />
                <TextInput
                  accessibilityLabel="搜索耗材"
                  onChangeText={(query) => updateState({ query })}
                  placeholder="搜索品牌、类型或颜色"
                  placeholderTextColor={colors.muted}
                  style={styles.searchInput}
                  value={query}
                />
              </View>
            ) : null}
            <Pressable
              accessibilityLabel="刷新耗材库"
              onPress={onRefresh}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <RefreshCw color={colors.ink} size={18} strokeWidth={1.7} />
            </Pressable>
            <Pressable
              disabled={loading}
              onPress={onRefresh}
              style={({ pressed }) => [
                styles.syncButton,
                pressed && styles.syncButtonPressed,
                loading && styles.disabled,
              ]}
            >
              <RefreshCw color={colors.white} size={18} strokeWidth={1.8} />
              <Text style={styles.syncText}>同步云端</Text>
            </Pressable>
          </View>
        </View>

        {compact ? (
          <View style={[styles.search, styles.searchMobile]}>
            <Search color={colors.muted} size={17} strokeWidth={1.7} />
            <TextInput
              accessibilityLabel="搜索耗材"
              onChangeText={(query) => updateState({ query })}
              placeholder="搜索品牌、类型或颜色"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              value={query}
            />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <AlertTriangle color={colors.danger} size={17} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={onRefresh}>
              <Text style={styles.retry}>重试</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.overview, compact && styles.overviewCompact]}>
          <View style={styles.overviewMain}>
            <Text style={styles.overviewLabel}>当前剩余总量</Text>
            <View style={styles.overviewValueRow}>
              <Text style={styles.overviewValue}>{(total / 1000).toFixed(2)}</Text>
              <Text style={styles.overviewUnit}>kg</Text>
            </View>
            <Text style={styles.overviewMeta}>
              {activeSpools.length} 盘可用，{lowCount} 盘低于 250 g
              {depletedCount ? `，${depletedCount} 盘已用尽` : ''}
            </Text>
          </View>
          <View style={[styles.overviewStats, compact && styles.overviewStatsCompact]}>
            <Stat value={loadedCount} label="已装入设备" />
            <Stat value={lowCount} label="低余量" />
            <Stat value={materials} label="材料类型" />
          </View>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.filters}>
            <FilterChip
              count={activeSpools.length}
              label="全部"
              active={filter === 'all'}
              onPress={() => updateState({ filter: 'all' })}
            />
            <FilterChip
              count={loadedCount}
              label="已装入"
              active={filter === 'loaded'}
              onPress={() => updateState({ filter: 'loaded' })}
            />
            <FilterChip
              count={lowCount}
              label="低余量"
              active={filter === 'low'}
              onPress={() => updateState({ filter: 'low' })}
            />
            <FilterChip
              count={depletedCount}
              label="已用尽"
              active={filter === 'depleted'}
              onPress={() => updateState({ filter: 'depleted' })}
            />
          </View>
          <View style={styles.toolControls}>
            <Pressable
              accessibilityLabel={`排序方式：${sortLabel}`}
              onPress={() => setSortOpen(true)}
              style={({ pressed }) => [styles.sortButton, pressed && styles.pressed]}
            >
              <Text style={styles.sortText}>{sortLabel}</Text>
              <ChevronDown color={colors.muted} size={15} strokeWidth={1.7} />
            </Pressable>
            <View style={styles.viewToggle}>
              <Pressable
                accessibilityLabel="卡片视图"
                accessibilityState={{ selected: viewMode === 'grid' }}
                onPress={() => updateState({ viewMode: 'grid' })}
                style={[
                  styles.viewButton,
                  viewMode === 'grid' && styles.viewButtonActive,
                ]}
              >
                <LayoutGrid
                  color={viewMode === 'grid' ? colors.primary : colors.muted}
                  size={17}
                  strokeWidth={1.7}
                />
              </Pressable>
              <Pressable
                accessibilityLabel="列表视图"
                accessibilityState={{ selected: viewMode === 'list' }}
                onPress={() => updateState({ viewMode: 'list' })}
                style={[
                  styles.viewButton,
                  viewMode === 'list' && styles.viewButtonActive,
                ]}
              >
                <List
                  color={viewMode === 'list' ? colors.primary : colors.muted}
                  size={17}
                  strokeWidth={1.7}
                />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.materialChips}>
          {['all', ...availableMaterials].map((item) => (
            <FilterChip
              key={item}
              label={item === 'all' ? '全部材料' : item}
              active={material === item}
              onPress={() => updateState({ material: item })}
              subtle
            />
          ))}
        </View>

        {loading && !spools.length ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>正在读取云端耗材库</Text>
          </View>
        ) : (
          <View style={styles.groups}>
            {grouped.map(([group, items]) => {
              const remaining = items.reduce(
                (sum, item) => sum + Math.max(0, item.netWeight || 0),
                0,
              );
              return (
                <View key={group} style={styles.group}>
                  <View style={styles.groupHeader}>
                    <View style={styles.groupTitleRow}>
                      <Layers3 color={colors.muted} size={17} strokeWidth={1.7} />
                      <Text style={styles.groupTitle}>{group}</Text>
                      <Text style={styles.groupCount}>{items.length} 盘</Text>
                    </View>
                    <Text style={styles.groupMeta}>剩余 {(remaining / 1000).toFixed(2)} kg</Text>
                  </View>
                  <View style={[styles.grid, viewMode === 'list' && styles.list]}>
                    {items.map((spool) => (
                      <SpoolCard
                        key={spool.id}
                        layout={viewMode}
                        onEdit={() => onOpenSpool(spool, 'basic')}
                        onPress={() => onOpenSpool(spool)}
                        onWeigh={() => onOpenSpool(spool, 'weight')}
                        spool={spool}
                        style={
                          viewMode === 'list'
                            ? styles.listCard
                            : { width: `${100 / columns - 1.2}%` }
                        }
                      />
                    ))}
                  </View>
                </View>
              );
            })}
            {!filtered.length ? (
              <View style={styles.empty}>
                <SlidersHorizontal color={colors.muted} size={28} strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>没有匹配的耗材</Text>
                <Text style={styles.emptyText}>
                  {filter === 'all' && depletedCount
                    ? '已用尽耗材默认隐藏，请切换到“已用尽”查看'
                    : '调整搜索或筛选条件'}
                </Text>
                <Pressable
                  onPress={() => {
                    updateState({
                      query: '',
                      filter: 'all',
                      material: 'all',
                    });
                  }}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearText}>清除筛选</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      </View>
      <SortModal
        onClose={() => setSortOpen(false)}
        onSelect={(value) => {
          updateState({ sort: value });
          setSortOpen(false);
        }}
        selected={sort}
        visible={sortOpen}
      />
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SortModal({
  onClose,
  onSelect,
  selected,
  visible,
}: {
  onClose: () => void;
  onSelect: (value: SortMode) => void;
  selected: SortMode;
  visible: boolean;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.sortOverlay}>
        <Pressable accessibilityLabel="关闭排序" onPress={onClose} style={styles.sortBackdrop} />
        <View style={styles.sortMenu}>
          <Text style={styles.sortTitle}>排序方式</Text>
          {sortOptions.map((option) => {
            const active = option.id === selected;
            return (
              <Pressable
                accessibilityLabel={option.label}
                key={option.id}
                onPress={() => onSelect(option.id)}
                style={({ pressed }) => [
                  styles.sortOption,
                  active && styles.sortOptionActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.sortOptionText, active && styles.sortOptionTextActive]}>
                  {option.label}
                </Text>
                {active ? <Check color={colors.primary} size={17} strokeWidth={1.8} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  count,
  subtle,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  count?: number;
  subtle?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        subtle && styles.chipSubtle,
        active && styles.chipActive,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.chipContent}>
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
        {count !== undefined ? (
          <Text style={[styles.chipCount, active && styles.chipCountActive]}>{count}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
  },
  content: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
    width: '100%',
    maxWidth: 1200,
  },
  headingRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'space-between',
    minHeight: 76,
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
  headingActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 3,
  },
  search: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: colors.line,
    borderRadius: radii.input,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
    width: 264,
  },
  searchMobile: {
    marginTop: 12,
    width: '100%',
  },
  searchInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    outlineWidth: 0,
    padding: 0,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  syncButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.control,
    flexDirection: 'row',
    gap: 7,
    height: 40,
    paddingHorizontal: 15,
  },
  syncButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  syncText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.65,
  },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  errorText: {
    color: colors.danger,
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  retry: {
    color: colors.danger,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  overview: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 28,
    marginTop: 18,
    padding: 22,
  },
  overviewMain: {
    flex: 1,
  },
  overviewCompact: {
    flexDirection: 'column',
    gap: 16,
    padding: 18,
  },
  overviewLabel: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  overviewValueRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    marginTop: 2,
  },
  overviewValue: {
    color: colors.ink,
    fontFamily: 'Inter_700Bold',
    fontSize: 42,
    letterSpacing: -0.03,
    lineHeight: 46,
  },
  overviewUnit: {
    color: colors.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    marginLeft: 4,
  },
  overviewMeta: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 3,
  },
  overviewStats: {
    flexDirection: 'row',
    gap: 8,
  },
  overviewStatsCompact: {
    width: '100%',
  },
  stat: {
    backgroundColor: colors.background,
    borderRadius: 12,
    justifyContent: 'center',
    minWidth: 92,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  statValue: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 22,
    lineHeight: 27,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 16,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    backgroundColor: 'rgba(29,29,31,0.055)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSubtle: {
    backgroundColor: 'transparent',
    borderColor: colors.line,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.white,
  },
  chipContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  chipCount: {
    color: colors.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  chipCountActive: {
    color: 'rgba(255,255,255,0.76)',
  },
  toolControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 36,
    paddingHorizontal: 11,
  },
  sortText: {
    color: colors.ink,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  viewToggle: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 2,
    padding: 3,
  },
  viewButton: {
    alignItems: 'center',
    borderRadius: 7,
    height: 30,
    justifyContent: 'center',
    width: 32,
  },
  viewButtonActive: {
    backgroundColor: colors.mint,
  },
  materialChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    paddingTop: 10,
  },
  grid: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
  },
  list: {
    flexDirection: 'column',
    gap: 8,
  },
  listCard: {
    width: '100%',
  },
  groups: {
    gap: 24,
    marginTop: 18,
  },
  group: {
    gap: 2,
  },
  groupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  groupTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  groupTitle: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  groupCount: {
    color: colors.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  groupMeta: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
  loadingText: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 12,
  },
  empty: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 220,
    width: '100%',
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginTop: 10,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 3,
  },
  clearButton: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  clearText: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  sortOverlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  sortBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  sortMenu: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    maxWidth: 340,
    padding: 8,
    width: '100%',
  },
  sortTitle: {
    color: colors.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  sortOption: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 10,
  },
  sortOptionActive: {
    backgroundColor: colors.mint,
  },
  sortOptionText: {
    color: colors.ink,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  sortOptionTextActive: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
});
