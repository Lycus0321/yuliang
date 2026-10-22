import {
  bambuColors,
  colorsForFilament,
  extraWeightPresets,
  spoolTarePresets,
  type FilamentColor,
  type TarePreset,
} from './catalog';
import type { AppPreferences } from './preferences';

export function normalizeColorId(hex: string) {
  return hex.toUpperCase();
}

export function scopedColorId(vendor: string, type: string, hex: string) {
  return `color:${vendor}/${type}/${normalizeColorId(hex)}`;
}

export function typeOptionId(vendor: string, type: string) {
  return `${vendor}/${type}`;
}

export function parseTypeOptionId(id: string) {
  const separator = id.indexOf('/');
  if (separator < 1) return null;
  const vendor = id.slice(0, separator).trim();
  const type = id.slice(separator + 1).trim();
  return vendor && type ? { vendor, type } : null;
}

export function isTypeHidden(
  preferences: AppPreferences,
  vendor: string,
  type: string,
) {
  return (
    preferences.hiddenBrands.includes(vendor) ||
    preferences.hiddenTypes.includes(typeOptionId(vendor, type)) ||
    preferences.hiddenTypes.includes(type)
  );
}

export function isColorHidden(
  preferences: AppPreferences,
  vendor: string,
  type: string,
  color: FilamentColor,
) {
  const hex = normalizeColorId(color.hex);
  return (
    isTypeHidden(preferences, vendor, type) ||
    preferences.hiddenColors.includes(color.name) ||
    preferences.hiddenColors.includes(hex) ||
    preferences.hiddenColors.includes(scopedColorId(vendor, type, hex))
  );
}

export function allTarePresets(preferences: AppPreferences): TarePreset[] {
  return [...spoolTarePresets, ...preferences.customTarePresets].map((preset) => ({
    ...preset,
    ...preferences.tarePresetOverrides[preset.id],
  }));
}

export function allExtraPresets(preferences: AppPreferences): TarePreset[] {
  return [...extraWeightPresets, ...preferences.customExtraPresets].map((preset) => ({
    ...preset,
    ...preferences.extraPresetOverrides[preset.id],
  }));
}

export function availableTarePresets(preferences: AppPreferences): TarePreset[] {
  return allTarePresets(preferences).filter(
    (preset) => !preferences.hiddenTarePresetIds.includes(preset.id),
  );
}

export function findTarePresetForFilament(
  preferences: AppPreferences,
  brand: string,
  type: string,
) {
  const presets = availableTarePresets(preferences);
  const brandKey = brand.trim().toLowerCase();
  const typeKey = type.trim().toLowerCase();
  const typeId = typeOptionId(brand, type);
  const normalized = presets.map((preset) => ({
    preset,
    brand: preset.brand?.trim().toLowerCase() || '',
    type: preset.type?.trim().toLowerCase() || '',
  }));
  return (
    presets.find(
      (preset) => preset.id === preferences.typeTareDefaults[typeId],
    ) ||
    normalized.find(
      (item) => item.brand === brandKey && item.type === typeKey,
    )?.preset ||
    normalized.find(
      (item) => item.brand === brandKey && !item.type,
    )?.preset ||
    normalized.find(
      (item) => !item.brand && item.type === typeKey,
    )?.preset
  );
}

export function colorsForType(
  preferences: AppPreferences,
  brand: string,
  type: string,
): FilamentColor[] {
  const typeId = typeOptionId(brand, type);
  return [
    ...colorsForFilament(brand, type),
    ...preferences.customColors,
    ...(preferences.customTypeColors[typeId] || []),
  ].filter(
    (color, index, list) =>
      list.findIndex(
        (item) =>
          item.name === color.name &&
          item.hex.toUpperCase() === color.hex.toUpperCase(),
      ) === index,
  );
}

export function availableExtraPresets(preferences: AppPreferences): TarePreset[] {
  return allExtraPresets(preferences).filter(
    (preset) => !preferences.hiddenExtraPresetIds.includes(preset.id),
  );
}

export function availableColors(preferences: AppPreferences): FilamentColor[] {
  return [...bambuColors, ...preferences.customColors].filter(
    (color) =>
      !preferences.hiddenColors.includes(color.name) &&
      !preferences.hiddenColors.includes(color.hex),
  );
}
