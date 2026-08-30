import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">404 · PAGE NOT FOUND</p>
      <h1>这条路径不在能力地图里。</h1>
      <p>页面可能已移动，或者这个能力入口尚未建立。</p>
      <Link className="button button-primary" href="/">
        返回官网首页
      </Link>
    </main>
  );
}
