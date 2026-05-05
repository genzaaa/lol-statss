'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'lolstatss-theme-v1';
type Theme = 'light' | 'dark';

/**
 * Inline script that runs synchronously in <head> before first paint.
 * Reads the saved theme from localStorage (or falls back to OS preference)
 * and sets data-theme on the html element so the page renders correctly
 * on first paint without a flash.
 *
 * This is rendered as dangerouslySetInnerHTML in layout.tsx.
 */
export const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem('${STORAGE_KEY}');
    var theme = saved || (
      window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    );
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

function getCurrentTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return (document.documentElement.getAttribute('data-theme') as Theme) ?? 'dark';
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable; theme still applies for this session.
  }
  // Notify any other ThemeToggle instances on the page (e.g. mobile menu)
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: theme }));
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(getCurrentTheme());

    function onChange(e: Event) {
      const next = (e as CustomEvent<Theme>).detail;
      setTheme(next);
    }
    window.addEventListener('theme-changed', onChange);
    return () => window.removeEventListener('theme-changed', onChange);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  }

  // SSR/hydration guard: render a placeholder of the same size to avoid
  // layout shift. The real button activates after mount.
  if (!mounted) {
    return (
      <button
        type="button"
        className="text-base w-8 h-8 rounded-md border border-line opacity-50"
        aria-label="Theme toggle (loading)"
        disabled
      >
        ☾
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="text-base w-8 h-8 rounded-md border border-line hover:border-accent hover:text-accent transition-colors"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
