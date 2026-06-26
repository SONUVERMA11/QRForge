import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata = {
  title: 'QRForge — Dynamic QR Code Platform',
  description: 'Create, manage, and track dynamic QR codes with real-time analytics. Change destinations anytime without reprinting.',
  keywords: 'QR code, dynamic QR, QR analytics, QR management, QR tracking',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
