import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type { AppPreferences } from './preferences';

export async function exportPreferences(preferences: AppPreferences) {
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `yuliang-preferences-${date}.json`;
  const content = JSON.stringify(preferences, null, 2);

  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }

  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: '导出余量偏好',
    });
  }
}

export async function importPreferences(): Promise<AppPreferences | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: 'application/json',
  });
  if (result.canceled || !result.assets.length) return null;
  const asset = result.assets[0];

  let content: string;
  if (Platform.OS === 'web' && asset.file) {
    content = await asset.file.text();
  } else {
    content = await FileSystem.readAsStringAsync(asset.uri);
  }
  return JSON.parse(content) as AppPreferences;
}
