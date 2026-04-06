import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { getApiBaseUrlConfig } from '../src/api/apiClient';
import { BorderRadius, Colors, Spacing } from '../src/theme/theme';

interface VersionItemProps {
  label: string;
  value: string;
}

function VersionItem({ label, value }: VersionItemProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function VersionScreen() {
  const [apiOrigin, setApiOrigin] = React.useState('-');

  React.useEffect(() => {
    void (async () => {
      const config = await getApiBaseUrlConfig();
      setApiOrigin(config.currentApiOrigin);
    })();
  }, []);

  const appVersion = Constants.expoConfig?.version || 'unknown';
  const nativeVersion = Application.nativeApplicationVersion || 'unknown';
  const nativeBuild = Application.nativeBuildVersion || 'unknown';
  const releaseChannel =
    Constants.expoConfig?.extra?.eas?.buildProfile || 'local';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App</Text>
          <VersionItem label="App version" value={appVersion} />
          <VersionItem label="Native version" value={nativeVersion} />
          <VersionItem label="Build number" value={nativeBuild} />
          <VersionItem label="Platform" value={Platform.OS} />
          <VersionItem
            label="Mode"
            value={__DEV__ ? 'development' : 'production'}
          />
          <VersionItem label="Build profile" value={releaseChannel} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Runtime</Text>
          <VersionItem label="API server" value={apiOrigin} />
          <VersionItem
            label="API base"
            value={apiOrigin === '-' ? '-' : `${apiOrigin}/api`}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  row: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  value: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});
