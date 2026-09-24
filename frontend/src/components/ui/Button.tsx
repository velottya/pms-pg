import React from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'default',
  size = 'md',
  ...props
}) => {
  const base = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
  
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm",
    outline: "border border-border-custom bg-transparent hover:bg-bg-hover text-text-primary",
    secondary: "bg-bg-muted hover:bg-bg-hover text-text-primary border border-border-custom",
    ghost: "hover:bg-bg-hover text-text-secondary hover:text-text-primary",
    danger: "bg-danger text-white hover:opacity-90 shadow-sm",
  }

  const sizes = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-10 px-4 py-2 text-sm gap-2",
    lg: "h-11 px-6 text-base gap-2.5",
  }

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  )
}
