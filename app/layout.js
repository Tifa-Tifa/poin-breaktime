import '../public/styles.css';

export const metadata = {
  metadataBase: new URL('https://poin-breaktime.vercel.app'),
  title: {
    default: 'Poin Breaktime',
    template: '%s | Poin Breaktime',
  },
  description: 'Dashboard Poin Breaktime untuk memantau performa, aktivitas, dan rekap poin karyawan per outlet.',
  applicationName: 'Poin Breaktime',
  icons: { icon:'/assets/breaktime-logo-150.webp' },
  robots: { index: true, follow: true },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f7f7fb',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
