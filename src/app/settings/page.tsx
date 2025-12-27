import { SettingsPageClient } from './SettingsPageClient';

export const metadata = {
  title: 'Settings - YouTube Viewer',
  description: 'Configure offline mode and app settings',
};

export default function SettingsPage() {
  return <SettingsPageClient />;
}
