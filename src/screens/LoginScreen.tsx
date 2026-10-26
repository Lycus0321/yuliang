import { ArrowRight, Cloud, Globe2, KeyRound, Lock, Scale } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { login, loginWithCode, loginWithTfa } from '../api';
import { colors, radii, type } from '../theme';
import type { Region, Session } from '../types';

type Props = {
  onAuthenticated: (session: Session) => Promise<void>;
};

export function LoginScreen({ onAuthenticated }: Props) {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [region, setRegion] = useState<Region>('china');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'credentials' | 'code' | 'tfa'>('credentials');
  const [tfaKey, setTfaKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (busy) return;
    if (!email.trim()) {
      setError('请输入 Bambu 账号。');
      return;
    }
    if (stage === 'credentials' && !password) {
      setError('请输入密码。');
      return;
    }
    if (stage !== 'credentials' && !code.trim()) {
      setError('请输入验证码。');
      return;
    }

    setBusy(true);
    setError('');
    try {
      if (stage !== 'credentials') {
        if (stage === 'tfa') {
          const session = await loginWithTfa(region, email.trim(), tfaKey, code.trim());
          await onAuthenticated(session);
        } else {
          const session = await loginWithCode(region, email.trim(), code.trim());
          await onAuthenticated(session);
        }
        return;
      }

      const result = await login(region, email.trim(), password);
      if (result.kind === 'success') {
        await onAuthenticated(result.session);
      } else if (result.kind === 'code-required') {
        setStage('code');
        setMessage(result.message);
      } else {
        if (result.tfaKey) {
          setStage('tfa');
          setTfaKey(result.tfaKey);
          setMessage(result.message);
        } else {
          setError(result.message);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请稍后重试。');
    } finally {
      setBusy(false);
    }
  };

  const enterDemo = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onAuthenticated({ token: 'demo', region, demo: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法进入演示模式。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.page}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, desktop && styles.scrollDesktop]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.columns, desktop && styles.columnsDesktop]}>
          <View style={[styles.leftColumn, desktop && styles.leftColumnDesktop]}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Scale color={colors.white} size={18} strokeWidth={2.2} />
              </View>
              <Text style={styles.brand}>余量</Text>
              <View style={styles.directBadge}>
                <View style={styles.directDot} />
                <Text style={styles.directText}>直连拓竹云</Text>
              </View>
            </View>

            <View style={styles.intro}>
              <Text style={[styles.title, desktop && styles.titleDesktop]}>
                连接你的{'\n'}耗材库
              </Text>
              <Text style={styles.subtitle}>
                读取云端料盘，称重后直接写回 Studio 与 Handy。
              </Text>
            </View>
          </View>

          <View style={[styles.rightColumn, desktop && styles.rightColumnDesktop]}>
          <View style={[styles.form, desktop && styles.formDesktop]}>
          <View style={styles.regionControl}>
            <Pressable
              accessibilityLabel="中国大陆区"
              accessibilityRole="button"
              accessibilityState={{ selected: region === 'china' }}
              onPress={() => setRegion('china')}
              style={[styles.regionItem, region === 'china' && styles.regionActive]}
            >
              <Text
                style={[
                  styles.regionText,
                  region === 'china' && styles.regionTextActive,
                ]}
              >
                中国大陆
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="国际区"
              accessibilityRole="button"
              accessibilityState={{ selected: region === 'global' }}
              onPress={() => setRegion('global')}
              style={[styles.regionItem, region === 'global' && styles.regionActive]}
            >
              <Text
                style={[
                  styles.regionText,
                  region === 'global' && styles.regionTextActive,
                ]}
              >
                国际区
              </Text>
            </Pressable>
            <Globe2 color={colors.muted} size={15} style={styles.regionIcon} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Bambu 账号</Text>
            <TextInput
              accessibilityLabel="Bambu 账号"
              autoCapitalize="none"
              autoComplete="email"
              editable={stage === 'credentials'}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="邮箱或手机号"
              placeholderTextColor="#969E98"
              style={styles.input}
              value={email}
            />
          </View>

          {stage === 'credentials' ? (
            <View style={styles.field}>
              <Text style={styles.label}>密码</Text>
              <TextInput
              accessibilityLabel="Bambu 密码"
                autoCapitalize="none"
                autoComplete="current-password"
                onChangeText={setPassword}
                onSubmitEditing={handleLogin}
                placeholder="输入 Bambu 密码"
                placeholderTextColor="#969E98"
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>
          ) : (
            <View style={styles.field}>
              <View style={styles.codeLabelRow}>
                <Text style={styles.label}>
                  {stage === 'tfa' ? '双重验证码' : '验证码'}
                </Text>
                <Pressable onPress={() => setStage('credentials')}>
                  <Text style={styles.changeAccount}>返回账号</Text>
                </Pressable>
              </View>
              <TextInput
                autoFocus
                keyboardType="number-pad"
                onChangeText={setCode}
                onSubmitEditing={handleLogin}
                placeholder={
                  stage === 'tfa' ? '输入验证器或邮箱验证码' : '输入邮箱或短信验证码'
                }
                placeholderTextColor="#969E98"
                style={styles.input}
                value={code}
              />
            </View>
          )}

          {message ? <Text style={styles.message}>{message}</Text> : null}
          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.submit,
              pressed && styles.submitPressed,
              busy && styles.submitDisabled,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Text style={styles.submitText}>
                  {stage !== 'credentials' ? '验证并连接' : '登录并读取'}
                </Text>
                <ArrowRight color={colors.white} size={18} strokeWidth={2.2} />
              </>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={enterDemo}
            style={({ pressed }) => [styles.demo, pressed && styles.demoPressed]}
          >
            <Cloud color={colors.primary} size={16} />
            <Text style={styles.demoText}>先看看演示耗材库</Text>
          </Pressable>
          </View>

          <View style={styles.securityNote}>
            <Lock color={colors.muted} size={14} />
            <Text style={styles.securityText}>
              {Platform.OS === 'web'
                ? '登录会话由 Worker 通过 HttpOnly Cookie 保存，Bambu Token 不会暴露给浏览器 JavaScript。'
                : 'Bambu Token 保存在系统安全存储中，仅用于从本机直接连接拓竹服务。'}
            </Text>
          </View>

          <View style={styles.apiNote}>
            <KeyRound color={colors.muted} size={14} />
            <Text style={styles.apiText}>
              使用拓竹云端非公开接口，接口变化时需要更新客户端。
            </Text>
          </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scroll: {
    alignSelf: 'center',
    flexGrow: 1,
    maxWidth: 1080,
    paddingBottom: 30,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'web' ? 46 : 62,
    width: '100%',
  },
  scrollDesktop: {
    justifyContent: 'center',
    paddingHorizontal: 46,
    paddingTop: 36,
  },
  columns: {
    width: '100%',
  },
  columnsDesktop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 72,
    justifyContent: 'space-between',
  },
  leftColumn: {
    width: '100%',
  },
  leftColumnDesktop: {
    flex: 1,
    maxWidth: 470,
  },
  rightColumn: {
    width: '100%',
  },
  rightColumnDesktop: {
    flex: 1,
    maxWidth: 430,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.small,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  brand: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    marginLeft: 9,
  },
  directBadge: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 6,
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  directDot: {
    backgroundColor: colors.primary,
    borderRadius: 5,
    height: 6,
    width: 6,
  },
  directText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  intro: {
    marginTop: 46,
  },
  title: {
    ...type.display,
    color: colors.ink,
  },
  titleDesktop: {
    fontSize: 44,
    lineHeight: 51,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
    maxWidth: 330,
  },
  form: {
    gap: 11,
    marginTop: 34,
  },
  formDesktop: {
    marginTop: 0,
  },
  regionControl: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E7E9E3',
    borderRadius: radii.medium,
    flexDirection: 'row',
    padding: 3,
  },
  regionItem: {
    borderRadius: radii.small,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  regionActive: {
    backgroundColor: colors.surface,
  },
  regionText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  regionTextActive: {
    color: colors.ink,
  },
  regionIcon: {
    marginHorizontal: 8,
  },
  field: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
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
    letterSpacing: 0,
    lineHeight: 22,
    marginTop: 3,
    minHeight: 25,
    padding: 0,
  },
  codeLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  changeAccount: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  message: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 2,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 2,
  },
  submit: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.medium,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 52,
  },
  submitPressed: {
    backgroundColor: colors.primaryPressed,
  },
  submitDisabled: {
    opacity: 0.65,
  },
  submitText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  demo: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  demoPressed: {
    opacity: 0.6,
  },
  demoText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  securityNote: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 7,
    marginTop: 30,
  },
  securityText: {
    color: colors.muted,
    flex: 1,
    fontSize: 10,
    lineHeight: 16,
  },
  apiNote: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 7,
    marginTop: 8,
  },
  apiText: {
    color: colors.muted,
    flex: 1,
    fontSize: 10,
    lineHeight: 16,
  },
});
