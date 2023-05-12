import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.ducksmanager.whattheduck',
  appName: 'What The Duck',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'http://localhost:5174',
  },
};

export default config;
