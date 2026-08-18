'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');

  const applyThemeToDOM = useCallback((t: Theme) => {
    if (typeof document === 'undefined') return;

    requestAnimationFrame(() => {
      const root = document.documentElement;
      const body = document.body;

      if (t === 'dark') {
        root.classList.add('dark');
        body.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
        body.setAttribute('data-theme', 'dark');
        root.style.colorScheme = 'dark';
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', '#0c1016');
      } else {
        root.classList.remove('dark');
        body.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
        body.setAttribute('data-theme', 'light');
        root.style.colorScheme = 'light';
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', '#059669');
      }
    });
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme | null;
    let initial: Theme = 'light';

    if (savedTheme === 'dark' || savedTheme === 'light') {
      initial = savedTheme;
    } else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      initial = 'dark';
    }

    setThemeState(initial);
    applyThemeToDOM(initial);

    // Listen for OS system theme changes in real-time if no manual preference is stored
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        const stored = localStorage.getItem('app-theme');
        if (!stored) {
          const newSystemTheme: Theme = e.matches ? 'dark' : 'light';
          setThemeState(newSystemTheme);
          applyThemeToDOM(newSystemTheme);
        }
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.addListener(handleSystemThemeChange);
      }

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleSystemThemeChange);
        } else {
          mediaQuery.removeListener(handleSystemThemeChange);
        }
      };
    }
  }, [applyThemeToDOM]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('app-theme', newTheme);
    } catch (e) {
      console.error('LocalStorage error:', e);
    }
    applyThemeToDOM(newTheme);
  }, [applyThemeToDOM]);

  const toggleTheme = useCallback(() => {
    setThemeState((prevTheme) => {
      const nextTheme: Theme = prevTheme === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('app-theme', nextTheme);
      } catch (e) {
        console.error('LocalStorage error:', e);
      }
      applyThemeToDOM(nextTheme);
      return nextTheme;
    });
  }, [applyThemeToDOM]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
