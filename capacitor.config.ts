import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.personalnotes.app',
  appName: 'Personal Notes',
  webDir: 'dist',
  server: { androidScheme: 'https' }
};
export default config;
