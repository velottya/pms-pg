import React from 'react'
import { cn } from '../../lib/utils'

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className,
  ...props
}) => (
  <div className="relative w-full overflow-auto rounded-lg border border-border-custom">
    <table className={cn("w-full caption-bottom text-sm text-left", className)} {...props} />
  </div>
)

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => (
  <thead className={cn("bg-bg-muted text-text-secondary uppercase text-xs font-semibold tracking-wider border-b border-border-custom", className)} {...props} />
)

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => (
  <tbody className={cn("divide-y divide-border-custom/50 bg-bg-surface", className)} {...props} />
)

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  ...props
}) => (
  <tr
    className={cn(
      "transition-colors hover:bg-bg-hover/80 data-[state=selected]:bg-bg-muted",
      className
    )}
    {...props}
  />
)

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...props
}) => (
  <th
    className={cn(
      "h-11 px-4 text-left align-middle font-semibold text-text-secondary whitespace-nowrap [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
)

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...props
}) => (
  <td
    className={cn("p-4 align-middle text-text-primary [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
)
