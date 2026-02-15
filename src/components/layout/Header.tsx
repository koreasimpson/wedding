'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Heart, GitCompare, Settings, Plus } from 'lucide-react';
import { useState } from 'react';
import { AddPropertyModal } from '@/components/property/AddPropertyModal';

const NAV_ITEMS = [
  { href: '/favorites', label: '관심 매물', icon: Heart },
  { href: '/search', label: '검색', icon: Search },
  { href: '/compare', label: '비교', icon: GitCompare },
  { href: '/settings', label: '설정', icon: Settings },
] as const;

export function Header() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-30 h-16 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-full max-w-screen-2xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Home className={`h-6 w-6 ${pathname === '/' ? 'text-primary-600' : 'text-neutral-400'}`} />
            <span className="text-lg font-bold text-neutral-900">집 구하기</span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary-600' : ''}`} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">매물 추가</span>
            </button>
          </nav>
        </div>
      </header>

      <AddPropertyModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </>
  );
}
