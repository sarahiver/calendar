import './globals.css';

export const metadata = {
  title: process.env.APP_TITLE || 'Abwesenheitskalender',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
