import { cn } from "../../lib/utils"

interface TitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
  size?: 'lg' | 'md'
}

export function Title({ className, children, size = 'lg', ...props }: TitleProps) {
  return (
    <h1
      className={cn(
        "font-semibold tracking-tight mb-6 text-left",
        size === 'lg' ? 'text-3xl' : 'text-2xl',
        className
      )}
      {...props}
    >
      {children}
    </h1>
  )
}
