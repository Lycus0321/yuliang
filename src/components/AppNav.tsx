import {
  Box,
  CloudCheck,
  Layers3,
  LayoutGrid,
  LogOut,
  SlidersHorizontal,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Session } from '../types';
import { colors, radii } from '../theme';
import { GlassPanel } from './GlassPanel';

export type AppView = 'library' | 'catalog' | 'settings';

type Props = {
  view: AppView;
  desktop: boolean;
  session: Session;
  onChangeView: (view: AppView) => void;
  onLogout: () => void;
};

const items = [
  { id: 'library' as const, label: '耗材库', icon: LayoutGrid },
  { id: 'catalog' as const, label: '耗材目录', icon: Layers3 },
  { id: 'settings' as const, label: '偏好设置', icon: SlidersHorizontal },
];

export function AppNav({ view, desktop, session, onChangeView, onLogout }: Props) {
  return (
    <GlassPanel style={desktop ? styles.desktopShell : styles.mobileShell}>
      <View style={[styles.inner, desktop ? styles.desktopInner : styles.mobileInner]}>
        {desktop ? (
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Box color={colors.white} size={18} strokeWidth={2} />
            </View>
            <Text style={styles.brandText}>余量</Text>
          </View>
        ) : null}

        <View style={[styles.nav, desktop ? styles.navDesktop : styles.navMobile]}>
          {items.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <Pressable
                accessibilityLabel={item.label}
                accessibilityRole="button"
                key={item.id}
                onPress={() => onChangeView(item.id)}
                style={({ pressed }) => [
                  styles.navItem,
                  desktop ? styles.navItemDesktop : styles.navItemMobile,
                  active && styles.navItemActive,
                  pressed && styles.pressed,
                ]}
              >
                <Icon
                  color={active ? colors.primary : colors.muted}
                  size={desktop ? 18 : 20}
                  strokeWidth={1.7}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.navLabel,
                    desktop ? styles.navLabelDesktop : styles.navLabelMobile,
                    active && styles.navLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {desktop ? (
          <View style={styles.account}>
            <CloudCheck color={colors.primary} size={17} strokeWidth={1.7} />
            <View style={styles.accountCopy}>
              <Text style={styles.accountTitle}>
                {session.demo ? '演示模式' : 'Bambu 账号'}
              </Text>
              <Text style={styles.accountMeta}>
                {session.demo ? '本地数据' : '云端已连接'}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="退出账号"
              onPress={onLogout}
              style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
            >
              <LogOut color={colors.muted} size={17} strokeWidth={1.7} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  desktopShell: {
    alignSelf: 'center',
    maxWidth: 1200,
    width: '100%',
  },
  mobileShell: {
    width: '100%',
  },
  inner: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: '100%',
  },
  desktopInner: {
    flexDirection: 'row',
    minHeight: 62,
  },
  mobileInner: {
    flexDirection: 'row',
    minHeight: 58,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 8,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.small,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  brandText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    letterSpacing: 0,
  },
  nav: {
    gap: 4,
  },
  navDesktop: {
    flexDirection: 'row',
    marginLeft: 16,
  },
  navMobile: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
  },
  navItem: {
    alignItems: 'center',
    borderRadius: 10,
  },
  navItemDesktop: {
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  navItemMobile: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 50,
  },
  navItemActive: {
    backgroundColor: colors.mint,
  },
  navLabel: {
    color: colors.muted,
  },
  navLabelDesktop: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  navLabelMobile: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  navLabelActive: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  account: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto',
    paddingHorizontal: 8,
  },
  accountCopy: {
    minWidth: 120,
  },
  accountTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  accountMeta: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 1,
  },
  logout: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  pressed: {
    opacity: 0.6,
  },
});
