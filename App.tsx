import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Cloud } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BambuApiError,
  deleteSpool,
  getCatalog,
  getSpools,
  logout as logoutSession,
  updateSpool,
} from './src/api';
import { AppNav, type AppView } from './src/components/AppNav';
import { SpoolEditorModal } from './src/components/SpoolEditorModal';
import { demoSpools } from './src/demo';
import { registerServiceWorker } from './src/pwa';
import {
  defaultPreferences,
  loadPreferences,
  mergePreferences,
  normalizePreferences,
  savePreferences,
  type AppPreferences,
} from './src/preferences';
import { exportPreferences, importPreferences } from './src/preferencesFile';
import { CatalogView } from './src/screens/CatalogView';
import {
  defaultLibraryViewState,
  LibraryView,
  type LibraryViewState,
} from './src/screens/LibraryView';
import { LoginScreen } from './src/screens/LoginScreen';
import { SettingsView } from './src/screens/SettingsView';
import {
  clearSession,
  readSession,
  writeSession,
} from './src/storage';
import { colors, radii } from './src/theme';
import type {
  CatalogEntry,
  Session,
  Spool,
  SpoolEditorTab,
  SpoolUpdate,
} from './src/types';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return (
    <SafeAreaProvider>
      {fontsLoaded ? <AppContent /> : <BootScreen />}
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const desktop = width >= 900;
  const [session, setSession] = useState<Session | null>(null);
  const [spools, setSpools] = useState<Spool[]>([]);
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<AppView>('library');
  const [libraryState, setLibraryState] = useState<LibraryViewState>(
    defaultLibraryViewState,
  );
  const [selectedSpool, setSelectedSpool] = useState<Spool | null>(null);
  const [editorTab, setEditorTab] = useState<SpoolEditorTab>('basic');
  const [forceRfidEdit, setForceRfidEdit] = useState(false);
  const [preferences, setPreferences] = useState<AppPreferences>(defaultPreferences);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [presets, setPresets] = useState<CatalogEntry[]>([]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const id = 'yuliang-focus-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      [role="button"]:focus-visible,
      [role="switch"]:focus-visible,
      button:focus-visible,
      a:focus-visible {
        outline: 2px solid rgba(35, 107, 85, 0.4) !important;
        outline-offset: 2px;
      }
      input:focus-visible,
      textarea:focus-visible {
        outline: 2px solid rgba(35, 107, 85, 0.4) !important;
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const expireSession = useCallback(async () => {
    await clearSession();
    setSession(null);
    setSpools([]);
    setCatalog([]);
    setPresets([]);
    setSelectedSpool(null);
    setLibraryState(defaultLibraryViewState);
    setError('');
    setView('library');
  }, []);

  const recoverIfUnauthorized = useCallback(
    async (err: unknown) => {
      if (err instanceof BambuApiError && err.status === 401) {
        await expireSession();
        return true;
      }
      return false;
    },
    [expireSession],
  );

  const loadSpools = useCallback(
    async (activeSession: Session, refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const next = activeSession.demo ? demoSpools : await getSpools(activeSession);
        setSpools(next);
        if (!activeSession.demo) {
          try {
            const options = await getCatalog(activeSession);
            setCatalog(options.catalog);
            setPresets(options.presets);
          } catch {
            // Static catalog fallback remains available if cloud options fail.
          }
        }
      } catch (err) {
        if (await recoverIfUnauthorized(err)) return;
        setError(err instanceof Error ? err.message : '读取耗材库失败，请重试。');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [recoverIfUnauthorized],
  );

  useEffect(() => {
    registerServiceWorker();
    let active = true;
    readSession()
      .then((stored) => {
        if (!active) return;
        setSession(stored);
        if (stored) void loadSpools(stored);
      })
      .finally(() => {
        if (active) setBooting(false);
      });
    loadPreferences().then((stored) => {
      setPreferences(stored);
      setForceRfidEdit(stored.forceRfidEdit);
    });
    return () => {
      active = false;
    };
  }, [loadSpools]);

  const handleAuthenticated = async (nextSession: Session) => {
    await writeSession(nextSession);
    setSession(nextSession);
    setView('library');
    setLibraryState(defaultLibraryViewState);
    setSpools([]);
    void loadSpools(nextSession);
  };

  const handleRefresh = () => {
    if (session) void loadSpools(session, true);
  };

  const handleOpenSpool = (spool: Spool, tab: SpoolEditorTab = 'basic') => {
    setEditorTab(tab);
    setSelectedSpool(spool);
  };

  const handleLogout = async () => {
    if (session && !session.demo) {
      try {
        await logoutSession(session);
      } catch {
        // The local session is cleared even if the remote service is unreachable.
      }
    }
    await expireSession();
  };

  const handleForceRfidEditChange = (value: boolean) => {
    setForceRfidEdit(value);
    setPreferences((current) => {
      const next = { ...current, forceRfidEdit: value };
      void savePreferences(next);
      return next;
    });
  };

  const handlePreferencesChange = (next: AppPreferences) => {
    setPreferences(next);
    setForceRfidEdit(next.forceRfidEdit);
    void savePreferences(next);
  };

  const handleWeightMemoryChange = (
    spoolId: number,
    tarePresetId: string,
    extraPresetId: string,
  ) => {
    setPreferences((current) => {
      const next = {
        ...current,
        spoolWeights: {
          ...current.spoolWeights,
          [String(spoolId)]: { tarePresetId, extraPresetId },
        },
      };
      void savePreferences(next);
      return next;
    });
  };

  const handleExportPreferences = async () => {
    await exportPreferences(preferences);
  };

  const handleImportPreferences = async (mode: 'merge' | 'replace') => {
    const imported = await importPreferences();
    if (!imported) return false;
    const next =
      mode === 'replace'
        ? normalizePreferences(imported)
        : mergePreferences(preferences, normalizePreferences(imported));
    setPreferences(next);
    setForceRfidEdit(next.forceRfidEdit);
    await savePreferences(next);
    return true;
  };

  const handleSaveWeight = async (spool: Spool, remaining: number) => {
    if (!session) throw new Error('登录状态已失效。');
    if (session.demo) {
      setSpools((current) =>
        current.map((item) =>
          item.id === spool.id ? { ...item, netWeight: remaining } : item,
        ),
      );
      return;
    }

    try {
      const updated = await updateSpool(session, spool, { netWeight: remaining });
      setSpools((current) =>
        current.map((item) =>
          item.id === spool.id ? { ...item, ...updated, netWeight: remaining } : item,
        ),
      );
    } catch (err) {
      await recoverIfUnauthorized(err);
      throw err;
    }
  };

  const handleDepleteSpool = async (spool: Spool) => {
    await handleSaveWeight(spool, 0);
  };

  const handleDeleteSpool = async (spool: Spool) => {
    if (!session) throw new Error('登录状态已失效。');
    try {
      if (!session.demo) await deleteSpool(session, spool.id);
      setSpools((current) => current.filter((item) => item.id !== spool.id));
    } catch (err) {
      await recoverIfUnauthorized(err);
      throw err;
    }
  };

  const handleSaveBasic = async (spool: Spool, update: SpoolUpdate) => {
    if (!session) throw new Error('登录状态已失效。');
    if (session.demo) {
      setSpools((current) =>
        current.map((item) => (item.id === spool.id ? { ...item, ...update } : item)),
      );
      return;
    }

    try {
      await updateSpool(session, spool, update);
      const refreshed = await getSpools(session);
      const fresh = refreshed.find((item) => item.id === spool.id);
      if (!fresh) throw new Error('修改后未能从云端重新读取该料盘。');

      const mismatches: string[] = [];
      if (update.filamentVendor && fresh.filamentVendor !== update.filamentVendor) {
        mismatches.push('品牌');
      }
      if (update.filamentType && fresh.filamentType !== update.filamentType) {
        mismatches.push('类型');
      }
      if (update.filamentName && fresh.filamentName !== update.filamentName) {
        mismatches.push('耗材型号');
      }
      const normalize = (value?: string) => (value || '').replace('#', '').toUpperCase();
      if (update.color && normalize(fresh.color) !== normalize(update.color)) {
        mismatches.push('颜色');
      }
      if (update.note !== undefined && (fresh.note || '') !== update.note) {
        mismatches.push('备注');
      }
      if (update.displayName !== undefined && (fresh.displayName || '') !== update.displayName) {
        mismatches.push('名称');
      }
      if (mismatches.length) {
        throw new Error(
          `云端未保留 ${mismatches.join('、')}。该 RFID 料盘可能由标签数据锁定。`,
        );
      }
      setSpools(refreshed);
    } catch (err) {
      await recoverIfUnauthorized(err);
      throw err;
    }
  };

  if (booting) return <BootScreen />;
  if (!session) {
    return (
      <>
        <LoginScreen onAuthenticated={handleAuthenticated} />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <View style={styles.app}>
      <LinearGradient
        colors={[
          'rgba(35,107,85,0.11)',
          'rgba(35,107,85,0.035)',
          'rgba(35,107,85,0)',
        ]}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.52, 1]}
        pointerEvents="none"
        start={{ x: 0.5, y: 0 }}
        style={styles.ambient}
      />

      {desktop ? (
        <View style={[styles.navArea, { paddingTop: Math.max(16, insets.top) }]}>
          <AppNav
            desktop
            onChangeView={setView}
            onLogout={handleLogout}
            session={session}
            view={view}
          />
        </View>
      ) : null}

      <View style={[styles.main, !desktop && { paddingTop: insets.top }]}>
        {view === 'library' ? (
          <LibraryView
            error={error}
            loading={loading}
            onOpenSpool={handleOpenSpool}
            onRefresh={handleRefresh}
            onStateChange={setLibraryState}
            refreshing={refreshing}
            spools={spools}
            state={libraryState}
          />
        ) : view === 'catalog' ? (
          <CatalogView
            catalog={catalog}
            onChange={handlePreferencesChange}
            preferences={preferences}
            presets={presets}
          />
        ) : (
          <SettingsView
            catalog={catalog}
            forceRfidEdit={forceRfidEdit}
            session={session}
            onExportPreferences={handleExportPreferences}
            onForceRfidEditChange={handleForceRfidEditChange}
            onImportPreferences={handleImportPreferences}
            onLogout={handleLogout}
            onPreferencesChange={handlePreferencesChange}
            preferences={preferences}
            presets={presets}
          />
        )}
      </View>

      {!desktop ? (
        <View
          style={[
            styles.mobileNavArea,
            { paddingBottom: Math.max(12, insets.bottom) },
          ]}
        >
          <AppNav
            desktop={false}
            onChangeView={setView}
            onLogout={handleLogout}
            session={session}
            view={view}
          />
        </View>
      ) : null}

      <SpoolEditorModal
        catalog={catalog}
        forceRfidEdit={forceRfidEdit}
        initialTab={editorTab}
        onClose={() => setSelectedSpool(null)}
        onDelete={handleDeleteSpool}
        onDeplete={handleDepleteSpool}
        onWeightMemoryChange={handleWeightMemoryChange}
        onSaveBasic={handleSaveBasic}
        onSaveWeight={handleSaveWeight}
        preferences={preferences}
        presets={presets}
        spool={selectedSpool}
        visible={selectedSpool !== null}
      />
      <StatusBar style="dark" />
    </View>
  );
}

function BootScreen() {
  return (
    <View style={styles.boot}>
      <View style={styles.bootMark}>
        <Cloud color={colors.white} size={24} strokeWidth={1.8} />
      </View>
      <Text style={styles.bootTitle}>余量</Text>
      <ActivityIndicator color={colors.primary} size="small" style={styles.bootSpinner} />
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    backgroundColor: colors.background,
    flex: 1,
    overflow: 'hidden',
  },
  ambient: {
    height: 460,
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  navArea: {
    paddingHorizontal: 16,
  },
  main: {
    flex: 1,
  },
  mobileNavArea: {
    paddingHorizontal: 12,
  },
  boot: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
  bootMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.medium,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  bootTitle: {
    color: colors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 19,
    marginTop: 12,
  },
  bootSpinner: {
    marginTop: 20,
  },
});
