import {
  Check,
  ChevronDown,
  CircleOff,
  Nfc,
  Pencil,
  Scale,
  Trash2,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  bambuColors,
  colorsForFilament,
  brandOptions as fallbackBrands,
  commonBrands as fallbackCommonBrands,
  filamentCatalog,
} from '../catalog';
import type { AppPreferences } from '../preferences';
import { setAppBusy } from '../pwa';
import {
  isColorHidden,
  isTypeHidden,
  availableExtraPresets,
  availableTarePresets,
  colorsForType,
  findTarePresetForFilament,
  typeOptionId,
} from '../preferencesCatalog';
import { colors, radii, shadow } from '../theme';
import type { CatalogEntry, Spool, SpoolEditorTab, SpoolUpdate } from '../types';
import { confirmAction } from '../confirm';

type Tab = SpoolEditorTab;
type Dropdown = 'brand' | 'type' | 'color' | 'tare' | 'extra' | null;

const spoolTareFallback = { id: 'generic-200', name: '通用空盘', grams: 200 };
const extraFallback = { id: 'extra-none', name: '无', grams: 0 };

type Props = {
  spool: Spool | null;
  visible: boolean;
  initialTab?: Tab;
  forceRfidEdit: boolean;
  catalog: CatalogEntry[];
  presets: CatalogEntry[];
  preferences: AppPreferences;
  onClose: () => void;
  onDelete: (spool: Spool) => Promise<void>;
  onDeplete: (spool: Spool) => Promise<void>;
  onSaveBasic: (spool: Spool, update: SpoolUpdate) => Promise<void>;
  onSaveWeight: (spool: Spool, remaining: number, tare: number) => Promise<void>;
  onWeightMemoryChange: (
    spoolId: number,
    tarePresetId: string,
    extraPresetId: string,
  ) => void;
};

function normalizeColor(value: string) {
  const clean = value.replace('#', '').slice(0, 6).toUpperCase();
  return /^[0-9A-F]{6}$/.test(clean) ? `#${clean}` : '#808080';
}

function includedSelected<T>(options: T[], commonCount: number, selected: T, equals: (a: T, b: T) => boolean) {
  const list = options.slice(0, commonCount);
  if (!list.some((item) => equals(item, selected))) list.push(selected);
  return list;
}

export function SpoolEditorModal({
  spool,
  visible,
  initialTab = 'basic',
  forceRfidEdit,
  catalog,
  presets,
  preferences,
  onClose,
  onDelete,
  onDeplete,
  onSaveBasic,
  onSaveWeight,
  onWeightMemoryChange,
}: Props) {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [tab, setTab] = useState<Tab>('basic');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [brand, setBrand] = useState('Bambu Lab');
  const [type, setType] = useState('PLA Basic');
  const [colorName, setColorName] = useState('自定义颜色');
  const [colorHex, setColorHex] = useState('#808080');
  const [dropdown, setDropdown] = useState<Dropdown>(null);
  const [expandedBrands, setExpandedBrands] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState(false);
  const [expandedColors, setExpandedColors] = useState(false);
  const [tareId, setTareId] = useState(spoolTareFallback.id);
  const [extraId, setExtraId] = useState(extraFallback.id);
  const [gross, setGross] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionPending, setActionPending] = useState<'deplete' | 'delete' | null>(null);
  const [pendingAction, setPendingAction] = useState<'deplete' | 'delete' | null>(null);
  const [error, setError] = useState('');
  const baselineRef = useRef<{
    name: string;
    note: string;
    brand: string;
    type: string;
    colorName: string;
    colorHex: string;
    tareId: string;
    extraId: string;
    gross: string;
  } | null>(null);
  const [dirtyTracking, setDirtyTracking] = useState(false);

  useEffect(() => {
    if (!spool || !visible) {
      setDirtyTracking(false);
      return;
    }
    setDirtyTracking(false);
    setTab(initialTab);
    setName(spool.displayName || '');
    setNote(spool.note || '');
    setBrand(spool.filamentVendor || 'Bambu Lab');
    setType(spool.filamentName || spool.filamentType || 'PLA Basic');
    const hex = normalizeColor(spool.color || '#808080');
    setColorHex(hex);
    const initialColorName =
      bambuColors.find((item) => item.hex.toUpperCase() === hex.toUpperCase())?.name ||
      '自定义颜色';
    setColorName(initialColorName);
    setDropdown(null);
    setExpandedBrands(false);
    setExpandedTypes(false);
    setExpandedColors(false);
    const memory = preferences.spoolWeights[String(spool.id)];
    const tarePresets = availableTarePresets(preferences);
    const extraPresets = availableExtraPresets(preferences);
    const filamentBrand = spool.filamentVendor || 'Bambu Lab';
    const filamentType = spool.filamentName || spool.filamentType || 'PLA Basic';
    const rememberedTare = tarePresets.find(
      (item) => item.id === memory?.tarePresetId,
    );
    const matchedTare = findTarePresetForFilament(
      preferences,
      filamentBrand,
      filamentType,
    );
    const savedTare =
      rememberedTare ||
      matchedTare ||
      tarePresets.find((item) => item.id === preferences.defaultTarePresetId) ||
      tarePresets[0] ||
      spoolTareFallback;
    const savedExtra =
      extraPresets.find(
        (item) =>
          item.id ===
          (memory?.extraPresetId || preferences.defaultExtraPresetId),
      ) ||
      extraPresets[0] ||
      extraFallback;
    setTareId(savedTare.id);
    setExtraId(savedExtra.id);
    const initialGross = String(
      Math.round(
        (spool.netWeight || 0) + savedTare.grams + savedExtra.grams,
      ),
    );
    setGross(initialGross);
    baselineRef.current = {
      name: spool.displayName || '',
      note: spool.note || '',
      brand: spool.filamentVendor || 'Bambu Lab',
      type: spool.filamentName || spool.filamentType || 'PLA Basic',
      colorName: initialColorName,
      colorHex: hex,
      tareId: savedTare.id,
      extraId: savedExtra.id,
      gross: initialGross,
    };
    setDirtyTracking(true);
    setSaving(false);
    setActionPending(null);
    setPendingAction(null);
    setError('');
  }, [initialTab, spool, visible, preferences]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    setAppBusy('spool-editor', visible);
    return () => {
      setAppBusy('spool-editor', false);
    };
  }, [visible]);

  const tarePresets = availableTarePresets(preferences);
  const extraPresets = availableExtraPresets(preferences);
  const tare =
    tarePresets.find((item) => item.id === tareId) ||
    tarePresets[0] ||
    spoolTareFallback;
  const extra =
    extraPresets.find((item) => item.id === extraId) ||
    extraPresets[0] ||
    extraFallback;
  const normalizedGross = gross.trim().replace(',', '.');
  const grossValue = normalizedGross ? Number(normalizedGross) : Number.NaN;
  const tareTotal = tare.grams + extra.grams;
  const net = Number.isFinite(grossValue)
    ? Math.max(0, grossValue - tareTotal)
    : 0;
  const weightError =
    !normalizedGross
      ? '请输入整盘总重。'
      : !Number.isFinite(grossValue)
        ? '请输入有效数字，例如 972.5。'
        : grossValue < 0
          ? '整盘总重不能为负数。'
          : grossValue > 20000
            ? '整盘总重不能超过 20000 g。'
            : grossValue < tareTotal
              ? `整盘总重不能小于空盘皮重与其他重量之和（${tareTotal} g）。`
              : grossValue - tareTotal > 10000
                ? '净重不能超过 10000 g。'
                : '';

  const hasCloudCatalog = catalog.length > 0 || presets.length > 0;
  const cloudBrands =
    catalog.length || presets.length
      ? [...catalog, ...presets].map((entry) => entry.vendor).filter(Boolean)
      : [];
  const officialBrands = hasCloudCatalog ? cloudBrands : fallbackBrands;
  const allBrands = [
    ...new Set([
      ...officialBrands,
      ...Object.keys(preferences.customTypes),
      ...preferences.customBrands,
      brand,
    ]),
  ];
  const availableBrands = allBrands.filter(
    (item) => !preferences.hiddenBrands.includes(item),
  );
  const commonBrandList =
    fallbackCommonBrands.filter((item) => availableBrands.includes(item)).length > 0
      ? fallbackCommonBrands.filter((item) => availableBrands.includes(item))
      : availableBrands;
  const cloudTypes = [...catalog, ...presets]
    .filter((entry) => entry.vendor === brand)
    .map((entry) => entry.name)
    .filter(Boolean);
  const fallbackTypes =
    cloudTypes.length > 0 ? [] : filamentCatalog[brand] || [];
  const allTypes = [
    ...new Set(
      cloudTypes
        .concat(fallbackTypes)
        .concat(preferences.customTypes[brand] || [])
        .concat(type),
    ),
  ];
  const types = allTypes.filter((item) => !isTypeHidden(preferences, brand, item));
  const visibleBrandTypes = preferences.hiddenBrands.includes(brand) ? [] : types;
  const selectedBrandOption = availableBrands.includes(brand)
    ? brand
    : availableBrands[0] || brand;
  const selectedTypeOption = visibleBrandTypes.includes(type)
    ? type
    : visibleBrandTypes[0] || type;
  const brandList = expandedBrands
    ? availableBrands
    : includedSelected(
        commonBrandList,
        2,
        selectedBrandOption,
        (a, b) => a === b,
      );
  const typeList = expandedTypes
    ? includedSelected(
        visibleBrandTypes,
        visibleBrandTypes.length,
        selectedTypeOption,
        (a, b) => a === b,
      )
    : includedSelected(
        visibleBrandTypes.slice(0, 2),
        2,
        selectedTypeOption,
        (a, b) => a === b,
      );
  const allColors = [
    ...colorsForType(preferences, brand, type),
    { name: colorName, hex: colorHex },
  ].filter(
    (color, index, list) =>
      list.findIndex(
        (item) =>
          item.name === color.name &&
          item.hex.toUpperCase() === color.hex.toUpperCase(),
      ) === index,
  );
  const availableColors = allColors.filter(
    (color) => !isColorHidden(preferences, brand, type, color),
  );
  const visibleTypeColors = isTypeHidden(preferences, brand, type) ? [] : availableColors;
  const selectedColorOption = visibleTypeColors.find(
    (color) => color.hex.toUpperCase() === colorHex.toUpperCase(),
  );
  const colorList = selectedColorOption
    ? expandedColors
      ? includedSelected(
          visibleTypeColors,
          visibleTypeColors.length,
          selectedColorOption,
          (a, b) => a.hex.toUpperCase() === b.hex.toUpperCase(),
        )
      : includedSelected(
          availableColors.slice(0, 6),
          6,
          selectedColorOption,
          (a, b) => a.hex.toUpperCase() === b.hex.toUpperCase(),
        )
    : expandedColors
      ? visibleTypeColors
      : availableColors.slice(0, 6);
  const colorTypeId = typeOptionId(brand, type);
  const normalizedSelectedColor = colorHex.toUpperCase();
  const colorSourceLabel =
    brand === 'Bambu Lab' &&
    bambuColors.some(
      (color) => color.hex.toUpperCase() === normalizedSelectedColor,
    )
    ? '官方色卡'
    : (preferences.customTypeColors[colorTypeId] || []).some(
          (color) => color.hex.toUpperCase() === normalizedSelectedColor,
        )
      ? '型号自定义色'
      : preferences.customColors.some(
            (color) => color.hex.toUpperCase() === normalizedSelectedColor,
          )
        ? '通用自定义色'
        : '自定义颜色';

  const rfid = spool?.createType !== 'manual';
  const canSave = useMemo(() => {
    if (!spool) return false;
    if (tab === 'weight') {
      return !weightError;
    }
    return Boolean(name.trim() || brand.trim() || type.trim());
  }, [brand, name, spool, tab, type, weightError]);
  const dirty = useMemo(() => {
    const baseline = baselineRef.current;
    if (!baseline || !dirtyTracking) return false;
    const isDirty = (
      name !== baseline.name ||
      note !== baseline.note ||
      brand !== baseline.brand ||
      type !== baseline.type ||
      colorName !== baseline.colorName ||
      colorHex !== baseline.colorHex ||
      tareId !== baseline.tareId ||
      extraId !== baseline.extraId ||
      gross !== baseline.gross
    );
    return isDirty;
  }, [
    brand,
    colorHex,
    colorName,
    dirtyTracking,
    extraId,
    gross,
    name,
    note,
    type,
    tareId,
  ]);

  if (!spool) return null;

  const requestClose = async () => {
    if (dirty) {
      const confirmed = await confirmAction({
        title: '放弃未保存的修改？',
        message: '当前料盘的名称、备注、重量或选项修改尚未保存。',
        confirmLabel: '放弃修改',
        cancelLabel: '继续编辑',
        destructive: true,
      });
      if (!confirmed) return;
    }
    onClose();
  };

  const changeTab = (next: Tab) => {
    if (next === 'weight' && spool) {
      const originalBrand = spool.filamentVendor || '';
      const originalType = spool.filamentName || spool.filamentType || '';
      if (brand !== originalBrand || type !== originalType) {
        const matched = findTarePresetForFilament(preferences, brand, type);
        const fallback =
          tarePresets.find((item) => item.id === preferences.defaultTarePresetId) ||
          tarePresets[0];
        if (matched || fallback) setTareId((matched || fallback).id);
      }
    }
    setTab(next);
    setDropdown(null);
    setError('');
  };

  const saveBasic = async () => {
    setSaving(true);
    setError('');
    try {
      const originalVendor = spool.filamentVendor || '';
      const originalType = spool.filamentName || spool.filamentType || '';
      const originalColor = normalizeColor(spool.color || '#808080');
      const identityChanged =
        brand !== originalVendor ||
        type !== originalType ||
        colorHex.toUpperCase() !== originalColor.toUpperCase();
      const nameEdited = name.trim() !== (spool.displayName || '').trim();
      let nextName = name.trim();
      let nextNote = note.trim().slice(0, 50);

      if (identityChanged) {
        if (!nameEdited) {
          nextName = [brand, type, spool.displayName ? `· ${spool.displayName}` : '']
            .filter(Boolean)
            .join(' ')
            .slice(0, 50);
        }
        const identity = [
          brand ? `品牌:${brand}` : '',
          type ? `类型:${type}` : '',
          colorHex ? `色:${colorHex}` : '',
        ]
          .filter(Boolean)
          .join(' ');
        nextNote = `${identity}${nextNote ? ` | ${nextNote}` : ''}`.slice(0, 50);
      }

      const update: SpoolUpdate = {
        displayName: nextName,
        note: nextNote,
      };
      if (!rfid || forceRfidEdit) {
        const material = type.replace(/^PolyLite\s+/i, '').split(' ')[0];
        update.filamentVendor = brand;
        update.filamentName = type;
        update.filamentType = material;
        update.color = colorHex;
        update.colors = [colorHex];
      }
      await onSaveBasic(spool, update);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请稍后重试。');
    } finally {
      setSaving(false);
    }
  };

  const saveWeight = async () => {
    if (!canSave) {
      setError(weightError);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSaveWeight(spool, net, tare.grams + extra.grams);
      onWeightMemoryChange(spool.id, tare.id, extra.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请稍后重试。');
    } finally {
      setSaving(false);
    }
  };

  const runLifecycleAction = async () => {
    if (!pendingAction) return;
    setActionPending(pendingAction);
    setError('');
    try {
      if (pendingAction === 'deplete') await onDeplete(spool);
      else await onDelete(spool);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请稍后重试。');
    } finally {
      setActionPending(null);
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={requestClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable onPress={requestClose} style={styles.backdrop} />
        <View style={[styles.dialog, desktop ? styles.dialogDesktop : styles.dialogMobile]}>
          <View style={styles.header}>
            <View style={styles.identity}>
              <View style={[styles.swatch, { backgroundColor: colorHex }]}>
                <View style={styles.swatchCore} />
              </View>
              <View style={styles.identityCopy}>
                <Text style={styles.spoolName} numberOfLines={1}>
                  {spool.displayName || spool.filamentName || spool.filamentType || '耗材'}
                </Text>
                <Text style={styles.spoolMeta} numberOfLines={1}>
                  {brand} · {type}
                </Text>
              </View>
              <View style={[styles.rfidBadge, rfid && styles.rfidBadgeActive]}>
                {rfid ? (
                  <Nfc color={colors.primary} size={14} strokeWidth={1.7} />
                ) : (
                  <Pencil color={colors.muted} size={13} strokeWidth={1.7} />
                )}
                <Text style={[styles.rfidText, rfid && styles.rfidTextActive]}>
                  {rfid ? 'RFID' : '手动'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="关闭"
                onPress={requestClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <X color={colors.ink} size={19} strokeWidth={1.7} />
              </Pressable>
            </View>
          </View>

          <View style={styles.tabs}>
            <Pressable
              onPress={() => changeTab('basic')}
              style={[styles.tab, tab === 'basic' && styles.tabActive]}
            >
              <Pencil
                color={tab === 'basic' ? colors.ink : colors.muted}
                size={16}
                strokeWidth={1.7}
              />
              <Text style={[styles.tabText, tab === 'basic' && styles.tabTextActive]}>
                基本信息
              </Text>
            </Pressable>
            <Pressable
              onPress={() => changeTab('weight')}
              style={[styles.tab, tab === 'weight' && styles.tabActive]}
            >
              <Scale
                color={tab === 'weight' ? colors.ink : colors.muted}
                size={16}
                strokeWidth={1.7}
              />
              <Text style={[styles.tabText, tab === 'weight' && styles.tabTextActive]}>
                重量
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.bodyScroll}
          >
            {tab === 'basic' ? (
              <View
                style={[
                  styles.formGrid,
                  Boolean(dropdown) && styles.formGridOpen,
                ]}
              >
                <Field label="名称">
                  <TextInput
                    onChangeText={setName}
                    placeholder="例如 PLA Basic 黑色"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={name}
                  />
                </Field>

                <View
                  style={[
                    styles.twoColumns,
                    !desktop && styles.twoColumnsCompact,
                    (dropdown === 'brand' || dropdown === 'type') &&
                      styles.selectFieldOpen,
                  ]}
                >
                  <View
                    style={[
                      styles.column,
                      dropdown === 'brand' && styles.selectFieldOpen,
                    ]}
                  >
                    <SelectTrigger
                      label="品牌"
                      meta={officialBrands.includes(brand) ? 'Bambu Studio' : '自定义选项'}
                      open={dropdown === 'brand'}
                      value={brand}
                      onPress={() => setDropdown(dropdown === 'brand' ? null : 'brand')}
                    />
                    {dropdown === 'brand' ? (
                      <SelectMenu>
                        {brandList.map((option) => (
                          <SelectOption
                            key={option}
                            label={option}
                            selected={option === brand}
                            onPress={() => {
                              const nextCloudTypes = [...catalog, ...presets]
                                .filter((entry) => entry.vendor === option)
                                .map((entry) => entry.name)
                                .filter(Boolean);
                              const nextTypes = [
                                ...new Set(
                                  nextCloudTypes
                                    .concat(
                                      nextCloudTypes.length
                                        ? []
                                        : filamentCatalog[option] || [],
                                    )
                                    .concat(preferences.customTypes[option] || []),
                                ),
                              ];
                              const visibleTypes = nextTypes.filter(
                                (item) => !isTypeHidden(preferences, option, item),
                              );
                              const nextType =
                                visibleTypes[0] ||
                                nextTypes[0] ||
                                type;
                              const nextColor = colorsForFilament(option, nextType)[0];
                              setBrand(option);
                              setType(nextType);
                              if (nextColor) {
                                setColorName(nextColor.name);
                                setColorHex(nextColor.hex);
                              }
                              setDropdown(null);
                            }}
                          />
                        ))}
                        {!expandedBrands && brandList.length < availableBrands.length ? (
                          <MoreButton onPress={() => setExpandedBrands(true)} />
                        ) : null}
                      </SelectMenu>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.column,
                      dropdown === 'type' && styles.selectFieldOpen,
                    ]}
                  >
                    <SelectTrigger
                      label="类型"
                      meta={
                        preferences.customTypes[brand]?.includes(type)
                          ? '自定义选项'
                          : 'Bambu Studio'
                      }
                      open={dropdown === 'type'}
                      value={type}
                      onPress={() => setDropdown(dropdown === 'type' ? null : 'type')}
                    />
                    {dropdown === 'type' ? (
                      <SelectMenu>
                        {typeList.map((option) => (
                          <SelectOption
                            key={option}
                            label={option}
                            selected={option === type}
                            onPress={() => {
                              const nextColor = colorsForFilament(brand, option)[0];
                              setType(option);
                              if (nextColor) {
                                setColorName(nextColor.name);
                                setColorHex(nextColor.hex);
                              }
                              setDropdown(null);
                            }}
                          />
                        ))}
                        {!expandedTypes && typeList.length < visibleBrandTypes.length ? (
                          <MoreButton onPress={() => setExpandedTypes(true)} />
                        ) : null}
                      </SelectMenu>
                    ) : null}
                  </View>
                </View>

                <View
                  style={[
                    styles.selectField,
                    dropdown === 'color' && styles.selectFieldOpen,
                  ]}
                >
                  <SelectTrigger
                    label="颜色"
                    meta={colorSourceLabel}
                    open={dropdown === 'color'}
                    value={colorName}
                    trailing={
                      <View style={[styles.colorDot, { backgroundColor: colorHex }]} />
                    }
                    onPress={() => setDropdown(dropdown === 'color' ? null : 'color')}
                  />
                  {dropdown === 'color' ? (
                    <SelectMenu>
                      <View style={styles.colorGrid}>
                        {colorList.map((color) => (
                          <Pressable
                            key={color.hex}
                            onPress={() => {
                              setColorHex(color.hex);
                              setColorName(color.name);
                              setDropdown(null);
                            }}
                            style={[
                              styles.colorOption,
                              color.hex.toUpperCase() === colorHex.toUpperCase() &&
                                styles.colorOptionActive,
                            ]}
                          >
                            <View
                              style={[styles.colorOptionSwatch, { backgroundColor: color.hex }]}
                            />
                            <Text style={styles.colorOptionText}>{color.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                      {!expandedColors && colorList.length < visibleTypeColors.length ? (
                        <MoreButton onPress={() => setExpandedColors(true)} />
                      ) : null}
                    </SelectMenu>
                  ) : null}
                </View>

                <Field label="备注">
                  <TextInput
                    maxLength={50}
                    multiline
                    onChangeText={setNote}
                    placeholder="添加这盘耗材的备注"
                    placeholderTextColor={colors.muted}
                    style={styles.noteInput}
                    textAlignVertical="top"
                    value={note}
                  />
                </Field>

                {rfid && !forceRfidEdit ? (
                  <Text style={styles.info}>
                    安全模式会保留 RFID 原始字段，将自定义信息同时写入名称和备注。
                  </Text>
                ) : null}
              </View>
            ) : (
              <View
                style={[
                  styles.weightStack,
                  dropdown && styles.weightStackOpen,
                ]}
              >
                <View style={styles.weightHero}>
                  <View>
                    <Text style={styles.heroLabel}>当前剩余</Text>
                    {locationText(spool) ? (
                      <Text style={styles.heroMeta}>{locationText(spool)}</Text>
                    ) : null}
                  </View>
                  <View style={styles.heroValueRow}>
                    <Text style={styles.heroValue}>{Math.round(spool.netWeight || 0)}</Text>
                    <Text style={styles.heroUnit}>g / {Math.round(spool.totalNetWeight || 1000)} g</Text>
                  </View>
                </View>

                <Field label="整盘总重">
                  <TextInput
                    keyboardType="decimal-pad"
                    onChangeText={setGross}
                    placeholder="972"
                    placeholderTextColor={colors.muted}
                    style={[styles.input, styles.weightInput]}
                    value={gross}
                  />
                  {weightError ? (
                    <Text accessibilityLiveRegion="polite" style={styles.error}>
                      {weightError}
                    </Text>
                  ) : null}
                </Field>

                <View
                  style={[
                    styles.selectField,
                    dropdown === 'tare' && styles.selectFieldOpen,
                  ]}
                >
                  <SelectTrigger
                    label="空盘皮重"
                    meta={tare.name}
                    open={dropdown === 'tare'}
                    value={`${tare.grams} g`}
                    onPress={() => setDropdown(dropdown === 'tare' ? null : 'tare')}
                  />
                  {dropdown === 'tare' ? (
                    <SelectMenu>
                      {tarePresets.map((preset) => (
                        <SelectOption
                          key={preset.id}
                          label={preset.name}
                          meta={`${preset.grams} g${
                            preset.brand || preset.type
                              ? ` · ${[preset.brand, preset.type].filter(Boolean).join(' / ')}`
                              : ''
                          }`}
                          selected={preset.id === tareId}
                          onPress={() => {
                            setTareId(preset.id);
                            setDropdown(null);
                          }}
                        />
                      ))}
                    </SelectMenu>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.selectField,
                    dropdown === 'extra' && styles.selectFieldOpen,
                  ]}
                >
                  <SelectTrigger
                    label="其他重量"
                    meta={extra.name}
                    open={dropdown === 'extra'}
                    value={`${extra.grams} g`}
                    onPress={() => setDropdown(dropdown === 'extra' ? null : 'extra')}
                  />
                </View>

                <View style={styles.result}>
                  <View>
                    <Text style={styles.resultLabel}>写回拓竹云</Text>
                    <Text style={styles.resultMeta}>Studio 与 Handy 同步显示</Text>
                  </View>
                  <View style={styles.resultValueRow}>
                    <Text style={styles.resultValue}>{Math.round(net)}</Text>
                    <Text style={styles.resultUnit}>g</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.lifecycleSection}>
              <Text style={styles.lifecycleTitle}>料盘操作</Text>
              <View style={styles.lifecycleButtons}>
                <Pressable
                  accessibilityLabel="标记为已用尽"
                  disabled={(spool.netWeight || 0) <= 0 || saving || Boolean(actionPending)}
                  onPress={() => {
                    setPendingAction('deplete');
                    setError('');
                  }}
                  style={({ pressed }) => [
                    styles.lifecycleButton,
                    ((spool.netWeight || 0) <= 0 || saving || actionPending) &&
                      styles.lifecycleDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <CircleOff color={colors.ink} size={17} strokeWidth={1.7} />
                  <Text style={styles.lifecycleButtonText}>
                    {(spool.netWeight || 0) <= 0 ? '已经用尽' : '标记用尽'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="删除料盘"
                  disabled={saving || Boolean(actionPending)}
                  onPress={() => {
                    setPendingAction('delete');
                    setError('');
                  }}
                  style={({ pressed }) => [
                    styles.lifecycleButton,
                    styles.lifecycleDeleteButton,
                    (saving || actionPending) && styles.lifecycleDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Trash2 color={colors.danger} size={17} strokeWidth={1.7} />
                  <Text style={[styles.lifecycleButtonText, styles.lifecycleDeleteText]}>
                    删除料盘
                  </Text>
                </Pressable>
              </View>

              {pendingAction ? (
                <View style={styles.lifecycleConfirm}>
                  <Text style={styles.lifecycleConfirmTitle}>
                    {pendingAction === 'delete' ? '从拓竹云删除料盘？' : '将剩余量标记为 0 g？'}
                  </Text>
                  <Text style={styles.lifecycleConfirmText}>
                    {pendingAction === 'delete'
                      ? spool.inPrinter
                        ? '删除后无法恢复。该 RFID 料盘仍在 AMS 中，下次同步时可能重新出现。'
                        : '删除后无法恢复，Studio 与 Handy 的耗材库都会移除该料盘。'
                      : '料盘会保留在耗材库中，剩余量写为 0 g，并显示为已用尽。'}
                  </Text>
                  <View style={styles.lifecycleConfirmActions}>
                    <Pressable
                      onPress={() => setPendingAction(null)}
                      style={styles.cancelButton}
                    >
                      <Text style={styles.cancelText}>取消</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={
                        pendingAction === 'delete' ? '确认删除料盘' : '确认标记用尽'
                      }
                      onPress={runLifecycleAction}
                      style={[
                        styles.confirmButton,
                        pendingAction === 'delete' && styles.confirmDeleteButton,
                      ]}
                    >
                      {actionPending ? (
                        <ActivityIndicator color={colors.white} size="small" />
                      ) : (
                        <Text style={styles.confirmButtonText}>
                          {pendingAction === 'delete' ? '确认删除' : '确认用尽'}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.footerNote}>
              {tab === 'basic' ? '名称和备注始终同时写入' : '保存后立即同步云端'}
            </Text>
            <Pressable
              disabled={!canSave || saving}
              onPress={tab === 'basic' ? saveBasic : saveWeight}
              style={({ pressed }) => [
                styles.saveButton,
                (!canSave || saving) && styles.saveDisabled,
                pressed && canSave && !saving && styles.savePressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Check color={colors.white} size={18} strokeWidth={2} />
                  <Text style={styles.saveText}>
                    {tab === 'basic' ? '保存信息' : '保存重量'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
        <ExtraPresetSheet
          onClose={() => setDropdown(null)}
          onSelect={(presetId) => {
            setExtraId(presetId);
            setDropdown(null);
          }}
          presets={extraPresets}
          selectedId={extraId}
          visible={dropdown === 'extra'}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

function locationText(spool: Spool) {
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

function ExtraPresetSheet({
  onClose,
  onSelect,
  presets,
  selectedId,
  visible,
}: {
  onClose: () => void;
  onSelect: (presetId: string) => void;
  presets: { id: string; name: string; grams: number }[];
  selectedId: string;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <View style={styles.extraSheetOverlay}>
      <Pressable accessibilityLabel="关闭其他重量选项" onPress={onClose} style={styles.extraSheetBackdrop} />
      <View style={styles.extraSheet}>
        <View style={styles.extraSheetHeader}>
          <View>
            <Text style={styles.extraSheetTitle}>其他重量</Text>
            <Text style={styles.extraSheetMeta}>选择空盘之外的附加重量</Text>
          </View>
          <Pressable
            accessibilityLabel="关闭"
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <X color={colors.ink} size={19} strokeWidth={1.7} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.extraSheetList}
          showsVerticalScrollIndicator={false}
        >
          {presets.map((preset) => (
            <SelectOption
              key={preset.id}
              label={preset.name}
              meta={`${preset.grams} g`}
              selected={preset.id === selectedId}
              onPress={() => onSelect(preset.id)}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function SelectTrigger({
  label,
  meta,
  value,
  open,
  trailing,
  onPress,
}: {
  label: string;
  meta: string;
  value: string;
  open: boolean;
  trailing?: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.selectTrigger, open && styles.selectTriggerOpen]}
    >
      <View style={styles.selectCopy}>
        <Text style={styles.selectMeta}>{label} · {meta}</Text>
        <Text style={styles.selectValue}>{value}</Text>
      </View>
      {trailing}
      <ChevronDown
        color={colors.muted}
        size={17}
        strokeWidth={1.7}
        style={open ? styles.chevronOpen : undefined}
      />
    </Pressable>
  );
}

function SelectMenu({ children }: { children: React.ReactNode }) {
  return <View style={styles.selectMenu}>{children}</View>;
}

function SelectOption({
  label,
  meta,
  selected,
  onPress,
}: {
  label: string;
  meta?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.selectOption, selected && styles.selectOptionActive]}
    >
      <Text style={[styles.selectOptionText, selected && styles.selectOptionTextActive]}>
        {label}
      </Text>
      {meta ? <Text style={styles.selectOptionMeta}>{meta}</Text> : null}
      {selected ? <Check color={colors.primary} size={16} strokeWidth={2} /> : null}
    </Pressable>
  );
}

function MoreButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}>
      <Text style={styles.moreText}>加载更多</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  extraSheetOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    elevation: 3000,
    justifyContent: 'center',
    padding: 18,
    zIndex: 3000,
  },
  extraSheetBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  extraSheet: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '72%',
    maxWidth: 420,
    overflow: 'hidden',
    width: '100%',
    ...shadow,
  },
  extraSheetHeader: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  extraSheetTitle: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
  },
  extraSheetMeta: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  extraSheetList: {
    gap: 2,
    padding: 8,
  },
  dialog: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderColor: 'rgba(255,255,255,0.86)',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'column',
    overflow: 'hidden',
    ...shadow,
  },
  dialogDesktop: {
    height: 720,
    maxWidth: 760,
    width: '92%',
  },
  dialogMobile: {
    alignSelf: 'center',
    borderRadius: 18,
    maxHeight: '78%',
    width: '92%',
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  identity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  swatch: {
    alignItems: 'center',
    borderRadius: 10,
    height: 52,
    justifyContent: 'center',
    width: 42,
  },
  swatchCore: {
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderRadius: 999,
    height: 13,
    width: 13,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  spoolName: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 22,
    letterSpacing: -0.02,
  },
  spoolMeta: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  rfidBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(29,29,31,0.055)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    minHeight: 26,
    paddingHorizontal: 8,
  },
  rfidBadgeActive: {
    backgroundColor: colors.mint,
  },
  rfidText: {
    color: colors.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  rfidTextActive: {
    color: colors.primary,
  },
  closeButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pressed: {
    opacity: 0.62,
  },
  tabs: {
    backgroundColor: 'rgba(29,29,31,0.055)',
    borderRadius: radii.control,
    flexDirection: 'row',
    gap: 3,
    marginHorizontal: 22,
    marginTop: 16,
    padding: 3,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 38,
  },
  tabActive: {
    backgroundColor: colors.white,
    ...shadow,
  },
  tabText: {
    color: colors.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
  },
  body: {
    paddingBottom: 18,
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  bodyScroll: {
    flex: 1,
  },
  formGrid: {
    gap: 15,
  },
  formGridOpen: {
    position: 'relative',
    zIndex: 1000,
  },
  twoColumns: {
    flexDirection: 'row',
    gap: 10,
    position: 'relative',
  },
  twoColumnsCompact: {
    flexDirection: 'column',
  },
  column: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  selectField: {
    position: 'relative',
  },
  selectFieldOpen: {
    elevation: 1000,
    zIndex: 1000,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  input: {
    backgroundColor: 'rgba(245,245,247,0.74)',
    borderColor: colors.line,
    borderRadius: radii.input,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    minHeight: 44,
    outlineWidth: 0,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  noteInput: {
    backgroundColor: 'rgba(245,245,247,0.74)',
    borderColor: colors.line,
    borderRadius: radii.input,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    minHeight: 82,
    outlineWidth: 0,
    padding: 13,
  },
  selectTrigger: {
    alignItems: 'center',
    backgroundColor: 'rgba(245,245,247,0.74)',
    borderColor: colors.line,
    borderRadius: radii.input,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  selectTriggerOpen: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  selectCopy: {
    flex: 1,
    minWidth: 0,
  },
  selectMeta: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  selectValue: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    marginTop: 1,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  colorDot: {
    borderColor: colors.line,
    borderRadius: 5,
    borderWidth: 1,
    height: 18,
    width: 18,
  },
  selectMenu: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 55,
    zIndex: 1000,
    padding: 5,
    ...shadow,
    elevation: 24,
  },
  selectOption: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    minHeight: 36,
    paddingHorizontal: 9,
  },
  selectOptionActive: {
    backgroundColor: colors.mint,
  },
  selectOptionText: {
    color: colors.ink,
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  selectOptionTextActive: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  selectOptionMeta: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    padding: 3,
  },
  colorOption: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 8,
    width: '32%',
  },
  colorOptionActive: {
    backgroundColor: colors.mint,
    borderColor: colors.primary,
  },
  colorOptionSwatch: {
    borderColor: colors.line,
    borderRadius: 5,
    borderWidth: 1,
    height: 18,
    width: 18,
  },
  colorOptionText: {
    color: colors.ink,
    flexShrink: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  moreButton: {
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 34,
    justifyContent: 'center',
  },
  moreText: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  info: {
    color: colors.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  weightStack: {
    gap: 14,
  },
  weightStackOpen: {
    elevation: 1000,
    position: 'relative',
    zIndex: 1000,
  },
  weightHero: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  heroLabel: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  heroMeta: {
    color: colors.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  heroValueRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
  },
  heroValue: {
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 34,
    letterSpacing: -0.03,
  },
  heroUnit: {
    color: colors.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginLeft: 4,
  },
  weightInput: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 30,
    minHeight: 68,
  },
  result: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  resultLabel: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  resultMeta: {
    color: colors.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  resultValueRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
  },
  resultValue: {
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    letterSpacing: -0.03,
  },
  resultUnit: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginLeft: 3,
  },
  lifecycleSection: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    marginTop: 18,
    paddingTop: 16,
  },
  lifecycleTitle: {
    color: colors.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    marginBottom: 8,
  },
  lifecycleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  lifecycleButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 10,
  },
  lifecycleDeleteButton: {
    backgroundColor: colors.dangerSoft,
    borderColor: 'rgba(185,65,55,0.18)',
  },
  lifecycleDisabled: {
    opacity: 0.42,
  },
  lifecycleButtonText: {
    color: colors.ink,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  lifecycleDeleteText: {
    color: colors.danger,
  },
  lifecycleConfirm: {
    backgroundColor: colors.dangerSoft,
    borderColor: 'rgba(185,65,55,0.18)',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginTop: 10,
    padding: 12,
  },
  lifecycleConfirmTitle: {
    color: colors.danger,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  lifecycleConfirmText: {
    color: colors.ink,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  lifecycleConfirmActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 13,
  },
  cancelText: {
    color: colors.ink,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.control,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 82,
    paddingHorizontal: 13,
  },
  confirmDeleteButton: {
    backgroundColor: colors.danger,
  },
  confirmButtonText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  error: {
    color: colors.danger,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  footerNote: {
    color: colors.muted,
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.control,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 118,
    paddingHorizontal: 16,
  },
  savePressed: {
    backgroundColor: colors.primaryPressed,
  },
  saveDisabled: {
    opacity: 0.36,
  },
  saveText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
});
