import AsyncStorage from '@react-native-async-storage/async-storage';

export type SpoolWeightPreference = {
  tarePresetId: string;
  extraPresetId: string;
};

export type LocalPreset = {
  id: string;
  name: string;
  grams: number;
  brand?: string;
  type?: string;
};

export type LocalPresetOverride = {
  name: string;
  grams: number;
  brand?: string;
  type?: string;
};

export type LocalColor = {
  name: string;
  hex: string;
};

export type AppPreferences = {
  schemaVersion: 1;
  forceRfidEdit: boolean;
  defaultTarePresetId: string;
  defaultExtraPresetId: string;
  customBrands: string[];
  customTypes: Record<string, string[]>;
  customColors: LocalColor[];
  customTypeColors: Record<string, LocalColor[]>;
  typeTareDefaults: Record<string, string>;
  customTarePresets: LocalPreset[];
  customExtraPresets: LocalPreset[];
  tarePresetOverrides: Record<string, LocalPresetOverride>;
  extraPresetOverrides: Record<string, LocalPresetOverride>;
  hiddenBrands: string[];
  hiddenTypes: string[];
  hiddenColors: string[];
  hiddenTarePresetIds: string[];
  hiddenExtraPresetIds: string[];
  spoolWeights: Record<string, SpoolWeightPreference>;
};

const STORAGE_KEY = 'yuliang-preferences-v1';
let saveQueue: Promise<void> = Promise.resolve();

export const defaultPreferences: AppPreferences = {
  schemaVersion: 1,
  forceRfidEdit: false,
  defaultTarePresetId: 'generic-200',
  defaultExtraPresetId: 'extra-none',
  customBrands: [],
  customTypes: {},
  customColors: [],
  customTypeColors: {},
  typeTareDefaults: {},
  customTarePresets: [],
  customExtraPresets: [],
  tarePresetOverrides: {},
  extraPresetOverrides: {},
  hiddenBrands: [],
  hiddenTypes: [],
  hiddenColors: [],
  hiddenTarePresetIds: [],
  hiddenExtraPresetIds: [],
  spoolWeights: {},
};

function unique(values: unknown) {
  return Array.isArray(values)
    ? [...new Set(values.filter((value): value is string => typeof value === 'string'))]
    : [];
}

function normalizeDefaultTarePresetId(value: unknown) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (
    id &&
    !['bambu-160', 'sunlu-200', 'esun-220', 'polymaker-200'].includes(id)
  ) {
    return id;
  }
  return 'generic-200';
}

export function normalizePreferences(value: unknown): AppPreferences {
  if (!value || typeof value !== 'object') return { ...defaultPreferences };
  const raw = value as Partial<AppPreferences>;
  return {
    schemaVersion: 1,
    forceRfidEdit: Boolean(raw.forceRfidEdit),
    defaultTarePresetId: normalizeDefaultTarePresetId(raw.defaultTarePresetId),
    defaultExtraPresetId:
      typeof raw.defaultExtraPresetId === 'string'
        ? raw.defaultExtraPresetId
        : defaultPreferences.defaultExtraPresetId,
    customBrands: unique(raw.customBrands),
    customTypes:
      raw.customTypes && typeof raw.customTypes === 'object'
        ? Object.fromEntries(
            Object.entries(raw.customTypes).map(([key, items]) => [key, unique(items)]),
          )
        : {},
    customColors: normalizeColors(raw.customColors),
    customTypeColors: normalizeTypeColors(raw.customTypeColors),
    typeTareDefaults:
      raw.typeTareDefaults && typeof raw.typeTareDefaults === 'object'
        ? Object.fromEntries(
            Object.entries(raw.typeTareDefaults)
              .filter(([, value]) => typeof value === 'string')
              .map(([key, value]) => [key, value as string]),
          )
        : {},
    customTarePresets: normalizePresets(raw.customTarePresets),
    customExtraPresets: normalizePresets(raw.customExtraPresets),
    tarePresetOverrides: normalizePresetOverrides(raw.tarePresetOverrides),
    extraPresetOverrides: normalizePresetOverrides(raw.extraPresetOverrides),
    hiddenBrands: unique(raw.hiddenBrands),
    hiddenTypes: unique(raw.hiddenTypes),
    hiddenColors: unique(raw.hiddenColors),
    hiddenTarePresetIds: unique(raw.hiddenTarePresetIds).filter(
      (id) =>
        id !== 'generic-200' &&
        !['bambu-160', 'sunlu-200', 'esun-220', 'polymaker-200'].includes(id),
    ),
    hiddenExtraPresetIds: unique(raw.hiddenExtraPresetIds),
    spoolWeights:
      raw.spoolWeights && typeof raw.spoolWeights === 'object'
        ? Object.fromEntries(
            Object.entries(raw.spoolWeights)
              .filter(([, value]) => value && typeof value === 'object')
              .map(([key, value]) => [
                key,
                {
                  tarePresetId: String(
                    (value as SpoolWeightPreference).tarePresetId || '',
                  ),
                  extraPresetId: String(
                    (value as SpoolWeightPreference).extraPresetId || '',
                  ),
                },
              ])
              .filter(
                ([, value]) =>
                  (value as SpoolWeightPreference).tarePresetId &&
                  (value as SpoolWeightPreference).extraPresetId,
              ),
          )
        : {},
  };
}

function normalizePresets(value: unknown): LocalPreset[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map<string, LocalPreset>();
  value
    .filter((preset) => preset && typeof preset === 'object')
    .map((preset) => {
      const grams = Math.round(Number(preset.grams || 0));
      return {
        id: String(
          preset.id ||
            `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ),
        name: String(preset.name || ''),
        grams: Number.isFinite(grams) ? grams : 0,
        brand: String(preset.brand || '').trim() || undefined,
        type: String(preset.type || '').trim() || undefined,
      };
    })
    .filter(
      (preset) => preset.name && preset.grams >= 0 && preset.grams <= 20000,
    )
    .forEach((preset) => byId.set(preset.id, preset));
  const identities = new Set<string>();
  return [...byId.values()].filter((preset) => {
    const identity = `${preset.name.trim().toLocaleLowerCase()}|${preset.grams}`;
    if (identities.has(identity)) return false;
    identities.add(identity);
    return true;
  });
}

function normalizeColors(value: unknown): LocalColor[] {
  if (!Array.isArray(value)) return [];
  const byIdentity = new Map<string, LocalColor>();
  value
    .filter((color) => color && typeof color === 'object')
    .map((color) => ({
      name: String(color.name || '').trim(),
      hex: String(color.hex || '').toUpperCase(),
    }))
    .filter((color) => color.name && /^#[0-9A-F]{6}$/.test(color.hex))
    .forEach((color) => {
      byIdentity.set(
        `${color.name.toLocaleLowerCase()}|${color.hex}`,
        color,
      );
    });
  return [...byIdentity.values()];
}

function normalizeTypeColors(value: unknown): Record<string, LocalColor[]> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, colors]) => [key, normalizeColors(colors)] as const)
      .filter(([, colors]) => colors.length > 0),
  );
}

function normalizePresetOverrides(
  value: unknown,
): Record<string, LocalPresetOverride> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, override]) => override && typeof override === 'object')
      .map(([id, override]) => {
        const grams = Math.round(
          Number((override as LocalPresetOverride).grams || 0),
        );
        return [
          id,
          {
            name: String((override as LocalPresetOverride).name || ''),
            grams: Number.isFinite(grams) ? grams : 0,
            brand:
              String((override as LocalPresetOverride).brand || '').trim() ||
              undefined,
            type:
              String((override as LocalPresetOverride).type || '').trim() ||
              undefined,
          },
        ] as const;
      })
      .filter(([, override]) => {
        const preset = override as LocalPresetOverride;
        return preset.name && preset.grams >= 0 && preset.grams <= 20000;
      }),
  );
}

export async function loadPreferences(): Promise<AppPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? normalizePreferences(JSON.parse(raw)) : { ...defaultPreferences };
  } catch {
    return { ...defaultPreferences };
  }
}

export async function savePreferences(preferences: AppPreferences) {
  const content = JSON.stringify(preferences);
  saveQueue = saveQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(STORAGE_KEY, content));
  await saveQueue;
}

export function mergePreferences(
  current: AppPreferences,
  incomingRaw: unknown,
): AppPreferences {
  const incoming = normalizePreferences(incomingRaw);
  const hasIncomingField = (key: keyof AppPreferences) =>
    Boolean(
      incomingRaw &&
        typeof incomingRaw === 'object' &&
        Object.prototype.hasOwnProperty.call(incomingRaw, key),
    );
  const typeVendors = new Set([
    ...Object.keys(current.customTypes),
    ...Object.keys(incoming.customTypes),
  ]);
  const typeColorKeys = new Set([
    ...Object.keys(current.customTypeColors),
    ...Object.keys(incoming.customTypeColors),
  ]);
  return normalizePreferences({
    ...current,
    ...incoming,
    forceRfidEdit: hasIncomingField('forceRfidEdit')
      ? incoming.forceRfidEdit
      : current.forceRfidEdit,
    defaultTarePresetId: hasIncomingField('defaultTarePresetId')
      ? incoming.defaultTarePresetId
      : current.defaultTarePresetId,
    defaultExtraPresetId: hasIncomingField('defaultExtraPresetId')
      ? incoming.defaultExtraPresetId
      : current.defaultExtraPresetId,
    customBrands: [...current.customBrands, ...incoming.customBrands],
    hiddenBrands: [...current.hiddenBrands, ...incoming.hiddenBrands],
    hiddenTypes: [...current.hiddenTypes, ...incoming.hiddenTypes],
    hiddenColors: [...current.hiddenColors, ...incoming.hiddenColors],
    customTypes: Object.fromEntries(
      [...typeVendors].map((vendor) => [
        vendor,
        unique([
          ...(current.customTypes[vendor] || []),
          ...(incoming.customTypes[vendor] || []),
        ]),
      ]),
    ),
    customColors: [...current.customColors, ...incoming.customColors],
    customTypeColors: Object.fromEntries(
      [...typeColorKeys].map((key) => [
        key,
        [...(current.customTypeColors[key] || []), ...(incoming.customTypeColors[key] || [])],
      ]),
    ),
    typeTareDefaults: {
      ...current.typeTareDefaults,
      ...incoming.typeTareDefaults,
    },
    customTarePresets: [...current.customTarePresets, ...incoming.customTarePresets],
    customExtraPresets: [...current.customExtraPresets, ...incoming.customExtraPresets],
    tarePresetOverrides: {
      ...current.tarePresetOverrides,
      ...incoming.tarePresetOverrides,
    },
    extraPresetOverrides: {
      ...current.extraPresetOverrides,
      ...incoming.extraPresetOverrides,
    },
    hiddenTarePresetIds: [
      ...current.hiddenTarePresetIds,
      ...incoming.hiddenTarePresetIds,
    ],
    hiddenExtraPresetIds: [
      ...current.hiddenExtraPresetIds,
      ...incoming.hiddenExtraPresetIds,
    ],
    spoolWeights: {
      ...current.spoolWeights,
      ...incoming.spoolWeights,
    },
  });
}
