import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { brandOptions, filamentCatalog } from '../catalog';
import type { AppPreferences, LocalColor } from '../preferences';
import { setAppBusy } from '../pwa';
import {
  availableTarePresets,
  colorsForType,
  findTarePresetForFilament,
  isColorHidden,
  isTypeHidden,
  normalizeColorId,
  scopedColorId,
  typeOptionId,
} from '../preferencesCatalog';
import { colors, radii, shadow, type } from '../theme';
import type { CatalogEntry } from '../types';
import { ColorPicker } from './ColorPicker';
import { confirmAction } from '../confirm';

type Props = {
  preferences: AppPreferences;
  catalog: CatalogEntry[];
  presets: CatalogEntry[];
  onChange: (preferences: AppPreferences) => void;
  embedded?: boolean;
  onBack?: () => void;
};

type DeleteTarget = {
  kind: 'brand' | 'type' | 'color';
  id: string;
  label: string;
  scope?: 'type' | 'global';
};

type EditorState =
  | { kind: 'brand'; mode: 'create' | 'edit'; original?: string }
  | { kind: 'type'; mode: 'create' | 'edit'; original?: string }
  | {
      kind: 'color';
      mode: 'create' | 'edit';
      original?: LocalColor;
      scope?: 'type' | 'global';
    };

export function CatalogManagerView({
  preferences,
  catalog,
  presets,
  onChange,
  embedded = false,
  onBack,
}: Props) {
  const { width } = useWindowDimensions();
  const desktop = width >= 980;
  const officialBrands = useMemo(() => getOfficialBrands(catalog, presets), [
    catalog,
    presets,
  ]);
  const allBrands = useMemo(
    () => {
      const brands = unique([
        ...officialBrands,
        ...Object.keys(preferences.customTypes),
        ...preferences.customBrands,
      ]);
      return sortHiddenLast(
        brands,
        (brand) => preferences.hiddenBrands.includes(brand),
      );
    },
    [
      officialBrands,
      preferences.customBrands,
      preferences.customTypes,
      preferences.hiddenBrands,
    ],
  );
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [mobileStep, setMobileStep] = useState<'brand' | 'type' | 'detail'>(
    'brand',
  );
  const [tareOpen, setTareOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorName, setEditorName] = useState('');
  const [colorHex, setColorHex] = useState('#000000');
  const [editorError, setEditorError] = useState('');
  const [editorDirty, setEditorDirty] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DeleteTarget | null>(null);

  const officialTypes = useMemo(
    () =>
      selectedBrand
        ? getOfficialTypes(selectedBrand, catalog, presets)
        : [],
    [catalog, presets, selectedBrand],
  );
  const allTypes = useMemo(() => {
    if (!selectedBrand) return [];
    return sortHiddenLast(unique([
      ...officialTypes,
      ...(preferences.customTypes[selectedBrand] || []),
    ]), (item) => isTypeHidden(preferences, selectedBrand, item));
  }, [officialTypes, preferences, selectedBrand]);
  const typeId =
    selectedBrand && selectedType
      ? typeOptionId(selectedBrand, selectedType)
      : '';
  const typeColors = useMemo(
    () => selectedBrand && selectedType
      ? sortHiddenLast(
          colorsForType(preferences, selectedBrand, selectedType),
          (color) => isColorHidden(preferences, selectedBrand, selectedType, color),
        )
      : [],
    [preferences, selectedBrand, selectedType],
  );
  const tareOptions = availableTarePresets(preferences);
  const selectedTareId =
    (typeId && preferences.typeTareDefaults[typeId]) ||
    (selectedBrand && selectedType
      ? findTarePresetForFilament(
          preferences,
          selectedBrand,
          selectedType,
        )?.id
      : '') ||
    preferences.defaultTarePresetId;
  const selectedTare =
    tareOptions.find((preset) => preset.id === selectedTareId) ||
    tareOptions[0];
  const brandHidden =
    Boolean(selectedBrand) && preferences.hiddenBrands.includes(selectedBrand!);
  const typeLocked =
    brandHidden ||
    (Boolean(selectedBrand && selectedType) &&
      isTypeHidden(preferences, selectedBrand!, selectedType!));

  useEffect(() => {
    setSelectedBrand((current) =>
      current && allBrands.includes(current) ? current : allBrands[0] || null,
    );
    setPendingDelete(null);
    setEditor(null);
    setTareOpen(false);
  }, [allBrands]);

  useEffect(() => {
    setAppBusy('catalog-manager', true);
    return () => setAppBusy('catalog-manager', false);
  }, []);

  useEffect(() => {
    setSelectedType((current) =>
      current && allTypes.includes(current) ? current : allTypes[0] || null,
    );
    setTareOpen(false);
    setEditor(null);
  }, [allTypes, selectedBrand]);

  const openEditor = (next: EditorState, name = '', hex = '#000000') => {
    setEditor(next);
    setEditorName(name);
    setColorHex(hex);
    setEditorDirty(false);
    setEditorError('');
  };

  const openCreateBrand = () => openEditor({ kind: 'brand', mode: 'create' });
  const openEditBrand = (brand: string) =>
    openEditor({ kind: 'brand', mode: 'edit', original: brand }, brand);
  const openCreateType = () => openEditor({ kind: 'type', mode: 'create' });
  const openEditType = (type: string) =>
    openEditor({ kind: 'type', mode: 'edit', original: type }, type);
  const openCreateColor = () =>
    openEditor({ kind: 'color', mode: 'create' }, '', '#000000');
  const openEditColor = (color: LocalColor) => {
    const typed = (preferences.customTypeColors[typeId] || []).some(
      (item) =>
        item.name === color.name &&
        normalizeColorId(item.hex) === normalizeColorId(color.hex),
    );
    const global = preferences.customColors.some(
      (item) =>
        item.name === color.name &&
        normalizeColorId(item.hex) === normalizeColorId(color.hex),
    );
    openEditor(
      {
        kind: 'color',
        mode: 'edit',
        original: color,
        scope: typed ? 'type' : global ? 'global' : undefined,
      },
      color.name,
      normalizeColorId(color.hex),
    );
  };

  const saveEditor = () => {
    if (!editor) return;
    const name = editorName.trim();
    setEditorError('');
    if (!name) {
      setEditorError('请填写名称。');
      return;
    }

    if (editor.kind === 'brand') {
      const duplicate = allBrands.some(
        (brand) =>
          brand !== editor.original &&
          brand.toLowerCase() === name.toLowerCase(),
      );
      if (duplicate) {
        setEditorError('该品牌已存在。');
        return;
      }
      if (editor.mode === 'create') {
        onChange({
          ...preferences,
          customBrands: [...preferences.customBrands, name],
        });
        setSelectedBrand(name);
        if (!desktop) setMobileStep('type');
      } else if (editor.original) {
        const oldBrand = editor.original;
        const customTypes = { ...preferences.customTypes };
        const brandTypes = customTypes[oldBrand];
        delete customTypes[oldBrand];
        if (brandTypes) customTypes[name] = brandTypes;
        onChange({
          ...preferences,
          customBrands: preferences.customBrands.map((brand) =>
            brand === oldBrand ? name : brand,
          ),
          customTypes,
          customTypeColors: renameRecordPrefix(
            preferences.customTypeColors,
            `${oldBrand}/`,
            `${name}/`,
          ),
          typeTareDefaults: renameRecordPrefix(
            preferences.typeTareDefaults,
            `${oldBrand}/`,
            `${name}/`,
          ),
          hiddenBrands: preferences.hiddenBrands.map((brand) =>
            brand === oldBrand ? name : brand,
          ),
          hiddenTypes: preferences.hiddenTypes.map((item) =>
            item.startsWith(`${oldBrand}/`)
              ? `${name}/${item.slice(oldBrand.length + 1)}`
              : item,
          ),
          hiddenColors: preferences.hiddenColors.map((item) =>
            item.startsWith(`color:${oldBrand}/`)
              ? `color:${name}/${item.slice(6 + oldBrand.length + 1)}`
              : item,
          ),
        });
        setSelectedBrand(name);
        if (!desktop) setMobileStep('type');
      }
    } else if (editor.kind === 'type') {
      if (!selectedBrand) return;
      const duplicate = allTypes.some(
        (type) =>
          type !== editor.original &&
          type.toLowerCase() === name.toLowerCase(),
      );
      if (duplicate) {
        setEditorError('该品牌下已有同类型号。');
        return;
      }
      const current = preferences.customTypes[selectedBrand] || [];
      if (editor.mode === 'create') {
        onChange({
          ...preferences,
          customTypes: {
            ...preferences.customTypes,
            [selectedBrand]: [...current, name],
          },
        });
        setSelectedType(name);
        if (!desktop) setMobileStep('detail');
      } else if (editor.original) {
        const oldType = editor.original;
        const oldKey = typeOptionId(selectedBrand, oldType);
        const newKey = typeOptionId(selectedBrand, name);
        const customTypeColors = { ...preferences.customTypeColors };
        if (customTypeColors[oldKey]) {
          customTypeColors[newKey] = customTypeColors[oldKey];
          delete customTypeColors[oldKey];
        }
        const typeTareDefaults = { ...preferences.typeTareDefaults };
        if (typeTareDefaults[oldKey]) {
          typeTareDefaults[newKey] = typeTareDefaults[oldKey];
          delete typeTareDefaults[oldKey];
        }
        onChange({
          ...preferences,
          customTypes: {
            ...preferences.customTypes,
            [selectedBrand]: current.map((item) =>
              item === oldType ? name : item,
            ),
          },
          customTypeColors,
          typeTareDefaults,
          hiddenTypes: preferences.hiddenTypes.map((item) => {
            if (item === oldKey) return newKey;
            if (item === oldType) return name;
            return item;
          }),
          hiddenColors: preferences.hiddenColors.map((item) =>
            item.startsWith(`color:${selectedBrand}/${oldType}/`)
              ? `color:${selectedBrand}/${name}/${item.slice(
                  6 + selectedBrand.length + oldType.length + 2,
                )}`
              : item,
          ),
        });
        setSelectedType(name);
        if (!desktop) setMobileStep('detail');
      }
    } else {
      if (!selectedBrand || !selectedType) return;
      const hex = normalizeColorId(colorHex);
      if (!/^#[0-9A-F]{6}$/.test(hex)) {
        setEditorError('请选择有效颜色。');
        return;
      }
      const originalHex = editor.original
        ? normalizeColorId(editor.original.hex)
        : '';
      const duplicate = typeColors.some(
        (color) =>
          normalizeColorId(color.hex) !== originalHex &&
          (color.name === name || normalizeColorId(color.hex) === hex),
      );
      if (duplicate) {
        setEditorError('该型号下已有相同颜色名称或色值。');
        return;
      }
      if (editor.scope === 'global') {
        const originalName = editor.original?.name || '';
        onChange({
          ...preferences,
          customColors: preferences.customColors.map((color) =>
            normalizeColorId(color.hex) === originalHex
              ? { name, hex }
              : color,
          ),
          hiddenColors: preferences.hiddenColors.map((item) => {
            if (item === originalName) return name;
            if (normalizeColorId(item) === originalHex) return hex;
            if (item.endsWith(`/${originalHex}`)) {
              return `${item.slice(0, -originalHex.length)}${hex}`;
            }
            return item;
          }),
        });
        setEditor(null);
        return;
      }
      const current = preferences.customTypeColors[typeId] || [];
      const next = editor.mode === 'edit'
        ? current.map((color) =>
            normalizeColorId(color.hex) === originalHex
              ? { name, hex }
              : color,
          )
        : [...current, { name, hex }];
      onChange({
        ...preferences,
        customTypeColors: {
          ...preferences.customTypeColors,
          [typeId]: next,
        },
        hiddenColors:
          editor.mode === 'edit' && originalHex
            ? preferences.hiddenColors.map((item) =>
                item === scopedColorId(selectedBrand, selectedType, originalHex)
                  ? scopedColorId(selectedBrand, selectedType, hex)
                  : item,
              )
            : preferences.hiddenColors,
      });
    }
    setEditor(null);
  };

  const toggleBrand = (brand = selectedBrand) => {
    if (!brand) return;
    const hidden = preferences.hiddenBrands.includes(brand);
    onChange({
      ...preferences,
      hiddenBrands: hidden
        ? preferences.hiddenBrands.filter((item) => item !== brand)
        : [...preferences.hiddenBrands, brand],
    });
  };

  const toggleType = (type = selectedType) => {
    if (!selectedBrand || !type) return;
    const key = typeOptionId(selectedBrand, type);
    const hidden = preferences.hiddenTypes.includes(key);
    onChange({
      ...preferences,
      hiddenTypes: hidden
        ? preferences.hiddenTypes.filter((item) => item !== key)
        : [...new Set([...preferences.hiddenTypes, key])],
    });
  };

  const toggleColor = (color: LocalColor) => {
    if (!selectedBrand || !selectedType) return;
    const scoped = scopedColorId(selectedBrand, selectedType, color.hex);
    const hidden = preferences.hiddenColors.includes(scoped);
    onChange({
      ...preferences,
      hiddenColors: hidden
        ? preferences.hiddenColors.filter(
            (item) =>
              item !== scoped &&
              item !== color.name &&
              item !== normalizeColorId(color.hex),
          )
        : [...new Set([...preferences.hiddenColors, scoped])],
    });
  };

  const selectTare = (id: string) => {
    if (!typeId) return;
    onChange({
      ...preferences,
      typeTareDefaults: {
        ...preferences.typeTareDefaults,
        [typeId]: id,
      },
    });
    setTareOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    let next = preferences;
    if (pendingDelete.kind === 'brand') {
      const brand = pendingDelete.id;
      const customTypes = { ...preferences.customTypes };
      delete customTypes[brand];
      next = {
        ...preferences,
        customBrands: preferences.customBrands.filter((item) => item !== brand),
        customTypes,
        customTypeColors: filterRecord(
          preferences.customTypeColors,
          (key) => !key.startsWith(`${brand}/`),
        ),
        typeTareDefaults: filterRecord(
          preferences.typeTareDefaults,
          (key) => !key.startsWith(`${brand}/`),
        ),
        hiddenBrands: preferences.hiddenBrands.filter((item) => item !== brand),
        hiddenTypes: preferences.hiddenTypes.filter(
          (item) => !item.startsWith(`${brand}/`),
        ),
        hiddenColors: preferences.hiddenColors.filter(
          (item) => !item.startsWith(`color:${brand}/`),
        ),
      };
      setSelectedBrand(null);
      setMobileStep('brand');
    } else if (pendingDelete.kind === 'type' && selectedBrand) {
      const type = pendingDelete.id;
      const key = typeOptionId(selectedBrand, type);
      const currentTypes = (preferences.customTypes[selectedBrand] || []).filter(
        (item) => item !== type,
      );
      const customTypes = { ...preferences.customTypes };
      if (currentTypes.length) customTypes[selectedBrand] = currentTypes;
      else delete customTypes[selectedBrand];
      const customTypeColors = { ...preferences.customTypeColors };
      delete customTypeColors[key];
      const typeTareDefaults = { ...preferences.typeTareDefaults };
      delete typeTareDefaults[key];
      next = {
        ...preferences,
        customTypes,
        customTypeColors,
        typeTareDefaults,
        hiddenTypes: preferences.hiddenTypes.filter(
          (item) => item !== key && item !== type,
        ),
        hiddenColors: preferences.hiddenColors.filter(
          (item) => !item.startsWith(`color:${selectedBrand}/${type}/`),
        ),
      };
      setSelectedType(null);
      setMobileStep('type');
    } else if (pendingDelete.kind === 'color') {
      const hex = normalizeColorId(pendingDelete.id);
      const typeKey =
        selectedBrand && selectedType
          ? typeOptionId(selectedBrand, selectedType)
          : null;
      const removeGlobal = pendingDelete.scope !== 'type' || !typeKey;
      const customTypeColors = { ...preferences.customTypeColors };
      if (!removeGlobal && typeKey) {
        customTypeColors[typeKey] = (customTypeColors[typeKey] || []).filter(
          (color) => normalizeColorId(color.hex) !== hex,
        );
      }
      next = {
        ...preferences,
        customColors: removeGlobal
          ? preferences.customColors.filter(
              (color) => normalizeColorId(color.hex) !== hex,
            )
          : preferences.customColors,
        customTypeColors,
        hiddenColors: preferences.hiddenColors.filter(
          (item) => {
            if (removeGlobal) {
              return item !== pendingDelete.label && normalizeColorId(item) !== hex;
            }
            return (
              item !==
              scopedColorId(selectedBrand!, selectedType!, hex)
            );
          },
        ),
      };
    }
    onChange(next);
    setPendingDelete(null);
  };

  const requestCloseEditor = async () => {
    if (editorDirty) {
      const confirmed = await confirmAction({
        title: '放弃未保存的目录编辑？',
        message: '当前品牌、型号或颜色表单内容尚未保存。',
        confirmLabel: '放弃修改',
        cancelLabel: '继续编辑',
        destructive: true,
      });
      if (!confirmed) return;
    }
    setEditor(null);
    setEditorDirty(false);
  };

  return (
    <View style={[styles.page, embedded && styles.embeddedPage]}>
      <View style={[styles.pageInner, embedded && styles.embeddedInner]}>
        {!embedded ? (
          <View style={styles.header}>
          <Pressable
            accessibilityLabel="返回设置"
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <ArrowLeft color={colors.ink} size={17} />
            <Text style={styles.backText}>返回设置</Text>
          </Pressable>
          <View style={styles.pageTitleBlock}>
            <Text style={styles.pageBreadcrumb}>设置 / 耗材目录</Text>
            <Text style={styles.pageTitle}>耗材目录</Text>
            <Text style={styles.subtitle}>
              品牌 → 型号 → 颜色与默认空盘皮重
            </Text>
          </View>
          </View>
        ) : null}

        <CatalogBody embedded={embedded}>
            <View style={[styles.columns, !desktop && styles.columnsMobile]}>
              {(desktop || mobileStep === 'brand') ? (
              <View style={[styles.pane, desktop ? styles.brandPane : styles.paneMobile]}>
                <View style={styles.paneHeader}>
                  <Text style={styles.paneTitle}>品牌</Text>
                  <Pressable
                    accessibilityLabel="新增品牌"
                    onPress={openCreateBrand}
                    style={styles.addNodeButton}
                  >
                    <Plus color={colors.white} size={17} />
                    <Text style={styles.addNodeText}>新增</Text>
                  </Pressable>
                </View>
                <View style={styles.nodeList}>
                  {allBrands.map((brand) => {
                    const active = brand === selectedBrand;
                    const hidden = preferences.hiddenBrands.includes(brand);
                    const custom = preferences.customBrands.includes(brand);
                    return (
                      <View
                        key={brand}
                        style={[
                          styles.nodeRow,
                          active && styles.nodeRowActive,
                          hidden && !active && styles.nodeRowHidden,
                        ]}
                      >
                        <Pressable
                          accessibilityLabel={`选择品牌 ${brand}`}
                          onPress={() => {
                            setSelectedBrand(brand);
                            if (!desktop) setMobileStep('type');
                          }}
                          style={styles.nodeSelect}
                        >
                          <Text
                            style={[
                              styles.nodeName,
                              active && styles.nodeNameActive,
                            ]}
                          >
                            {brand}
                          </Text>
                          <Text style={styles.nodeMeta}>
                            {getOfficialTypes(brand, catalog, presets).length +
                              (preferences.customTypes[brand] || []).length}{' '}
                            个型号
                          </Text>
                        </Pressable>
                        <Switch
                          accessibilityLabel={`显示品牌 ${brand}`}
                          onValueChange={() => {
                            setSelectedBrand(brand);
                            toggleBrand(brand);
                          }}
                          thumbColor={colors.white}
                          trackColor={{ false: '#C9CEC8', true: colors.primary }}
                          value={!hidden}
                        />
                        {custom ? (
                          <>
                            <Pressable
                              accessibilityLabel={`编辑品牌 ${brand}`}
                              onPress={() => openEditBrand(brand)}
                              style={styles.smallIcon}
                            >
                              <Pencil color={colors.muted} size={16} />
                            </Pressable>
                            <Pressable
                              accessibilityLabel={`删除品牌 ${brand}`}
                              onPress={() =>
                                setPendingDelete({
                                  kind: 'brand',
                                  id: brand,
                                  label: brand,
                                })
                              }
                              style={styles.smallIcon}
                            >
                              <Trash2 color={colors.danger} size={16} />
                            </Pressable>
                          </>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
              ) : null}

              {(desktop || mobileStep === 'type') ? (
              <View style={[styles.pane, desktop ? styles.typePane : styles.paneMobile]}>
                {!desktop ? (
                  <Pressable
                    accessibilityLabel="返回品牌列表"
                    onPress={() => setMobileStep('brand')}
                    style={styles.mobileBack}
                  >
                    <ArrowLeft color={colors.ink} size={16} />
                    <Text style={styles.backText}>品牌列表</Text>
                  </Pressable>
                ) : null}
                <View style={styles.paneHeader}>
                  <Text style={styles.paneTitle}>
                    型号{selectedBrand ? ` · ${selectedBrand}` : ''}
                  </Text>
                  <Pressable
                    accessibilityLabel="新增型号"
                    disabled={!selectedBrand}
                    onPress={openCreateType}
                    style={[styles.addNodeButton, !selectedBrand && styles.disabled]}
                  >
                    <Plus color={colors.white} size={17} />
                    <Text style={styles.addNodeText}>新增</Text>
                  </Pressable>
                </View>
                <View style={styles.nodeList}>
                  {allTypes.map((type) => {
                    const active = type === selectedType;
                    const custom = !officialTypes.includes(type);
                    const hidden = isTypeHidden(
                      preferences,
                      selectedBrand!,
                      type,
                    );
                    return (
                      <View
                        key={type}
                        style={[
                          styles.nodeRow,
                          active && styles.nodeRowActive,
                          hidden && !active && styles.nodeRowHidden,
                        ]}
                      >
                        <Pressable
                          accessibilityLabel={`选择型号 ${type}`}
                          onPress={() => {
                            setSelectedType(type);
                            if (!desktop) setMobileStep('detail');
                          }}
                          style={styles.nodeSelect}
                        >
                          <Text
                            style={[
                              styles.nodeName,
                              active && styles.nodeNameActive,
                            ]}
                          >
                            {type}
                          </Text>
                          <Text style={styles.nodeMeta}>
                            {colorsForType(
                              preferences,
                              selectedBrand!,
                              type,
                            ).length}{' '}
                            个颜色
                          </Text>
                        </Pressable>
                        <Switch
                          accessibilityLabel={`显示型号 ${type}`}
                          disabled={brandHidden}
                          onValueChange={() => {
                            setSelectedType(type);
                            toggleType(type);
                          }}
                          thumbColor={colors.white}
                          trackColor={{ false: '#C9CEC8', true: colors.primary }}
                          value={!hidden}
                        />
                        {custom ? (
                          <>
                            <Pressable
                              accessibilityLabel={`编辑型号 ${type}`}
                              onPress={() => openEditType(type)}
                              style={styles.smallIcon}
                            >
                              <Pencil color={colors.muted} size={16} />
                            </Pressable>
                            <Pressable
                              accessibilityLabel={`删除型号 ${type}`}
                              onPress={() =>
                                setPendingDelete({
                                  kind: 'type',
                                  id: type,
                                  label: type,
                                })
                              }
                              style={styles.smallIcon}
                            >
                              <Trash2 color={colors.danger} size={16} />
                            </Pressable>
                          </>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
              ) : null}

              {(desktop || mobileStep === 'detail') ? (
              <View style={[styles.details, desktop ? styles.detailsDesktop : styles.paneMobile]}>
                {!desktop ? (
                  <Pressable
                    accessibilityLabel="返回型号列表"
                    onPress={() => setMobileStep('type')}
                    style={styles.mobileBack}
                  >
                    <ArrowLeft color={colors.ink} size={16} />
                    <Text style={styles.backText}>型号列表</Text>
                  </Pressable>
                ) : null}
                {selectedBrand && selectedType ? (
                  <>
                    <View style={styles.detailHeading}>
                      <View>
                        <Text style={styles.detailTitle}>{selectedType}</Text>
                        <Text style={styles.detailMeta}>{selectedBrand}</Text>
                      </View>
                      {brandHidden || typeLocked ? (
                        <View style={styles.lockBadge}>
                          <Text style={styles.lockText}>已隐藏</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>默认空盘皮重</Text>
                      <Text style={styles.sectionHint}>
                        该型号在称重时会自动使用这里的预设
                      </Text>
                      <Pressable
                        accessibilityLabel={`选择默认皮重 ${selectedType}`}
                        onPress={() => setTareOpen((open) => !open)}
                        style={styles.selectTrigger}
                      >
                        <View style={styles.selectCopy}>
                          <Text style={styles.selectName}>
                            {selectedTare?.name || '未选择'}
                          </Text>
                          <Text style={styles.nodeMeta}>
                            {selectedTare ? `${selectedTare.grams} g` : ''}
                          </Text>
                        </View>
                        {tareOpen ? (
                          <ChevronDown color={colors.muted} size={17} />
                        ) : (
                          <ChevronRight color={colors.muted} size={17} />
                        )}
                      </Pressable>
                      {tareOpen ? (
                        <View style={styles.optionList}>
                          {tareOptions.map((preset) => (
                            <Pressable
                              accessibilityLabel={`设置默认皮重 ${preset.name}`}
                              key={preset.id}
                              onPress={() => selectTare(preset.id)}
                              style={[
                                styles.optionRow,
                                preset.id === selectedTare?.id &&
                                  styles.optionRowActive,
                              ]}
                            >
                              <View style={styles.nodeSelect}>
                                <Text style={styles.nodeName}>{preset.name}</Text>
                                <Text style={styles.nodeMeta}>
                                  {preset.grams} g
                                </Text>
                              </View>
                              {preset.id === selectedTare?.id ? (
                                <Check color={colors.primary} size={16} />
                              ) : null}
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <View>
                          <Text style={styles.sectionTitle}>颜色</Text>
                          <Text style={styles.sectionHint}>
                            该型号可用的官方色与自定义色
                          </Text>
                        </View>
                        <Pressable
                          accessibilityLabel="新增型号颜色"
                          onPress={openCreateColor}
                          style={styles.secondaryButton}
                        >
                          <Plus color={colors.ink} size={16} />
                          <Text style={styles.secondaryText}>新增颜色</Text>
                        </Pressable>
                      </View>

                      <View style={styles.nodeList}>
                        {typeColors.map((color, index) => {
                          const colorSource = getColorSource(
                            preferences,
                            typeId,
                            color,
                          );
                          const custom = colorSource !== 'official';
                          const hidden = isColorHidden(
                            preferences,
                            selectedBrand,
                            selectedType,
                            color,
                          );
                          return (
                            <View
                              key={`${color.hex}-${index}`}
                              style={[
                                styles.colorRow,
                                hidden && styles.colorRowHidden,
                              ]}
                            >
                              <View
                                style={[
                                  styles.colorSwatch,
                                  { backgroundColor: color.hex },
                                ]}
                              />
                              <View style={styles.nodeSelect}>
                                <Text style={styles.nodeName}>{color.name}</Text>
                                <Text style={styles.nodeMeta}>
                                  {normalizeColorId(color.hex)}
                                  {colorSource === 'type'
                                    ? ' · 型号自定义色'
                                    : colorSource === 'global'
                                      ? ' · 通用自定义色'
                                      : ''}
                                </Text>
                              </View>
                              <Switch
                                accessibilityLabel={`显示颜色 ${color.name}`}
                                disabled={typeLocked}
                                onValueChange={() => toggleColor(color)}
                                thumbColor={colors.white}
                                trackColor={{
                                  false: '#C9CEC8',
                                  true: colors.primary,
                                }}
                                value={!hidden}
                              />
                              {custom ? (
                                <>
                                  <Pressable
                                    accessibilityLabel={`编辑颜色 ${color.name}`}
                                    onPress={() => openEditColor(color)}
                                    style={styles.smallIcon}
                                  >
                                    <Pencil color={colors.muted} size={16} />
                                  </Pressable>
                                  <Pressable
                                    accessibilityLabel={`删除颜色 ${color.name}`}
                                    onPress={() =>
                                      setPendingDelete({
                                        kind: 'color',
                                        id: normalizeColorId(color.hex),
                                        label: color.name,
                                        scope:
                                          colorSource === 'global'
                                            ? 'global'
                                            : 'type',
                                      })
                                    }
                                    style={styles.smallIcon}
                                  >
                                    <Trash2 color={colors.danger} size={16} />
                                  </Pressable>
                                </>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.emptyDetail}>
                    <Text style={styles.emptyTitle}>选择一个型号</Text>
                    <Text style={styles.emptyText}>
                      在左侧选择品牌和型号后配置颜色及默认皮重
                    </Text>
                  </View>
                )}
              </View>
              ) : null}
            </View>
        </CatalogBody>

        <DeleteConfirmationModal
          target={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      </View>
      <CatalogEditorModal
        editor={editor}
        colorHex={colorHex}
        error={editorError}
        name={editorName}
        onColorChange={(value) => {
          setColorHex(value);
          setEditorDirty(true);
        }}
        onClose={requestCloseEditor}
        onNameChange={(value) => {
          setEditorName(value);
          setEditorDirty(true);
        }}
        onSave={saveEditor}
      />
    </View>
  );
}

function CatalogBody({
  embedded,
  children,
}: {
  embedded: boolean;
  children: React.ReactNode;
}) {
  if (embedded) return <View style={styles.embeddedBody}>{children}</View>;
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.body}
    >
      {children}
    </ScrollView>
  );
}

function CatalogEditorModal({
  editor,
  name,
  colorHex,
  error,
  onNameChange,
  onColorChange,
  onSave,
  onClose,
}: {
  editor: EditorState | null;
  name: string;
  colorHex: string;
  error: string;
  onNameChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  if (!editor) return null;
  const label =
    editor.kind === 'brand'
      ? '品牌'
      : editor.kind === 'type'
        ? '型号'
        : '颜色';
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={styles.backdrop} />
        <View style={[styles.dialog, styles.formDialog]}>
          <View style={styles.formHeader}>
            <View>
              <Text style={styles.title}>
                {editor.mode === 'edit' ? `编辑${label}` : `新增${label}`}
              </Text>
              <Text style={styles.subtitle}>
                {editor.kind === 'color'
                  ? '为当前型号设置颜色名称和色值'
                  : `填写${label}名称后保存`}
              </Text>
            </View>
            <Pressable accessibilityLabel="关闭表单" onPress={onClose} style={styles.close}>
              <X color={colors.ink} size={19} />
            </Pressable>
          </View>
          <View style={styles.editorBody}>
            <TextInput
              autoFocus
              onChangeText={onNameChange}
              placeholder={
                editor.kind === 'brand'
                  ? '品牌名称'
                  : editor.kind === 'type'
                    ? '型号名称'
                    : '颜色名称'
              }
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={name}
            />
            {editor.kind === 'color' ? (
              <ColorPicker onChange={onColorChange} value={colorHex} />
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.formActions}>
              <Pressable
                accessibilityLabel={`保存${label}`}
                onPress={onSave}
                style={styles.primaryButton}
              >
                <Check color={colors.white} size={17} />
                <Text style={styles.primaryText}>保存</Text>
              </Pressable>
              <Pressable onPress={onClose} style={styles.cancelButton}>
                <Text style={styles.cancelText}>取消</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DeleteConfirmationModal({
  target,
  onCancel,
  onConfirm,
}: {
  target: DeleteTarget | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!target) return null;
  const description =
    target.kind === 'brand'
      ? '该品牌及其关联的型号颜色、隐藏状态和默认皮重配置都会被清理。已有云端料盘不会修改。'
      : target.kind === 'type'
        ? '该型号关联的颜色、隐藏状态和默认皮重配置都会被清理。已有云端料盘不会修改。'
        : '该自定义颜色及其相关隐藏记录会被清理。已有云端料盘不会修改。';

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible>
      <View style={styles.overlay}>
        <Pressable onPress={onCancel} style={styles.backdrop} />
        <View style={[styles.dialog, styles.deleteDialog]}>
          <Text style={styles.deleteDialogTitle}>删除“{target.label}”？</Text>
          <Text style={styles.deleteDialogText}>{description}</Text>
          <View style={styles.deleteDialogActions}>
            <Pressable onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="确认目录删除"
              onPress={onConfirm}
              style={styles.deleteButton}
            >
              <Text style={styles.primaryText}>删除</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function getOfficialBrands(catalog: CatalogEntry[], presets: CatalogEntry[]) {
  const cloud = unique(
    [...catalog, ...presets].map((entry) => entry.vendor).filter(Boolean),
  );
  return cloud.length ? cloud : brandOptions;
}

function getOfficialTypes(
  brand: string,
  catalog: CatalogEntry[],
  presets: CatalogEntry[],
) {
  const cloud = unique(
    [...catalog, ...presets]
      .filter((entry) => entry.vendor === brand)
      .map((entry) => entry.name)
      .filter(Boolean),
  );
  return cloud.length ? cloud : filamentCatalog[brand] || [];
}

function getColorSource(
  preferences: AppPreferences,
  typeId: string,
  color: LocalColor,
) {
  const typed = (preferences.customTypeColors[typeId] || []).some(
    (item) =>
      item.name === color.name &&
      normalizeColorId(item.hex) === normalizeColorId(color.hex),
  );
  if (typed) return 'type' as const;
  const global = preferences.customColors.some(
    (item) =>
      item.name === color.name &&
      normalizeColorId(item.hex) === normalizeColorId(color.hex),
  );
  return global ? ('global' as const) : ('official' as const);
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function sortHiddenLast<T>(items: T[], hidden: (item: T) => boolean) {
  return [
    ...items.filter((item) => !hidden(item)),
    ...items.filter(hidden),
  ];
}

function filterRecord<T>(
  value: Record<string, T>,
  keep: (key: string) => boolean,
) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => keep(key)));
}

function renameRecordPrefix<T>(
  value: Record<string, T>,
  oldPrefix: string,
  newPrefix: string,
) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key.startsWith(oldPrefix)
        ? `${newPrefix}${key.slice(oldPrefix.length)}`
        : key,
      item,
    ]),
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.background,
    flex: 1,
  },
  embeddedPage: {
    backgroundColor: 'transparent',
    flex: 0,
  },
  pageInner: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 1200,
    paddingHorizontal: 24,
    paddingTop: 10,
    width: '100%',
  },
  embeddedInner: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  dialog: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    maxHeight: '92%',
    width: '100%',
    ...shadow,
    overflow: 'hidden',
  },
  dialogDesktop: {
    maxWidth: 1040,
  },
  formDialog: {
    maxWidth: 620,
    paddingBottom: 18,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 16,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  backText: {
    color: colors.ink,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  pageTitleBlock: {
    flex: 1,
  },
  pageBreadcrumb: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  pageTitle: {
    ...type.display,
    color: colors.ink,
    fontFamily: 'Inter_700Bold',
  },
  title: {
    color: colors.ink,
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  close: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  body: {
    flex: 1,
  },
  embeddedBody: {
    width: '100%',
  },
  formHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  editorBody: {
    gap: 12,
    padding: 18,
  },
  columns: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  columnsMobile: {
    flexDirection: 'column',
  },
  pane: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    padding: 12,
  },
  brandPane: {
    width: 250,
  },
  typePane: {
    width: 220,
  },
  paneMobile: {
    width: '100%',
  },
  details: {
    gap: 16,
  },
  detailsDesktop: {
    flex: 1,
    minWidth: 0,
  },
  paneTitle: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  paneHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inlineAdd: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  inlineInput: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    minHeight: 36,
    minWidth: 0,
    outlineWidth: 0,
    paddingHorizontal: 9,
  },
  addNodeButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.medium,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 10,
  },
  addNodeText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  mobileBack: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginBottom: 10,
    minHeight: 32,
  },
  nodeList: {
    gap: 6,
    marginTop: 10,
  },
  nodeRow: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 54,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  nodeRowActive: {
    backgroundColor: colors.mint,
    borderColor: colors.primary,
  },
  nodeRowHidden: {
    opacity: 0.62,
  },
  nodeSelect: {
    flex: 1,
    minWidth: 0,
  },
  nodeName: {
    color: colors.ink,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  nodeNameActive: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  nodeMeta: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 1,
  },
  smallIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  detailHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailTitle: {
    color: colors.ink,
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
  },
  detailMeta: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  lockBadge: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  lockText: {
    color: colors.danger,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  section: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    padding: 12,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  sectionHint: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  selectTrigger: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 10,
    minHeight: 48,
    paddingHorizontal: 10,
  },
  selectCopy: {
    flex: 1,
  },
  selectName: {
    color: colors.ink,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  optionList: {
    gap: 5,
    marginTop: 6,
  },
  optionRow: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 44,
    paddingHorizontal: 9,
  },
  optionRowActive: {
    backgroundColor: colors.mint,
    borderColor: colors.primary,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  secondaryText: {
    color: colors.ink,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  colorRow: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 54,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  colorRowHidden: {
    opacity: 0.62,
  },
  colorSwatch: {
    borderColor: colors.line,
    borderRadius: 7,
    borderWidth: 1,
    height: 24,
    width: 24,
  },
  colorEditor: {
    gap: 10,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    minHeight: 42,
    outlineWidth: 0,
    paddingHorizontal: 11,
  },
  formActions: {
    flexDirection: 'row',
    gap: 7,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.medium,
    flexDirection: 'row',
    gap: 5,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  primaryText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
  },
  cancelText: {
    color: colors.ink,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  error: {
    color: colors.danger,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  emptyDetail: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 220,
    padding: 20,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: radii.medium,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 14,
  },
  deleteDialog: {
    maxWidth: 460,
    padding: 20,
  },
  deleteDialogTitle: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
  },
  deleteDialogText: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  deleteDialogActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 18,
  },
  deleteBar: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  deleteText: {
    color: colors.danger,
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.62,
  },
});
