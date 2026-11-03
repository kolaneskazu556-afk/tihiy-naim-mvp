import './globals.css';

export const metadata = {
  title: 'Тихий найм',
  description: 'AI-рекрутер для компаний без HR-отдела',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
