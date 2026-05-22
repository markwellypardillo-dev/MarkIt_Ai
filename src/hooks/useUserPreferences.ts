import { useState, useEffect } from 'react';

export function useUserPreferences(userId: string = 'default_user') {
  // Always default to dark for the "focus mode"
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`theme_${userId}`);
    // If no theme saved, since user specifically asked for an enhanced dark mode, let's default to dark
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved as 'light' | 'dark');
    } else {
      setTheme('dark');
    }
  }, [userId]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem(`theme_${userId}`, newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return { theme: theme || 'dark', toggleTheme, isLoading: theme === null };
}
