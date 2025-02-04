import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.ducksmanager.whattheduck3',
  appName: 'What The Duck',
  webDir: 'dist',
  android: {
    buildOptions: {
      keystorePath: '~/Documents/whattheduck.keystore',
      keystoreAlias: 'whattheduck',
    },
  },
};

export default config;
