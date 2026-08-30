'use client';

import { useEffect, useRef, useState } from 'react';

const navigation = [
  { href: '#thinking', label: '思想' },
  { href: '#capabilities', label: '能力' },
  { href: '#method', label: '方法' },
  { href: '#direction', label: '方向' },
  { href: '#learning', label: '学习' },
];

export function SiteHeader({ publicSkillUrl }: { publicSkillUrl: string }) {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <a className="brand" href="#main-content" aria-label="产品数字化顾问首页">
          <span aria-hidden="true">品</span>
          <strong>产品数字化顾问</strong>
        </a>

        <button
          ref={menuButtonRef}
          className="menu-button"
          type="button"
          aria-expanded={open}
          aria-controls="primary-navigation"
          aria-label={open ? '关闭导航菜单' : '打开导航菜单'}
          onClick={() => setOpen((current) => !current)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>

        <nav
          id="primary-navigation"
          className={open ? 'primary-nav is-open' : 'primary-nav'}
          aria-label="主要导航"
        >
          {navigation.map((item) => (
            <a key={item.href} href={item.href} onClick={closeMenu}>
              {item.label}
            </a>
          ))}
          <a
            className="github-nav-link"
            href={publicSkillUrl}
            target="_blank"
            rel="noreferrer"
            onClick={closeMenu}
          >
            GitHub <span aria-hidden="true">↗</span>
          </a>
          <a className="nav-cta" href="#capabilities" onClick={closeMenu}>
            查看能力地图
          </a>
        </nav>
      </div>
      {open ? (
        <button
          className="menu-scrim"
          type="button"
          aria-label="关闭导航菜单"
          onClick={() => {
            setOpen(false);
            menuButtonRef.current?.focus();
          }}
        />
      ) : null}
    </header>
  );
}
