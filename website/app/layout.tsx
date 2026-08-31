import type { Metadata } from 'next';
import { siteUrl } from '../src/site-config';
import './globals.css';

const title = 'Leego Design PRDVI｜持续成长的 AI 产品经理';
const description =
  '持续学习企业业务，诊断连锁数字化与 AI 化需求，并输出可直接交给 Codex 实施的产品定义与 PRD。';

export const metadata: Metadata = {
  metadataBase: new URL('https://igoodthings.qiaokiai.com'),
  title,
  description,
  alternates: { canonical: siteUrl },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: siteUrl,
    title,
    description,
    images: [
      {
        url: `${siteUrl}/og.png`,
        width: 1200,
        height: 630,
        alt: '从业务问题到产品判断、PRD、Codex 实施、证据与持续学习的产品闭环',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [`${siteUrl}/og.png`],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
