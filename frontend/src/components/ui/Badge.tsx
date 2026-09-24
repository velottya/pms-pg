import React from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'outline'
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-primary/10 text-primary border border-primary/20',
    success: 'bg-success-bg text-success border border-success/30',
    warning: 'bg-warning-bg text-warning border border-warning/30',
    danger: 'bg-danger-bg text-danger border border-danger/30',
    info: 'bg-info-bg text-info border border-info/30',
    secondary: 'bg-bg-muted text-text-secondary border border-border-custom',
    outline: 'border border-border-custom text-text-primary',
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}
