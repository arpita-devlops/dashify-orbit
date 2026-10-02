const VARIANTS = {
  primary:
    'bg-accent text-[#1a1206] shadow-glow hover:brightness-110 active:brightness-95',
  secondary: 'border border-fg/10 bg-surface/70 text-fg hover:border-fg/25 hover:bg-elevated',
  ghost: 'text-muted hover:bg-fg/5 hover:text-fg',
  danger: 'border border-coral/30 bg-coral/10 text-coral hover:bg-coral/15',
  ai: 'text-white bg-[linear-gradient(110deg,rgb(var(--lilac)),rgb(var(--coral))_55%,rgb(var(--accent)))] bg-[length:200%_100%] bg-left hover:bg-right shadow-[0_10px_30px_-12px_rgb(var(--lilac)/0.8)] transition-[background-position] duration-500',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-xl',
};

export default function Button({ as: Component = 'button', variant = 'primary', size = 'md', loading = false, className = '', children, ...props }) {
  return (
    <Component
      className={`inline-flex select-none items-center justify-center font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={Component === 'button' ? loading || props.disabled : undefined}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />}
      {children}
    </Component>
  );
}
