import { Check, Keyboard, Pencil, Scale, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { readTare, writeTare } from '../storage';
import { colors, radii, shadow, type } from '../theme';
import type { Spool } from '../types';

type Props = {
  spool: Spool | null;
  visible: boolean;
  onClose: () => void;
  onEdit: (spool: Spool) => void;
  onSave: (spool: Spool, remaining: number, tare: number) => Promise<void>;
};

type Mode = 'scale' | 'direct';

function parseNumber(value: string): number | null {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function WeighSheet({ spool, visible, onClose, onEdit, onSave }: Props) {
  const [mode, setMode] = useState<Mode>('scale');
  const [gross, setGross] = useState('');
  const [tare, setTare] = useState('200');
  const [direct, setDirect] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!spool || !visible) return;
    setMode('scale');
    setGross('');
    setDirect(String(Math.round(spool.netWeight || 0)));
    setError('');
    setSaving(false);
    readTare(spool.id).then((saved) => {
      if (saved !== null) setTare(formatNumber(saved));
    });
  }, [spool, visible]);

  const grossValue = parseNumber(gross);
  const tareValue = parseNumber(tare);
  const directValue = parseNumber(direct);
  const remaining = useMemo(() => {
    if (mode === 'direct') return directValue;
    if (grossValue === null) return null;
    return Math.max(0, grossValue - (tareValue ?? 0));
  }, [directValue, grossValue, mode, tareValue]);

  if (!spool) return null;

  const total = Math.max(1, spool.totalNetWeight || 1000);
  const current = Math.max(0, spool.netWeight || 0);
  const overflow = remaining !== null && remaining > total;
  const canSave = remaining !== null && remaining >= 0 && !saving;

  const handleSave = async () => {
    if (remaining === null || remaining < 0) return;
    setSaving(true);
    setError('');
    try {
      await onSave(spool, Math.round(remaining * 10) / 10, tareValue ?? 0);
      await writeTare(spool.id, tareValue ?? 0);
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
              <Text style={styles.eyebrow}>称重校准</Text>
              <Text style={styles.title} numberOfLines={1}>
                {spool.displayName || spool.filamentName || spool.filamentType || '耗材'}
              </Text>
              <Text style={styles.subtitle}>
                当前云端值 {Math.round(current)} g / {Math.round(total)} g
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityLabel="编辑耗材信息"
                onPress={() => onEdit(spool)}
                style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
              >
                <Pencil color={colors.primary} size={15} />
                <Text style={styles.editButtonText}>编辑</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="关闭"
                onPress={onClose}
                style={({ pressed }) => [styles.close, pressed && styles.pressed]}
              >
                <X color={colors.ink} size={20} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.scrollInner}>
            <View style={styles.segment}>
              <Pressable
                onPress={() => setMode('scale')}
                style={[styles.segmentItem, mode === 'scale' && styles.segmentActive]}
              >
                <Scale
                  color={mode === 'scale' ? colors.primary : colors.muted}
                  size={16}
                />
                <Text
                  style={[
                    styles.segmentText,
                    mode === 'scale' && styles.segmentTextActive,
                  ]}
                >
                  整盘称重
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('direct')}
                style={[styles.segmentItem, mode === 'direct' && styles.segmentActive]}
              >
                <Keyboard
                  color={mode === 'direct' ? colors.primary : colors.muted}
                  size={16}
                />
                <Text
                  style={[
                    styles.segmentText,
                    mode === 'direct' && styles.segmentTextActive,
                  ]}
                >
                  直接输入
                </Text>
              </Pressable>
            </View>

            {mode === 'scale' ? (
              <View style={styles.fieldGroup}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>整盘总重</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      autoFocus
                      keyboardType="decimal-pad"
                      onChangeText={setGross}
                      placeholder="826"
                      placeholderTextColor="#A3AAA5"
                      selectTextOnFocus
                      style={styles.input}
                      value={gross}
                    />
                    <Text style={styles.inputUnit}>g</Text>
                  </View>
                  <Text style={styles.helper}>把耗材和料盘一起放到秤上</Text>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>空盘皮重</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      keyboardType="decimal-pad"
                      onChangeText={setTare}
                      placeholder="200"
                      placeholderTextColor="#A3AAA5"
                      selectTextOnFocus
                      style={styles.input}
                      value={tare}
                    />
                    <Text style={styles.inputUnit}>g</Text>
                  </View>
                  <Text style={styles.helper}>会记住此料盘的皮重，下次自动填入</Text>
                </View>
              </View>
            ) : (
              <View style={styles.fieldGroup}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>剩余净重</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      autoFocus
                      keyboardType="decimal-pad"
                      onChangeText={setDirect}
                      placeholder="630"
                      placeholderTextColor="#A3AAA5"
                      selectTextOnFocus
                      style={styles.input}
                      value={direct}
                    />
                    <Text style={styles.inputUnit}>g</Text>
                  </View>
                  <Text style={styles.helper}>适合已经完成去皮计算的场景</Text>
                </View>
              </View>
            )}

            <View style={styles.result}>
              <View>
                <Text style={styles.resultLabel}>写回拓竹云</Text>
                <Text style={styles.resultHint}>Studio 与 Handy 同步显示</Text>
              </View>
              <View style={styles.resultValueWrap}>
                <Text style={styles.resultValue}>
                  {remaining === null ? '--' : formatNumber(Math.max(0, remaining))}
                </Text>
                <Text style={styles.resultUnit}>g</Text>
              </View>
            </View>

            {overflow ? (
              <Text style={styles.warning}>结果超过标称净重，请确认是否输入错误。</Text>
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
              <Text style={styles.saveText}>{saving ? '正在同步...' : '保存到耗材库'}</Text>
            </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 15,
  },
  title: {
    ...type.title,
    color: colors.ink,
    marginTop: 3,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
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
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radii.small,
    flexDirection: 'row',
    gap: 4,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  editButtonText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  pressed: {
    opacity: 0.65,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  scrollInner: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    width: '100%',
  },
  segment: {
    backgroundColor: '#E9EBE5',
    borderRadius: radii.medium,
    flexDirection: 'row',
    padding: 3,
  },
  segmentItem: {
    alignItems: 'center',
    borderRadius: radii.small,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  segmentTextActive: {
    color: colors.primary,
  },
  fieldGroup: {
    gap: 11,
    marginTop: 17,
  },
  field: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    padding: 15,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  inputRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    marginTop: 2,
  },
  input: {
    color: colors.ink,
    flex: 1,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 43,
    minWidth: 0,
    outlineColor: 'transparent',
    outlineWidth: 0,
    padding: 0,
    width: 0,
  },
  inputUnit: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  helper: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  result: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radii.medium,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    padding: 16,
  },
  resultLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  resultHint: {
    color: colors.primary,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
    opacity: 0.72,
  },
  resultValueWrap: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  resultValue: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 36,
  },
  resultUnit: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
    marginLeft: 2,
  },
  warning: {
    color: colors.orange,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
  },
  save: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.medium,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 50,
    paddingHorizontal: 20,
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
