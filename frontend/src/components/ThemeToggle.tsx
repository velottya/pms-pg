import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-bg-surface hover:bg-bg-hover text-text-secondary hover:text-text-primary border border-border-custom transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
      aria-label="Toggle theme"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-4 h-4 text-warning transition-transform hover:rotate-45" />
          <span className="text-xs font-medium">Light</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-primary transition-transform hover:-rotate-12" />
          <span className="text-xs font-medium">Dark</span>
        </>
      )}
    </button>
  )
}
