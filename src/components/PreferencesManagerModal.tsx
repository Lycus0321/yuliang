import {
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  bambuColors,
  brandOptions,
  colorsByType,
  filamentCatalog,
} from '../catalog';
import type {
  AppPreferences,
  LocalPreset,
  LocalPresetOverride,
} from '../preferences';
import { setAppBusy } from '../pwa';
import {
  allExtraPresets,
  allTarePresets,
  isColorHidden,
  isTypeHidden,
  normalizeColorId,
  parseTypeOptionId,
  scopedColorId,
  typeOptionId,
} from '../preferencesCatalog';
import { colors, radii, shadow } from '../theme';
import type { CatalogEntry } from '../types';
import { ColorPicker } from './ColorPicker';
import { confirmAction } from '../confirm';

export type ManagerKind = 'brand' | 'type' | 'color' | 'tare' | 'extra';
type ManagerMode = 'list' | 'create' | 'edit';

type Props = {
  catalog: CatalogEntry[];
  kind: ManagerKind | null;
  preferences: AppPreferences;
  presets: CatalogEntry[];
  onChange: (preferences: AppPreferences) => void;
  onClose: () => void;
};

const titles: Record<ManagerKind, string> = {
  brand: '品牌选项',
  type: '型号选项',
  color: '颜色选项',
  tare: '空盘皮重预设',
  extra: '其他重量预设',
};

type OptionRow = {
  id: string;
  name: string;
  meta: string;
  hidden: boolean;
  custom: boolean;
  isDefault: boolean;
  bareType?: string;
  locked?: boolean;
  lockReason?: string;
  colorScope?: {
    vendor: string;
    type: string;
  };
  groupKey?: string;
  groupLabel?: string;
  groupMeta?: string;
  switchLabel?: string;
  colorHex?: string;
};

type OptionGroup = {
  key: string;
  label: string;
  meta: string;
  options: OptionRow[];
};

export function PreferencesManagerModal({
  catalog,
  kind,
  preferences,
  presets,
  onChange,
  onClose,
}: Props) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [presetBrand, setPresetBrand] = useState('');
  const [presetType, setPresetType] = useState('');
  const [presetPicker, setPresetPicker] = useState<'brand' | 'type' | null>(null);
  const [formError, setFormError] = useState('');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<ManagerMode>('list');
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    setName('');
    setValue(kind === 'color' ? '#000000' : '');
    setFormDirty(false);
    setPresetBrand('');
    setPresetType('');
    setPresetPicker(null);
    setPresetPicker(null);
    setFormError('');
    setEditingPresetId(null);
    setEditingColorId(null);
    setExpandedGroups({});
    setMode('list');
    setPendingDelete(null);
  }, [kind]);

  useEffect(() => {
    if (!kind) return;
    setAppBusy('preferences-manager', true);
    return () => setAppBusy('preferences-manager', false);
  }, [kind]);

  if (!kind) return null;

  const isPreset = kind === 'tare' || kind === 'extra';
  const options = optionRows(kind, preferences, catalog, presets);
  const groups = groupOptions(kind, options);
  const grouped = kind === 'type' || kind === 'color';
  const editing = mode === 'edit';
  const entityName =
    kind === 'brand'
      ? '品牌'
      : kind === 'type'
        ? '型号'
        : kind === 'color'
          ? '颜色'
          : kind === 'tare'
            ? '空盘皮重'
            : '其他重量';
  const formTitle = `${editing ? '编辑' : '新增'}${entityName}`;
  const listHint = isPreset
    ? '开关控制是否出现在下拉菜单，星标设置默认项，铅笔可编辑名称和克重。'
    : kind === 'color'
      ? '颜色按型号分组；展开分组管理显示状态，使用底部按钮新增颜色。'
      : '品牌隐藏会同步锁定其型号和颜色；关闭开关后进入加载更多。';
  const formHint =
    kind === 'color'
      ? '拖动明暗与颜色面板、色相条即可生成颜色。'
      : kind === 'type'
        ? '按“品牌/型号”的格式填写。'
        : isPreset
          ? '填写名称和克重后保存。'
          : '填写名称后保存。';
  const knownBrands = [
    ...new Set([
      ...officialBrands(catalog, presets),
      ...preferences.customBrands,
      ...Object.keys(preferences.customTypes),
    ]),
  ];
  const knownTypes = presetBrand
    ? [
        ...new Set([
          ...officialTypesForVendor(presetBrand, catalog, presets),
          ...(preferences.customTypes[presetBrand] || []),
        ]),
      ]
    : [
        ...new Set(
          knownBrands.flatMap((brand) => [
            ...officialTypesForVendor(brand, catalog, presets),
            ...(preferences.customTypes[brand] || []),
          ]),
        ),
      ];

  const toggle = (option: OptionRow) => {
    if (option.locked) return;
    const key =
      kind === 'brand'
        ? 'hiddenBrands'
        : kind === 'type'
          ? 'hiddenTypes'
          : kind === 'color'
            ? 'hiddenColors'
            : kind === 'tare'
              ? 'hiddenTarePresetIds'
              : 'hiddenExtraPresetIds';
    const current = preferences[key] as string[];
    const willHide = !option.hidden;
    let nextHidden: string[];

    if (kind === 'color') {
      if (option.colorScope) {
        const id = scopedColorId(
          option.colorScope.vendor,
          option.colorScope.type,
          option.id,
        );
        const legacyIds = [option.name, normalizeColorId(option.id)];
        nextHidden = willHide
          ? [...new Set([...current, id])]
          : current.filter(
              (item) => item !== id && !legacyIds.includes(item),
            );
      } else {
        const ids = [option.name, normalizeColorId(option.id)];
        nextHidden = willHide
          ? [...new Set([...current, ...ids])]
          : current.filter((item) => !ids.includes(item));
      }
    } else if (kind === 'type') {
      const ids = [option.id, option.bareType].filter(
        (item): item is string => Boolean(item),
      );
      nextHidden = willHide
        ? [...new Set([...current, option.id])]
        : current.filter((item) => !ids.includes(item));
    } else {
      nextHidden = willHide
        ? [...new Set([...current, option.id])]
        : current.filter((item) => item !== option.id);
    }

    let next = { ...preferences, [key]: nextHidden };
    if (isPreset && willHide && option.isDefault) {
      const defaultKey =
        kind === 'tare' ? 'defaultTarePresetId' : 'defaultExtraPresetId';
      const presets =
        kind === 'tare' ? allTarePresets(preferences) : allExtraPresets(preferences);
      const preferredId = kind === 'tare' ? 'generic-200' : 'extra-none';
      const fallback =
        presets.find((preset) => preset.id === preferredId && !nextHidden.includes(preset.id)) ||
        presets.find((preset) => !nextHidden.includes(preset.id));
      if (fallback) next = { ...next, [defaultKey]: fallback.id };
    }
    onChange(next);
  };

  const makeDefault = (id: string) => {
    const hiddenKey =
      kind === 'tare' ? 'hiddenTarePresetIds' : 'hiddenExtraPresetIds';
    onChange({
      ...preferences,
      [kind === 'tare' ? 'defaultTarePresetId' : 'defaultExtraPresetId']: id,
      [hiddenKey]: (preferences[hiddenKey] as string[]).filter(
        (item) => item !== id,
      ),
    });
  };

  const removeCustom = (id: string) => {
    let next = preferences;
    if (kind === 'brand') {
      const customTypes = { ...preferences.customTypes };
      delete customTypes[id];
      next = {
        ...preferences,
        customBrands: preferences.customBrands.filter((item) => item !== id),
        customTypes,
        hiddenBrands: preferences.hiddenBrands.filter((item) => item !== id),
        hiddenTypes: preferences.hiddenTypes.filter(
          (item) => item !== id && !item.startsWith(`${id}/`),
        ),
        hiddenColors: preferences.hiddenColors.filter(
          (item) => !item.startsWith(`color:${id}/`),
        ),
      };
    } else if (kind === 'type') {
      const parsed = parseTypeOptionId(id);
      if (!parsed) return;
      const customTypes = { ...preferences.customTypes };
      const remaining = (customTypes[parsed.vendor] || []).filter(
        (item) => item !== parsed.type,
      );
      if (remaining.length) customTypes[parsed.vendor] = remaining;
      else delete customTypes[parsed.vendor];
      next = {
        ...preferences,
        customTypes,
        hiddenTypes: preferences.hiddenTypes.filter((item) => item !== id),
        hiddenColors: preferences.hiddenColors.filter(
          (item) => !item.startsWith(`color:${parsed.vendor}/${parsed.type}/`),
        ),
      };
    } else if (kind === 'color') {
      const selected = options.find((option) => option.id === id);
      const hiddenColors = preferences.hiddenColors.filter(
        (item) => item !== id && item !== selected?.name,
      );
      next = {
        ...preferences,
        customColors: preferences.customColors.filter(
          (item) =>
            item.hex.toUpperCase() !== id.toUpperCase() &&
            item.name !== selected?.name,
        ),
        hiddenColors,
      };
    } else if (kind === 'tare') {
      const hiddenTarePresetIds = preferences.hiddenTarePresetIds.filter(
        (item) => item !== id,
      );
      const remaining = allTarePresets(preferences).filter((item) => item.id !== id);
      const defaultTarePresetId =
        preferences.defaultTarePresetId === id
          ? remaining.find((item) => !hiddenTarePresetIds.includes(item.id))?.id ||
            'generic-200'
          : preferences.defaultTarePresetId;
      next = {
        ...preferences,
        customTarePresets: preferences.customTarePresets.filter((item) => item.id !== id),
        hiddenTarePresetIds,
        defaultTarePresetId,
      };
    } else if (kind === 'extra') {
      const hiddenExtraPresetIds = preferences.hiddenExtraPresetIds.filter(
        (item) => item !== id,
      );
      const remaining = allExtraPresets(preferences).filter((item) => item.id !== id);
      const defaultExtraPresetId =
        preferences.defaultExtraPresetId === id
          ? remaining.find((item) => !hiddenExtraPresetIds.includes(item.id))?.id ||
            'extra-none'
          : preferences.defaultExtraPresetId;
      next = {
        ...preferences,
        customExtraPresets: preferences.customExtraPresets.filter((item) => item.id !== id),
        hiddenExtraPresetIds,
        defaultExtraPresetId,
      };
    }
    if (editingPresetId === id) {
      setEditingPresetId(null);
      setName('');
      setValue('');
      setFormError('');
    }
    if (
      editingColorId &&
      normalizeColorId(editingColorId) === normalizeColorId(id)
    ) {
      setEditingColorId(null);
      setName('');
      setValue('');
      setFormError('');
    }
    onChange(next);
  };

  const startEditingPreset = (id: string) => {
    const presets =
      kind === 'tare' ? allTarePresets(preferences) : allExtraPresets(preferences);
    const preset = presets.find((item) => item.id === id);
    if (!preset) return;
    setEditingPresetId(id);
    setName(preset.name);
    setValue(String(preset.grams));
    setFormDirty(false);
    setPresetBrand(preset.brand || '');
    setPresetType(preset.type || '');
    setFormError('');
    setMode('edit');
    setPendingDelete(null);
  };

  const startEditingColor = (id: string) => {
    const color = preferences.customColors.find(
      (item) => normalizeColorId(item.hex) === normalizeColorId(id),
    );
    if (!color) return;
    setEditingColorId(normalizeColorId(color.hex));
    setName(color.name);
    setValue(normalizeColorId(color.hex));
    setFormDirty(false);
    setFormError('');
    setMode('edit');
    setPendingDelete(null);
    setExpandedGroups((current) => ({
      ...current,
      'color:global': true,
    }));
  };

  const startCreate = () => {
    setMode('create');
    setEditingPresetId(null);
    setEditingColorId(null);
    setName('');
    setValue(kind === 'color' ? '#000000' : '');
    setFormDirty(false);
    setPresetBrand('');
    setPresetType('');
    setPresetPicker(null);
    setFormError('');
    setPendingDelete(null);
  };

  const cancelEditingPreset = () => {
    setMode('list');
    setEditingPresetId(null);
    setEditingColorId(null);
    setName('');
    setValue('');
    setPresetBrand('');
    setPresetType('');
    setFormError('');
  };

  const add = () => {
    const trimmed = name.trim();
    setFormError('');
    if (!trimmed) {
      setFormError('请先填写名称。');
      return;
    }
    if (isPreset && editingPresetId) {
      const grams = Number(value);
      if (!Number.isFinite(grams) || grams < 0) {
        setFormError('请输入有效克重。');
        return;
      }
      const existing =
        kind === 'tare' ? allTarePresets(preferences) : allExtraPresets(preferences);
      if (
        existing.some(
          (preset) =>
            preset.id !== editingPresetId &&
            preset.name.trim().toLowerCase() === trimmed.toLowerCase() &&
            preset.grams === grams,
        )
      ) {
        setFormError('相同名称和克重的预设已存在。');
        return;
      }
      const association =
        kind === 'tare'
          ? {
              brand: presetBrand.trim() || undefined,
              type: presetType.trim() || undefined,
            }
          : {};
      const override: LocalPresetOverride = {
        name: trimmed,
        grams,
        ...association,
      };
      const customPresets =
        kind === 'tare'
          ? preferences.customTarePresets
          : preferences.customExtraPresets;
      if (customPresets.some((preset) => preset.id === editingPresetId)) {
        const overridesKey =
          kind === 'tare' ? 'tarePresetOverrides' : 'extraPresetOverrides';
        const overrides = { ...preferences[overridesKey] };
        delete overrides[editingPresetId];
        onChange({
          ...preferences,
          [kind === 'tare' ? 'customTarePresets' : 'customExtraPresets']:
            customPresets.map((preset) =>
              preset.id === editingPresetId ? { ...preset, ...override } : preset,
            ),
          [overridesKey]: overrides,
        });
      } else {
        onChange({
          ...preferences,
          [kind === 'tare' ? 'tarePresetOverrides' : 'extraPresetOverrides']: {
            ...(kind === 'tare'
              ? preferences.tarePresetOverrides
              : preferences.extraPresetOverrides),
            [editingPresetId]: override,
          },
        });
      }
      cancelEditingPreset();
      return;
    }
    if (kind === 'brand') {
      if (
        officialBrands(catalog, presets).includes(trimmed) ||
        preferences.customBrands.includes(trimmed) ||
        Object.keys(preferences.customTypes).includes(trimmed)
      ) {
        setFormError('该品牌已存在。');
        return;
      }
      onChange({ ...preferences, customBrands: [...preferences.customBrands, trimmed] });
    } else if (kind === 'type') {
      const parsed = parseTypeOptionId(trimmed);
      if (!parsed) {
        setFormError('请按“品牌/型号”的格式填写。');
        return;
      }
      const { vendor, type } = parsed;
      if (
        officialTypesForVendor(vendor, catalog, presets).includes(type) ||
        (preferences.customTypes[vendor] || []).includes(type)
      ) {
        setFormError('该品牌下的型号已存在。');
        return;
      }
      onChange({
        ...preferences,
        customBrands:
          officialBrands(catalog, presets).includes(vendor) ||
          preferences.customBrands.includes(vendor)
            ? preferences.customBrands
            : [...preferences.customBrands, vendor],
        customTypes: {
          ...preferences.customTypes,
          [vendor]: [...new Set([...(preferences.customTypes[vendor] || []), type])],
        },
      });
      setExpandedGroups((current) => ({
        ...current,
        [`type:${vendor}`]: true,
      }));
    } else if (kind === 'color') {
      const rawHex = value.trim();
      const hex = rawHex.startsWith('#') ? rawHex : `#${rawHex}`;
      const normalizedHex = normalizeColorId(hex);
      if (!/^#[0-9A-F]{6}$/.test(normalizedHex)) {
        setFormError('请输入 6 位十六进制颜色值。');
        return;
      }
      const original = editingColorId
        ? preferences.customColors.find(
            (item) =>
              normalizeColorId(item.hex) === normalizeColorId(editingColorId),
          )
        : null;
      if (
        [
          ...bambuColors,
          ...Object.values(colorsByType).flat(),
          ...preferences.customColors.filter(
            (item) =>
              !original ||
              normalizeColorId(item.hex) !== normalizeColorId(original.hex),
          ),
        ].some(
          (item) =>
            item.name === trimmed ||
            normalizeColorId(item.hex) === normalizedHex,
        )
      ) {
        setFormError('颜色名称或色值已存在。');
        return;
      }
      if (original) {
        const hiddenColors = [
          ...new Set(
            preferences.hiddenColors.map((item) => {
              if (item === original.name) return trimmed;
              if (normalizeColorId(item) === normalizeColorId(original.hex)) {
                return normalizedHex;
              }
              return item;
            }),
          ),
        ];
        onChange({
          ...preferences,
          customColors: preferences.customColors.map((item) =>
            normalizeColorId(item.hex) === normalizeColorId(original.hex)
              ? { name: trimmed, hex: normalizedHex }
              : item,
          ),
          hiddenColors,
        });
        cancelEditingPreset();
        return;
      }
      onChange({
        ...preferences,
        customColors: [
          ...preferences.customColors,
          { name: trimmed, hex: normalizedHex },
        ],
      });
      setExpandedGroups((current) => ({
        ...current,
        'color:global': true,
      }));
    } else {
      const grams = Number(value);
      if (!Number.isFinite(grams) || grams < 0) {
        setFormError('请输入有效克重。');
        return;
      }
      const existing =
        kind === 'tare'
          ? allTarePresets(preferences)
          : allExtraPresets(preferences);
      if (
        existing.some(
          (preset) =>
            preset.name.trim().toLowerCase() === trimmed.toLowerCase() &&
            preset.grams === grams,
        )
      ) {
        setFormError('相同名称和克重的预设已存在。');
        return;
      }
      const preset: LocalPreset = {
        id: `custom-${kind}-${Date.now()}`,
        name: trimmed,
        grams,
        ...(kind === 'tare'
          ? {
              brand: presetBrand.trim() || undefined,
              type: presetType.trim() || undefined,
            }
          : {}),
      };
      onChange({
        ...preferences,
        [kind === 'tare' ? 'customTarePresets' : 'customExtraPresets']: [
          ...(kind === 'tare'
            ? preferences.customTarePresets
            : preferences.customExtraPresets),
          preset,
        ],
      });
    }
    cancelEditingPreset();
  };

  const renderOptionRow = (option: OptionRow) => {
    const optionPath = option.colorScope
      ? `${option.colorScope.vendor} / ${option.colorScope.type} / ${option.name}`
      : option.name;
    return (
      <View key={option.id} style={styles.row}>
        <View style={[styles.copy, option.locked && styles.copyLocked]}>
          <View style={styles.nameRow}>
            {option.colorHex ? (
              <View
                style={[
                  styles.colorSwatch,
                  { backgroundColor: option.colorHex },
                ]}
              />
            ) : null}
            <Text style={styles.name}>{option.name}</Text>
          </View>
          <Text style={styles.meta}>{option.meta}</Text>
        </View>
        {isPreset || (kind === 'color' && option.custom) ? (
          <Pressable
            accessibilityLabel={`编辑${option.name}`}
            onPress={() =>
              isPreset
                ? startEditingPreset(option.id)
                : startEditingColor(option.id)
            }
            style={styles.icon}
          >
            <Pencil color={colors.muted} size={16} strokeWidth={1.7} />
          </Pressable>
        ) : null}
        {isPreset ? (
          <Pressable
            accessibilityLabel={`将${option.name}设为默认`}
            onPress={() => makeDefault(option.id)}
            style={styles.icon}
          >
            <Star
              color={option.isDefault ? colors.primary : colors.muted}
              fill={option.isDefault ? colors.primary : 'transparent'}
              size={17}
            />
          </Pressable>
        ) : null}
        <Switch
          accessibilityLabel={`显示${option.switchLabel || optionPath}`}
          disabled={option.locked}
          onValueChange={() => toggle(option)}
          thumbColor={colors.white}
          trackColor={{ false: '#C9CEC8', true: colors.primary }}
          value={!option.hidden}
        />
        {option.custom ? (
          <Pressable
            accessibilityLabel={`删除${option.switchLabel || option.name}`}
            onPress={() =>
              setPendingDelete({
                id: option.id,
                name: option.switchLabel || option.name,
              })
            }
            style={styles.icon}
          >
            <Trash2 color={colors.danger} size={17} />
          </Pressable>
        ) : null}
      </View>
    );
  };

  const requestClose = async () => {
    if (formDirty && mode !== 'list') {
      const confirmed = await confirmAction({
        title: '放弃未保存的修改？',
        message: '当前预设或颜色表单内容尚未保存。',
        confirmLabel: '放弃修改',
        cancelLabel: '继续编辑',
        destructive: true,
      });
      if (!confirmed) return;
    }
    onClose();
  };

  return (
    <Modal animationType="fade" onRequestClose={requestClose} transparent visible>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable onPress={requestClose} style={styles.backdrop} />
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'list' ? titles[kind] : formTitle}
            </Text>
            <Pressable
              accessibilityLabel="关闭"
              hitSlop={6}
              onPress={requestClose}
              style={styles.close}
            >
              <X color={colors.ink} size={19} />
            </Pressable>
          </View>
          <Text style={styles.hint}>{mode === 'list' ? listHint : formHint}</Text>
          {mode === 'list' ? (
            <>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.list}
              >
                {groups.map((group) => {
                  const open =
                    !grouped || (expandedGroups[group.key] ?? false);
                  return (
                    <View
                      key={group.key}
                      style={grouped ? styles.group : undefined}
                    >
                      {grouped ? (
                        <Pressable
                          accessibilityLabel={`${open ? '收起' : '展开'}${group.label}`}
                          onPress={() =>
                            setExpandedGroups((current) => ({
                              ...current,
                              [group.key]: !open,
                            }))
                          }
                          style={({ pressed }) => [
                            styles.groupHeader,
                            pressed && styles.pressed,
                          ]}
                        >
                          {open ? (
                            <ChevronDown color={colors.muted} size={17} />
                          ) : (
                            <ChevronRight color={colors.muted} size={17} />
                          )}
                          <View style={styles.groupCopy}>
                            <Text style={styles.groupTitle}>{group.label}</Text>
                            <Text style={styles.groupMeta}>{group.meta}</Text>
                          </View>
                        </Pressable>
                      ) : null}
                      {open ? (
                        <View style={grouped && styles.groupRows}>
                          {group.options.map(renderOptionRow)}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>
              <View style={styles.listFooter}>
                {pendingDelete ? (
                  <View style={styles.deleteConfirm}>
                    <Text style={styles.deleteConfirmText}>
                      删除“{pendingDelete.name}”？
                    </Text>
                    <Pressable
                      onPress={() => setPendingDelete(null)}
                      style={styles.cancelButton}
                    >
                      <Text style={styles.cancelText}>取消</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel="确认删除"
                      onPress={() => {
                        removeCustom(pendingDelete.id);
                        setPendingDelete(null);
                      }}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteButtonText}>删除</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    accessibilityLabel={`新增${entityName}`}
                    onPress={startCreate}
                    style={({ pressed }) => [
                      styles.createButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Plus color={colors.white} size={18} />
                    <Text style={styles.addText}>新增{entityName}</Text>
                  </Pressable>
                )}
              </View>
            </>
          ) : (
            <ScrollView
              contentContainerStyle={styles.formScroll}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.formScrollView}
            >
              {formError ? (
                <Text style={styles.formError}>{formError}</Text>
              ) : null}
              {kind === 'color' ? (
                <View style={styles.colorEditor}>
                  <TextInput
                    accessibilityLabel="颜色名称"
                    onChangeText={(next) => {
                      setName(next);
                      setFormDirty(true);
                    }}
                    placeholder="颜色名称"
                    placeholderTextColor={colors.muted}
                    selectionColor={colors.primary}
                    style={styles.input}
                    underlineColorAndroid="transparent"
                    value={name}
                  />
                  <ColorPicker
                    onChange={(next) => {
                      setValue(next);
                      setFormDirty(true);
                    }}
                    value={value}
                  />
                </View>
              ) : (
                <View style={styles.formStack}>
                  <TextInput
                    accessibilityLabel={kind === 'type' ? '型号名称' : '名称'}
                    onChangeText={(next) => {
                      setName(next);
                      setFormDirty(true);
                    }}
                    placeholder={
                      kind === 'type'
                        ? '品牌/型号，例如 SUNLU/PLA+'
                        : '名称'
                    }
                    placeholderTextColor={colors.muted}
                    selectionColor={colors.primary}
                    style={styles.input}
                    underlineColorAndroid="transparent"
                    value={name}
                  />
                  {isPreset ? (
                    <TextInput
                      accessibilityLabel="克重"
                      keyboardType="numeric"
                      onChangeText={(next) => {
                        setValue(next);
                        setFormDirty(true);
                      }}
                      placeholder="克重"
                      placeholderTextColor={colors.muted}
                      selectionColor={colors.primary}
                      style={styles.input}
                      underlineColorAndroid="transparent"
                      value={value}
                    />
                  ) : null}
                  {kind === 'tare' ? (
                    <>
                      <Pressable
                        accessibilityLabel="选择适用品牌"
                        onPress={() => setPresetPicker('brand')}
                        style={styles.associationSelect}
                      >
                        <View style={styles.associationCopy}>
                          <Text style={styles.associationLabel}>适用品牌</Text>
                          <Text style={styles.associationValue}>
                            {presetBrand || '不限定品牌'}
                          </Text>
                        </View>
                        <ChevronDown color={colors.muted} size={17} />
                      </Pressable>
                      <Pressable
                        accessibilityLabel="选择适用型号"
                        onPress={() => setPresetPicker('type')}
                        style={styles.associationSelect}
                      >
                        <View style={styles.associationCopy}>
                          <Text style={styles.associationLabel}>适用型号</Text>
                          <Text style={styles.associationValue}>
                            {presetType || '不限定型号'}
                          </Text>
                        </View>
                        <ChevronDown color={colors.muted} size={17} />
                      </Pressable>
                    </>
                  ) : null}
                </View>
              )}
              <View style={styles.formActions}>
                <Pressable onPress={add} style={styles.addButton}>
                  <Check color={colors.white} size={18} />
                  <Text style={styles.addText}>
                    {kind === 'color'
                      ? editing
                        ? '保存颜色'
                        : '添加颜色'
                      : editing
                        ? '保存修改'
                        : '添加'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={cancelEditingPreset}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelText}>返回列表</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
          <PresetAssociationPicker
            options={
              presetPicker === 'brand'
                ? knownBrands.map((brand) => ({
                    value: brand,
                    label: brand,
                  }))
                : knownTypes.map((type) => ({
                    value: type,
                    label: type,
                    meta: presetBrand
                      ? presetBrand
                      : knownBrands.find((brand) =>
                          [
                            ...officialTypesForVendor(brand, catalog, presets),
                            ...(preferences.customTypes[brand] || []),
                          ].includes(type),
                        ),
                  }))
            }
            selected={presetPicker === 'brand' ? presetBrand : presetType}
            title={presetPicker === 'brand' ? '选择适用品牌' : '选择适用型号'}
            visible={presetPicker !== null}
            onClose={() => setPresetPicker(null)}
            onSelect={(value) => {
              if (presetPicker === 'brand') {
                setPresetBrand(value);
                setPresetType('');
              } else {
                setPresetType(value);
              }
              setFormDirty(true);
              setPresetPicker(null);
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PresetAssociationPicker({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Array<{ value: string; label: string; meta?: string }>;
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  if (!visible) return null;
  const items = [
    {
      value: '',
      label: title.includes('品牌') ? '不限定品牌' : '不限定型号',
      meta: '作为通配项参与匹配',
    },
    ...options,
  ];
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={styles.backdrop} />
        <View style={[styles.dialog, styles.pickerDialog]}>
          <View style={styles.pickerHeader}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              accessibilityLabel="关闭选择"
              hitSlop={6}
              onPress={onClose}
              style={styles.close}
            >
              <X color={colors.ink} size={19} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.pickerList}
          >
            {items.map((item) => {
              const active = selected === item.value;
              return (
                <Pressable
                  accessibilityLabel={item.label}
                  key={item.value || 'unlimited'}
                  onPress={() => onSelect(item.value)}
                  style={[styles.pickerOption, active && styles.pickerOptionActive]}
                >
                  <View style={styles.copy}>
                    <Text style={[styles.name, active && styles.pickerNameActive]}>
                      {item.label}
                    </Text>
                    {item.meta ? <Text style={styles.meta}>{item.meta}</Text> : null}
                  </View>
                  {active ? <Check color={colors.primary} size={17} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function groupOptions(kind: ManagerKind, options: OptionRow[]): OptionGroup[] {
  if (kind !== 'type' && kind !== 'color') {
    return [{ key: 'all', label: '', meta: '', options }];
  }
  const groups = new Map<string, OptionGroup>();
  for (const option of options) {
    const key = option.groupKey || 'other';
    const current = groups.get(key);
    if (current) {
      current.options.push(option);
    } else {
      groups.set(key, {
        key,
        label: option.groupLabel || '其他',
        meta: option.groupMeta || '',
        options: [option],
      });
    }
  }
  return [...groups.values()].map((group) => {
    const hiddenCount = group.options.filter((option) => option.hidden).length;
    return {
      ...group,
      meta: [
        group.meta,
        `${group.options.length} 项`,
        hiddenCount ? `${hiddenCount} 项隐藏` : '',
      ]
        .filter(Boolean)
        .join(' · '),
    };
  });
}

function officialBrands(catalog: CatalogEntry[], presets: CatalogEntry[]) {
  const cloudBrands = [...catalog, ...presets]
    .map((entry) => entry.vendor)
    .filter(Boolean);
  return [
    ...new Set(cloudBrands.length ? cloudBrands : brandOptions),
  ];
}

function officialTypesForVendor(
  vendor: string,
  catalog: CatalogEntry[],
  presets: CatalogEntry[],
) {
  const cloudTypes = [...catalog, ...presets]
    .filter((entry) => entry.vendor === vendor)
    .map((entry) => entry.name)
    .filter(Boolean);
  return [...new Set(cloudTypes.length ? cloudTypes : filamentCatalog[vendor] || [])];
}

function optionRows(
  kind: ManagerKind,
  preferences: AppPreferences,
  catalog: CatalogEntry[],
  presets: CatalogEntry[],
) {
  if (kind === 'brand') {
    const official = officialBrands(catalog, presets);
    const items = [
      ...new Set([
        ...official,
        ...Object.keys(preferences.customTypes),
        ...preferences.customBrands,
      ]),
    ];
    return items.map((name): OptionRow => ({
      id: name,
      name,
      meta: official.includes(name) ? 'Bambu Studio' : '自定义品牌',
      hidden: preferences.hiddenBrands.includes(name),
      custom: preferences.customBrands.includes(name),
      isDefault: false,
    }));
  }
  if (kind === 'type') {
    const official = officialBrands(catalog, presets);
    const vendors = [
      ...new Set([
        ...official,
        ...Object.keys(preferences.customTypes),
        ...preferences.customBrands,
      ]),
    ];
    return vendors.flatMap((vendor) => {
      const officialTypes = officialTypesForVendor(vendor, catalog, presets);
      const custom = preferences.customTypes[vendor] || [];
      const parentHidden = preferences.hiddenBrands.includes(vendor);
      return [...new Set([...officialTypes, ...custom])].map((type): OptionRow => {
        const baseMeta = officialTypes.includes(type)
          ? 'Bambu Studio'
          : '自定义型号';
        return {
          id: typeOptionId(vendor, type),
          name: type,
          meta: parentHidden ? `${baseMeta} · 品牌已隐藏` : baseMeta,
          hidden: isTypeHidden(preferences, vendor, type),
          custom: custom.includes(type),
          isDefault: false,
          bareType: type,
          locked: parentHidden,
          lockReason: parentHidden ? '品牌已隐藏' : undefined,
          groupKey: `type:${vendor}`,
          groupLabel: vendor,
          groupMeta: parentHidden ? '品牌已隐藏' : 'Bambu Studio 与自定义型号',
          switchLabel: `${vendor} / ${type}`,
        };
      });
    });
  }
  if (kind === 'color') {
    const typedColors = Object.entries(colorsByType).flatMap(([type, items]) =>
      items.map((item): OptionRow => {
        const parentHidden = isTypeHidden(preferences, 'Bambu Lab', type);
        const scopedId = scopedColorId('Bambu Lab', type, item.hex);
        return {
          id: scopedId,
          name: item.name,
          meta: `${normalizeColorId(item.hex)}${
            parentHidden ? ' · 所属型号已隐藏' : ''
          }`,
          hidden: isColorHidden(preferences, 'Bambu Lab', type, item),
          custom: false,
          isDefault: false,
          locked: parentHidden,
          lockReason: parentHidden ? '所属型号已隐藏' : undefined,
          colorScope: { vendor: 'Bambu Lab', type },
          colorHex: normalizeColorId(item.hex),
          groupKey: `color:Bambu Lab/${type}`,
          groupLabel: type,
          groupMeta: `Bambu Lab${
            parentHidden ? ' · 所属型号已隐藏' : ' 专属色卡'
          }`,
          switchLabel: `Bambu Lab / ${type} / ${item.name}`,
        };
      }),
    );
    const globalColors = [...bambuColors, ...preferences.customColors].filter(
      (item, index, list) =>
        list.findIndex(
          (candidate) =>
            candidate.name === item.name &&
            normalizeColorId(candidate.hex) === normalizeColorId(item.hex),
        ) === index,
    );
    const globalRows = globalColors.map((item): OptionRow => {
      const custom = preferences.customColors.some(
        (candidate) =>
          candidate.name === item.name &&
          normalizeColorId(candidate.hex) === normalizeColorId(item.hex),
      );
      return {
        id: normalizeColorId(item.hex),
        name: item.name,
        meta: `通用颜色 / ${normalizeColorId(item.hex)} · ${
          custom ? '自定义颜色' : 'Bambu Studio'
        }`,
        hidden:
          preferences.hiddenColors.includes(item.name) ||
          preferences.hiddenColors.includes(normalizeColorId(item.hex)),
        custom,
        isDefault: false,
        colorHex: normalizeColorId(item.hex),
        groupKey: 'color:global',
        groupLabel: '通用颜色',
        groupMeta: '通用色卡与自定义颜色',
      };
    });
    return [...typedColors, ...globalRows].filter(
      (item, index, list) =>
        list.findIndex((candidate) => candidate.id === item.id) === index,
    );
  }
  const presetRows = kind === 'tare'
    ? allTarePresets(preferences)
    : allExtraPresets(preferences);
  const defaultId = kind === 'tare'
    ? preferences.defaultTarePresetId
    : preferences.defaultExtraPresetId;
  return presetRows.map((item): OptionRow => {
    const association =
      kind === 'tare' ? [item.brand, item.type].filter(Boolean).join(' / ') : '';
    return {
      id: item.id,
      name: item.name,
      meta: `${item.grams} g · ${kind === 'tare' ? '空盘皮重' : '附加重量'}${
        association ? ` · ${association}` : ''
      }`,
      hidden: (kind === 'tare'
        ? preferences.hiddenTarePresetIds
        : preferences.hiddenExtraPresetIds
      ).includes(item.id),
      custom: (kind === 'tare'
        ? preferences.customTarePresets
        : preferences.customExtraPresets
      ).some((custom) => custom.id === item.id),
      isDefault: item.id === defaultId,
    };
  });
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  dialog: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    maxHeight: '86%',
    maxWidth: 680,
    overflow: 'hidden',
    padding: 20,
    width: '100%',
    ...shadow,
  },
  pickerDialog: {
    maxHeight: '76%',
    maxWidth: 520,
    padding: 0,
  },
  pickerHeader: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  pickerList: {
    paddingHorizontal: 18,
  },
  pickerOption: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    paddingVertical: 8,
  },
  pickerOptionActive: {
    paddingHorizontal: 8,
  },
  pickerNameActive: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: colors.ink, fontFamily: 'Inter_600SemiBold', fontSize: 20 },
  close: { alignItems: 'center', height: 34, justifyContent: 'center', width: 34 },
  pressed: { opacity: 0.62 },
  hint: { color: colors.muted, fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 4 },
  list: { flexShrink: 1, marginTop: 14 },
  group: {
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  groupHeader: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flexDirection: 'row',
    gap: 8,
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  groupCopy: { flex: 1 },
  groupTitle: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  groupMeta: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 1,
  },
  groupRows: { paddingHorizontal: 12 },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
  },
  copy: { flex: 1 },
  copyLocked: { opacity: 0.5 },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
  },
  colorSwatch: {
    borderColor: colors.line,
    borderRadius: 6,
    borderWidth: 1,
    height: 18,
    width: 18,
  },
  name: { color: colors.ink, fontFamily: 'Inter_500Medium', fontSize: 14 },
  meta: { color: colors.muted, fontFamily: 'Inter_400Regular', fontSize: 13 },
  icon: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  formError: {
    color: colors.danger,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginBottom: 10,
  },
  listFooter: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 14,
  },
  createButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: radii.control,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  deleteConfirm: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteConfirmText: {
    color: colors.ink,
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: radii.control,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  deleteButtonText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  formScroll: {
    paddingBottom: 4,
    paddingTop: 14,
  },
  formScrollView: {
    flexShrink: 1,
    minHeight: 0,
  },
  formStack: {
    gap: 10,
  },
  associationSelect: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radii.input,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  associationCopy: {
    flex: 1,
  },
  associationLabel: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  associationValue: {
    color: colors.ink,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    marginTop: 1,
  },
  colorEditor: {
    gap: 10,
  },
  formActions: {
    flexDirection: 'row',
    gap: 7,
  },
  addRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 16 },
  input: {
    borderColor: colors.line,
    borderRadius: radii.input,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    minHeight: 44,
    outlineWidth: 0,
    paddingHorizontal: 10,
  },
  valueInput: {
    borderColor: colors.line,
    borderRadius: radii.input,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    minHeight: 44,
    outlineWidth: 0,
    paddingHorizontal: 10,
    width: 90,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.control,
    flexDirection: 'row',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  cancelButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  cancelText: {
    color: colors.ink,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  addText: { color: colors.white, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});
