import { Check, Palette, X } from 'lucide-react-native';
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
import { colors, radii, shadow, type } from '../theme';
import type { Spool, SpoolUpdate } from '../types';

type Props = {
  spool: Spool | null;
  visible: boolean;
  forceRfidEdit: boolean;
  onForceRfidEditChange: (value: boolean) => void;
  onClose: () => void;
  onSave: (spool: Spool, update: SpoolUpdate) => Promise<void>;
};

function normalizeColor(value: string) {
  const clean = value.trim().replace('#', '').slice(0, 6).toUpperCase();
  return /^[0-9A-F]{6}$/.test(clean) ? `#${clean}` : null;
}

export function EditSpoolSheet({
  spool,
  visible,
  forceRfidEdit,
  onForceRfidEditChange,
  onClose,
  onSave,
}: Props) {
  const [displayName, setDisplayName] = useState('');
  const [vendor, setVendor] = useState('');
  const [material, setMaterial] = useState('');
  const [color, setColor] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!spool || !visible) return;
    setDisplayName(spool.displayName || '');
    setVendor(spool.filamentVendor || '');
    setMaterial(spool.filamentType || '');
    setColor(spool.color?.startsWith('#') ? spool.color : `#${spool.color || '808080'}`);
    setNote(spool.note || '');
    setError('');
    setSaving(false);
  }, [spool, visible]);

  if (!spool) return null;

  const isRfid = spool.createType !== 'manual';
  const normalizedColor = normalizeColor(color);
  const canSave = Boolean(vendor.trim() && material.trim() && normalizedColor && !saving);

  const handleSave = async () => {
    if (!canSave || !normalizedColor) return;
    setSaving(true);
    setError('');
    try {
      const safeMode = isRfid && !forceRfidEdit;
      const originalVendor = spool.filamentVendor || '';
      const originalMaterial = spool.filamentType || '';
      const originalColor = normalizeColor(
        spool.color?.startsWith('#') ? spool.color : `#${spool.color || '808080'}`,
      );
      const changedIdentity =
        vendor.trim() !== originalVendor ||
        material.trim() !== originalMaterial ||
        normalizedColor !== originalColor;

      let nextDisplayName = displayName.trim().slice(0, 50);
      let nextNote = note.trim().slice(0, 50);
      const nameWasEdited = displayName.trim() !== (spool.displayName || '').trim();

      if (changedIdentity) {
        if (!nameWasEdited) {
          const nickname = (spool.displayName || '').trim();
          nextDisplayName = [
            vendor.trim(),
            material.trim(),
            nickname ? `· ${nickname}` : '',
          ]
            .filter(Boolean)
            .join(' ')
            .slice(0, 50);
        }
        const identity = [
          vendor.trim() ? `品牌:${vendor.trim()}` : '',
          material.trim() ? `类型:${material.trim()}` : '',
          normalizedColor ? `色:${normalizedColor}` : '',
        ]
          .filter(Boolean)
          .join(' ');
        nextNote = `${identity}${nextNote ? ` | ${nextNote}` : ''}`.slice(0, 50);
      }

      const update: SpoolUpdate = {
        displayName: nextDisplayName,
        note: nextNote,
      };
      if (!safeMode) {
        update.filamentVendor = vendor.trim();
        update.filamentType = material.trim();
        update.color = normalizedColor;
        update.colors = [normalizedColor];
      }

      await onSave(spool, update);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请稍后重试。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.eyebrowRow}>
                <Text style={styles.eyebrow}>编辑耗材</Text>
                <View style={[styles.typeBadge, isRfid ? styles.rfidBadge : styles.manualBadge]}>
                  <Text style={[styles.typeBadgeText, isRfid && styles.rfidText]}>
                    {isRfid ? 'RFID 识别' : '手动料盘'}
                  </Text>
                </View>
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {spool.displayName || spool.filamentName || '耗材'}
              </Text>
              <Text style={styles.subtitle}>保存后会重新读取云端，验证字段是否被接受。</Text>
            </View>
            <Pressable
              accessibilityLabel="关闭"
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <X color={colors.ink} size={20} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.form}>
              <View style={styles.forceRow}>
                <View style={styles.forceCopy}>
                  <Text style={styles.forceTitle}>强制修改 RFID 字段</Text>
                  <Text style={styles.forceHint}>
                    {forceRfidEdit
                      ? '将直接写入品牌、类型和颜色。'
                      : '仅把自定义信息写入名称和备注。'}
                  </Text>
                </View>
                <Switch
                  onValueChange={onForceRfidEditChange}
                  thumbColor={colors.white}
                  trackColor={{ false: '#C9CEC8', true: colors.primary }}
                  value={forceRfidEdit}
                />
              </View>

              <Field
                label="名称"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="例如 SUNLU PLA+ 哑光白"
              />
              <Field label="品牌" value={vendor} onChangeText={setVendor} placeholder="例如 SUNLU" />
              <Field
                label="类型"
                value={material}
                onChangeText={setMaterial}
                placeholder="例如 PLA+"
              />

              <View style={styles.field}>
                <View style={styles.colorLabelRow}>
                  <Text style={styles.label}>颜色</Text>
                  <View style={styles.colorPreviewWrap}>
                    <View
                      style={[
                        styles.colorPreview,
                        { backgroundColor: normalizedColor || colors.line },
                      ]}
                    />
                    <Text style={styles.colorPreviewText}>{normalizedColor || '格式错误'}</Text>
                  </View>
                </View>
                <View style={styles.colorInputRow}>
                  <Palette color={colors.muted} size={17} />
                  <TextInput
                    autoCapitalize="characters"
                    autoCorrect={false}
                    onChangeText={setColor}
                    placeholder="#RRGGBB"
                    placeholderTextColor="#969E98"
                    style={styles.colorInput}
                    value={color}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <View style={styles.noteLabelRow}>
                  <Text style={styles.label}>备注</Text>
                  <Text style={styles.counter}>{note.length}/50</Text>
                </View>
                <TextInput
                  maxLength={50}
                  multiline
                  onChangeText={setNote}
                  placeholder="添加只在这盘耗材上显示的备注"
                  placeholderTextColor="#969E98"
                  style={styles.noteInput}
                  textAlignVertical="top"
                  value={note}
                />
              </View>
            </View>

            {isRfid ? (
              <Text style={styles.info}>
                {forceRfidEdit
                  ? '强制模式会直接覆盖 RFID 料盘的云端品牌、类型和颜色，刷新 Studio 后可能被标签数据还原。'
                  : '安全模式保留 RFID 原始字段，把自定义品牌、类型和颜色写进名称与备注。'}
              </Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={!canSave}
              onPress={handleSave}
              style={({ pressed }) => [
                styles.save,
                !canSave && styles.saveDisabled,
                pressed && canSave && styles.savePressed,
              ]}
            >
              <Check color={colors.white} size={19} strokeWidth={2.4} />
              <Text style={styles.saveText}>
                {saving ? '写入并回读中...' : '保存并验证'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#969E98"
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  sheet: {
    alignSelf: 'center',
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '92%',
    maxWidth: 560,
    paddingTop: 9,
    width: '100%',
    ...shadow,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#C8CDC7',
    borderRadius: radii.pill,
    height: 4,
    marginBottom: 13,
    width: 38,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  headerTitleWrap: {
    flex: 1,
  },
  eyebrowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  typeBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  rfidBadge: {
    backgroundColor: colors.orangeSoft,
  },
  manualBadge: {
    backgroundColor: colors.mint,
  },
  typeBadgeText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
  rfidText: {
    color: colors.orange,
  },
  title: {
    ...type.title,
    color: colors.ink,
    marginTop: 4,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },
  close: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.small,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pressed: {
    opacity: 0.65,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  form: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  field: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  forceRow: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderColor: colors.mintStrong,
    borderRadius: radii.medium,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  forceCopy: {
    flex: 1,
    paddingRight: 12,
  },
  forceTitle: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  forceHint: {
    color: colors.primary,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 2,
    opacity: 0.72,
  },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  input: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    minHeight: 26,
    outlineColor: 'transparent',
    outlineWidth: 0,
    padding: 0,
  },
  colorLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colorPreviewWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  colorPreview: {
    borderColor: colors.line,
    borderRadius: 4,
    borderWidth: 1,
    height: 14,
    width: 14,
  },
  colorPreviewText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '600',
    lineHeight: 13,
  },
  colorInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 3,
  },
  colorInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    minHeight: 26,
    outlineColor: 'transparent',
    outlineWidth: 0,
    padding: 0,
  },
  noteLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  counter: {
    color: colors.muted,
    fontSize: 9,
    lineHeight: 13,
  },
  noteInput: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 58,
    outlineColor: 'transparent',
    outlineWidth: 0,
    padding: 0,
    paddingTop: 5,
  },
  info: {
    color: colors.orange,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  error: {
    color: colors.danger,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  save: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.medium,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    minHeight: 50,
  },
  savePressed: {
    backgroundColor: colors.primaryPressed,
  },
  saveDisabled: {
    opacity: 0.36,
  },
  saveText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
});
