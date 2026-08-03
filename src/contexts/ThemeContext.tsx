'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');

  const applyThemeToDOM = (t: Theme) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      const body = document.body;
      if (t === 'dark') {
        root.classList.add('dark');
        body.classList.add('dark');
        root.style.backgroundColor = '#0b0f19';
        body.style.backgroundColor = '#0b0f19';
        root.style.color = '#f8fafc';
        body.style.color = '#f8fafc';
        root.setAttribute('data-theme', 'dark');
        body.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        body.classList.remove('dark');
        root.style.backgroundColor = '#f8fafc';
        body.style.backgroundColor = '#f8fafc';
        root.style.color = '#0f172a';
        body.style.color = '#0f172a';
        root.setAttribute('data-theme', 'light');
        body.setAttribute('data-theme', 'light');
      }
    }
  };

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
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
    applyThemeToDOM(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prevTheme) => {
      const nextTheme: Theme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('app-theme', nextTheme);
      applyThemeToDOM(nextTheme);
      return nextTheme;
    });
  };

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
