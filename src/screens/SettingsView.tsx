import {
  CloudCheck,
  Database,
  Download,
  FileUp,
  Gauge,
  GitMerge,
  HardDrive,
  Info,
  ListTree,
  LogOut,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  PreferencesManagerModal,
  type ManagerKind,
} from '../components/PreferencesManagerModal';
import type { AppPreferences } from '../preferences';
import {
  allExtraPresets,
  allTarePresets,
  availableExtraPresets,
  availableTarePresets,
} from '../preferencesCatalog';
import { colors, radii, shadow, type } from '../theme';
import type { CatalogEntry, Session } from '../types';

type SettingsSection = 'security' | 'materials' | 'data';

type Props = {
  catalog: CatalogEntry[];
  forceRfidEdit: boolean;
  session: Session;
  onForceRfidEditChange: (value: boolean) => void;
  preferences: AppPreferences;
  presets: CatalogEntry[];
  onImportPreferences: (mode: 'merge' | 'replace') => Promise<boolean>;
  onExportPreferences: () => Promise<void>;
  onPreferencesChange: (preferences: AppPreferences) => void;
  onLogout: () => void;
};

export function SettingsView({
  catalog,
  forceRfidEdit,
  session,
  preferences,
  onForceRfidEditChange,
  onImportPreferences,
  onExportPreferences,
  onPreferencesChange,
  presets,
  onLogout,
}: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [section, setSection] = useState<SettingsSection>('security');
  const [manager, setManager] = useState<ManagerKind | null>(null);

  const showNotice = (message: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(''), 1600);
  };

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const runImport = async (mode: 'merge' | 'replace') => {
    try {
      const imported = await onImportPreferences(mode);
      if (!imported) return;
      showNotice(mode === 'merge' ? '偏好已合并导入' : '偏好已完整替换');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'JSON 导入失败');
    }
  };

  const runExport = async () => {
    try {
      await onExportPreferences();
      showNotice('偏好 JSON 已导出');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'JSON 导出失败');
    }
  };

  const allTare = allTarePresets(preferences);
  const allExtra = allExtraPresets(preferences);
  const defaultTare =
    allTare.find((item) => item.id === preferences.defaultTarePresetId) ||
    allTare[0];
  const defaultExtra =
    allExtra.find((item) => item.id === preferences.defaultExtraPresetId) ||
    allExtra[0];
  const visibleTare = availableTarePresets(preferences);
  const visibleExtra = availableExtraPresets(preferences);
  const tarePreview = uniqueById([
    defaultTare,
    ...visibleTare,
  ]).slice(0, 4);
  const extraPreview = uniqueById([
    defaultExtra,
    ...visibleExtra,
  ]).slice(0, 3);
  const regionText = session.region === 'china' ? '中国大陆区' : '国际区';
  const settingsNavigation = (
    <>
      <SettingsNavItem
        active={section === 'security'}
        compact={compact}
        icon={<ShieldCheck color={section === 'security' ? colors.primary : colors.muted} size={17} />}
        label="账户与安全"
        onPress={() => setSection('security')}
      />
      <SettingsNavItem
        active={section === 'materials'}
        compact={compact}
        icon={<Gauge color={section === 'materials' ? colors.primary : colors.muted} size={17} />}
        label="耗材与皮重"
        onPress={() => setSection('materials')}
      />
      <SettingsNavItem
        active={section === 'data'}
        compact={compact}
        icon={<Database color={section === 'data' ? colors.primary : colors.muted} size={17} />}
        label="数据管理"
        onPress={() => setSection('data')}
      />
    </>
  );

  return (
    <View style={styles.root}>
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.pageHead}>
          <View style={styles.pageHeadCopy}>
            <Text style={styles.breadcrumb}>耗材管理</Text>
            <Text style={styles.title}>设置</Text>
            <Text style={styles.subtitle}>
              管理本地耗材目录、称重克重、安全策略与跨设备偏好数据
            </Text>
          </View>
        </View>

        <View style={[styles.layout, compact && styles.layoutCompact]}>
          {compact ? (
            <View style={styles.navCompact}>
              {settingsNavigation}
            </View>
          ) : (
            <View style={styles.nav}>{settingsNavigation}</View>
          )}

          <View style={[styles.panel, compact && styles.panelCompact]}>
            {section === 'security' ? (
              <>
                <PanelHeading
                  title="账户与安全"
                  description="工作台会话与 RFID 身份写入策略"
                />
                <SettingsBlock title="拓竹账户">
                  <SettingRow
                    stacked={compact}
                    copy={
                      <View style={styles.accountLine}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {session.demo ? 'YL' : (session.email || 'BL').slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.settingCopy}>
                          <Text style={styles.settingTitle}>
                            {session.demo ? '演示账户' : session.email || '拓竹账户'}
                          </Text>
                          <Text style={styles.settingMeta}>
                            {regionText} · {session.demo ? '本地演示数据' : '云端已连接'}
                          </Text>
                        </View>
                      </View>
                    }
                    action={
                      <SecondaryButton
                        icon={<LogOut color={colors.ink} size={16} />}
                        label="退出登录"
                        onPress={onLogout}
                      />
                    }
                  />
                </SettingsBlock>

                <SettingsBlock title="RFID 写入策略">
                  <SettingRow
                    copy={
                      <View>
                        <Text style={styles.settingTitle}>强制修改 RFID 字段</Text>
                        <Text style={styles.settingMeta}>
                          默认保留标签内原始品牌、型号和颜色。开启后可直接覆盖身份字段。
                        </Text>
                      </View>
                    }
                    action={
                      <Switch
                        accessibilityLabel="强制修改 RFID 字段"
                        onValueChange={onForceRfidEditChange}
                        thumbColor={colors.white}
                        trackColor={{ false: '#C9CEC8', true: colors.primary }}
                        value={forceRfidEdit}
                      />
                    }
                  />
                  <WarningBox
                    icon={<TriangleAlert color={colors.orange} size={17} />}
                    text="全局高风险操作。开启后可能导致 Bambu Studio 刷新时与 RFID 标签数据冲突。"
                  />
                </SettingsBlock>

                <SettingsBlock title="会话" last>
                  <SettingRow
                    copy={
                      <View>
                        <Text style={styles.settingTitle}>会话恢复</Text>
                        <Text style={styles.settingMeta}>
                          {session.demo
                            ? '演示会话仅保存在本机，不包含真实账号凭证或云端登录态。'
                            : Platform.OS === 'web'
                              ? '登录态由 Cloudflare Worker 管理，令牌不会进入浏览器 JavaScript。'
                              : '登录令牌保存在系统安全存储中，并直接用于连接拓竹服务。'}
                        </Text>
                      </View>
                    }
                    action={<StatusTag label={session.demo ? '演示模式' : '已连接'} />}
                  />
                </SettingsBlock>
              </>
            ) : null}

            {section === 'materials' ? (
              <>
                <PanelHeading
                  title="耗材与皮重"
                  description="按名称和克重管理空盘皮重及其他附加重量"
                />
                <SettingsBlock
                  title="空盘皮重"
                  action={
                    <SecondaryButton
                      icon={<Gauge color={colors.ink} size={16} />}
                      label="管理预设"
                      onPress={() => setManager('tare')}
                    />
                  }
                >
                  <PresetList presets={tarePreview} defaultId={defaultTare?.id} />
                </SettingsBlock>
                <SettingsBlock
                  title="其他附加重量"
                  action={
                    <SecondaryButton
                      icon={<Gauge color={colors.ink} size={16} />}
                      label="管理预设"
                      onPress={() => setManager('extra')}
                    />
                  }
                >
                  <PresetList presets={extraPreview} defaultId={defaultExtra?.id} />
                </SettingsBlock>
                <SettingsBlock last>
                  <InfoBox
                    tone="primary"
                    text="匹配顺序：料盘上次选择 → 型号默认皮重 → 品牌与型号完全匹配 → 仅品牌匹配 → 仅型号匹配 → 全局默认。"
                  />
                </SettingsBlock>
              </>
            ) : null}

            {section === 'data' ? (
              <>
                <PanelHeading
                  title="数据管理"
                  description="偏好数据只保存在本机，可通过 JSON 在不同设备间迁移"
                />
                <SettingsBlock title="偏好文件">
                  <View style={[styles.dataGrid, compact && styles.dataGridCompact]}>
                    <DataAction
                      icon={<Download color={colors.primary} size={21} />}
                      title="导出 JSON"
                      meta="生成包含目录、皮重和显示偏好的文件"
                      onPress={runExport}
                    />
                    <DataAction
                      icon={<GitMerge color={colors.primary} size={21} />}
                      title="合并导入"
                      meta="按 ID 与内容去重，保留本机现有偏好"
                      onPress={() => void runImport('merge')}
                    />
                    <DataAction
                      icon={<FileUp color={colors.primary} size={21} />}
                      title="完整替换"
                      meta="使用导入文件覆盖当前本地偏好"
                      onPress={() => void runImport('replace')}
                    />
                  </View>
                  <InfoBox
                    tone="primary"
                    text="导出文件不包含 Bambu Token、Cookie 或任何账号凭证。"
                  />
                </SettingsBlock>
                <SettingsBlock title="应用状态" last>
                  <SettingRow
                    copy={
                      <View>
                        <Text style={styles.settingTitle}>本地偏好</Text>
                        <Text style={styles.settingMeta}>
                          AsyncStorage 自动保存 · {session.demo ? '演示模式' : '云端模式'}
                        </Text>
                      </View>
                    }
                    action={<StatusTag label="已保存" icon={<HardDrive color={colors.primary} size={14} />} />}
                  />
                  <SettingRow
                    copy={
                      <View>
                        <Text style={styles.settingTitle}>自动刷新保护</Text>
                        <Text style={styles.settingMeta}>
                          编辑弹窗打开时会暂停 PWA 自动刷新，关闭后恢复。
                        </Text>
                      </View>
                    }
                    action={<StatusTag label="已开启" icon={<CloudCheck color={colors.primary} size={14} />} />}
                  />
                </SettingsBlock>
              </>
            ) : null}
          </View>
        </View>
      </View>

    </ScrollView>
    {notice ? (
      <View accessibilityLiveRegion="polite" style={styles.notice}>
        <Text style={styles.noticeText}>{notice}</Text>
      </View>
    ) : null}
    <PreferencesManagerModal
      catalog={catalog}
      kind={manager}
      onChange={onPreferencesChange}
      onClose={() => setManager(null)}
      preferences={preferences}
      presets={presets}
    />
    </View>
  );
}

function SettingsNavItem({
  active,
  compact,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  compact: boolean;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityLabel={label}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.navItem,
        compact && styles.navItemCompact,
        active && styles.navItemActive,
        hovered && !active && styles.navItemHover,
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <Text style={[styles.navText, active && styles.navTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function PanelHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.panelHeading}>
      <Text style={styles.panelTitle}>{title}</Text>
      <Text style={styles.panelDescription}>{description}</Text>
      {children}
    </View>
  );
}

function SettingsBlock({
  title,
  action,
  last,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.block, last && styles.blockLast]}>
      {title || action ? (
        <View style={styles.blockHeader}>
          {title ? <Text style={styles.blockTitle}>{title}</Text> : <View />}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

function SettingRow({
  copy,
  action,
  stacked = false,
}: {
  copy: React.ReactNode;
  action: React.ReactNode;
  stacked?: boolean;
}) {
  return (
    <View style={[styles.settingRow, stacked && styles.settingRowStacked]}>
      <View style={styles.settingCopy}>{copy}</View>
      <View style={[styles.settingAction, stacked && styles.settingActionStacked]}>
        {action}
      </View>
    </View>
  );
}

function TabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={[
        styles.tab,
        hovered && !active && styles.tabHover,
        active && styles.tabActive,
      ]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function PrimaryButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityLabel={label}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        hovered && styles.primaryButtonHover,
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityLabel={label}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        hovered && styles.secondaryButtonHover,
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function WarningBox({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.warningBox}>
      {icon}
      <Text style={styles.warningText}>{text}</Text>
    </View>
  );
}

function InfoBox({
  text,
  tone = 'default',
}: {
  text: string;
  tone?: 'default' | 'primary';
}) {
  return (
    <View style={[styles.infoBox, tone === 'primary' && styles.infoBoxPrimary]}>
      <Info color={tone === 'primary' ? colors.primary : colors.muted} size={17} />
      <Text
        style={[
          styles.infoText,
          tone === 'primary' && styles.infoTextPrimary,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function StatusTag({
  label,
  icon,
}: {
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <View style={styles.statusTag}>
      {icon}
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}

function TreeLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.treeLine}>
      <Text style={styles.treeLabel}>{label}</Text>
      <Text style={styles.treeValue}>{value}</Text>
    </View>
  );
}

function PresetList({
  presets,
  defaultId,
}: {
  presets: ReturnType<typeof allTarePresets>;
  defaultId?: string;
}) {
  return (
    <View style={styles.presetList}>
      {presets.map((preset) => (
        <View key={preset.id} style={styles.presetRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.presetName}>{preset.name}</Text>
            <Text style={styles.presetMeta}>
              {preset.grams} g
              {preset.id === defaultId ? ' · 默认' : ''}
              {preset.brand || preset.type
                ? ` · ${[preset.brand, preset.type].filter(Boolean).join(' / ')}`
                : ''}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function DataAction({
  icon,
  title,
  meta,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityLabel={title}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.dataAction,
        hovered && styles.dataActionHover,
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <Text style={styles.dataActionTitle}>{title}</Text>
      <Text style={styles.dataActionMeta}>{meta}</Text>
    </Pressable>
  );
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return items.filter(
    (item, index) => items.findIndex((candidate) => candidate.id === item.id) === index,
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 44,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 1200,
    paddingHorizontal: 24,
    paddingTop: 10,
    width: '100%',
  },
  pageHead: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 76,
  },
  pageHeadCopy: {
    flex: 1,
    minWidth: 0,
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
  subtitle: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 3,
  },
  layout: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 20,
    marginTop: 20,
  },
  layoutCompact: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
  nav: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    gap: 4,
    padding: 6,
    width: 220,
  },
  navCompact: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    padding: 6,
    width: '100%',
  },
  navItem: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 8,
    height: 44,
    minHeight: 44,
    paddingHorizontal: 10,
  },
  navItemCompact: {
    flex: 1,
    flexDirection: 'column',
    gap: 3,
    height: 58,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 4,
  },
  navItemActive: {
    backgroundColor: colors.mint,
  },
  navItemHover: {
    backgroundColor: colors.background,
  },
  navText: {
    color: colors.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  navTextActive: {
    color: colors.primary,
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.medium,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  panelCompact: {
    alignSelf: 'stretch',
    width: '100%',
  },
  panelHeading: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  panelTitle: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 19,
  },
  panelDescription: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 4,
  },
  tabs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    marginTop: 14,
    padding: 3,
  },
  tab: {
    borderRadius: 6,
    minHeight: 32,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.white,
    ...shadow,
  },
  tabHover: {
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  tabText: {
    color: colors.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.ink,
  },
  block: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  blockLast: {
    borderBottomWidth: 0,
  },
  blockHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 12,
  },
  blockTitle: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  settingRowStacked: {
    alignItems: 'stretch',
    flexDirection: 'column',
    gap: 10,
  },
  settingCopy: {
    flex: 1,
    minWidth: 0,
  },
  settingAction: {
    flexShrink: 0,
  },
  settingActionStacked: {
    alignItems: 'flex-start',
    width: '100%',
  },
  settingTitle: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  settingMeta: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  accountLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  avatarText: {
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  warningBox: {
    alignItems: 'flex-start',
    backgroundColor: colors.orangeSoft,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 11,
  },
  warningText: {
    color: colors.orange,
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  infoBox: {
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 11,
  },
  infoBoxPrimary: {
    backgroundColor: colors.mint,
  },
  infoText: {
    color: colors.muted,
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  infoTextPrimary: {
    color: colors.primary,
  },
  statusTag: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    minHeight: 26,
    paddingHorizontal: 9,
  },
  statusText: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.control,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  primaryButtonHover: {
    backgroundColor: colors.primaryPressed,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 11,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  secondaryButtonHover: {
    backgroundColor: colors.background,
    borderColor: colors.mintStrong,
  },
  treePreview: {
    gap: 1,
    marginTop: 12,
  },
  treeLine: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 40,
    paddingHorizontal: 10,
  },
  treeLabel: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    width: 62,
  },
  treeValue: {
    color: colors.muted,
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  presetList: {
    gap: 6,
  },
  presetRow: {
    backgroundColor: colors.background,
    borderRadius: 9,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  presetName: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  presetMeta: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 1,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dataGridCompact: {
    flexDirection: 'column',
  },
  dataAction: {
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    minHeight: 112,
    minWidth: 180,
    padding: 14,
  },
  dataActionTitle: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    marginTop: 3,
  },
  dataActionMeta: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  dataActionHover: {
    backgroundColor: colors.mint,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.62,
  },
  notice: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    bottom: 24,
    left: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: 'absolute',
    right: 16,
    zIndex: 20,
    ...shadow,
  },
  noticeText: {
    color: colors.ink,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
});
