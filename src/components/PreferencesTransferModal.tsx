import { FileUp, GitMerge, X } from 'lucide-react-native';
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
import { confirmAction } from '../confirm';
import { colors, radii, shadow } from '../theme';

export type PreferencesTransferMode = 'export' | 'import';
export type PreferencesImportMode = 'merge' | 'replace';

type Props = {
  error: string;
  mode: PreferencesTransferMode | null;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onImport: (mode: PreferencesImportMode) => void;
};

export function PreferencesTransferModal({
  error,
  mode,
  value,
  onChange,
  onClose,
  onImport,
}: Props) {
  if (!mode) return null;

  const requestClose = async () => {
    if (mode === 'import' && value.trim()) {
      const confirmed = await confirmAction({
        title: '关闭导入窗口？',
        message: '输入框中的 JSON 内容尚未导入。',
        confirmLabel: '关闭',
        cancelLabel: '继续编辑',
        destructive: true,
      });
      if (!confirmed) return;
    }
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={requestClose}
      transparent
      visible
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable onPress={requestClose} style={styles.backdrop} />
        <View accessibilityViewIsModal style={styles.dialog}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>
                {mode === 'export' ? '导出偏好' : '导入偏好'}
              </Text>
              <Text style={styles.subtitle}>
                {mode === 'export'
                  ? '在输入框中选择并复制全部 JSON 数据。'
                  : '将此前导出的 JSON 粘贴到输入框后执行导入。'}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="关闭"
              hitSlop={6}
              onPress={requestClose}
              style={styles.close}
            >
              <X color={colors.ink} size={19} strokeWidth={1.7} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              accessibilityLabel="偏好 JSON 输入框"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              onChangeText={onChange}
              placeholder='粘贴 JSON 数据，例如 {"customBrands":[]}'
              placeholderTextColor={colors.muted}
              selectionColor={colors.primary}
              selectTextOnFocus={mode === 'export'}
              spellCheck={false}
              style={styles.input}
              textAlignVertical="top"
              underlineColorAndroid="transparent"
              value={value}
            />
            {error ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {error}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            {mode === 'import' ? (
              <>
                <Pressable
                  accessibilityLabel="合并导入"
                  onPress={() => onImport('merge')}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <GitMerge color={colors.ink} size={16} strokeWidth={1.7} />
                  <Text style={styles.secondaryText}>合并导入</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="完整替换"
                  onPress={() => onImport('replace')}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <FileUp color={colors.white} size={16} strokeWidth={1.7} />
                  <Text style={styles.primaryText}>完整替换</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                accessibilityLabel="关闭导出窗口"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.closeAction,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryText}>关闭</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  dialog: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    height: '76%',
    maxHeight: 680,
    maxWidth: 680,
    overflow: 'hidden',
    width: '100%',
    ...shadow,
  },
  header: {
    alignItems: 'flex-start',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  close: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  body: {
    flexGrow: 1,
    gap: 10,
    padding: 16,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radii.input,
    borderWidth: 1,
    color: colors.ink,
    flexGrow: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    minHeight: 240,
    outlineWidth: 0,
    padding: 12,
  },
  error: {
    color: colors.danger,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.control,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  closeAction: {
    flex: 0,
    minWidth: 110,
  },
  primaryText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  secondaryText: {
    color: colors.ink,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.65,
  },
});
