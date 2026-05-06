import { useTheme } from '../../context/ThemeContext';

// ═══ LOGO ═══════════════════════════════════════════════════
export const KiLogo = ({ size = 'md', showText = true }) => {
  const sizes = { sm: '1.2rem', md: '1.6rem', lg: '2.2rem', xl: '3rem' };
  const fs = sizes[size] || sizes.md;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', userSelect: 'none' }}>
      <span style={{ fontSize: fs, fontFamily: 'var(--font-display)', fontWeight: 900, color: 'var(--orange-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>K</span>
      {showText && <span style={{ fontSize: fs, fontFamily: 'var(--font-display)', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>inventory</span>}
    </div>
  );
};

// ═══ BUTTON ═════════════════════════════════════════════════
export const Btn = ({ children, variant = 'primary', size = 'md', loading = false, icon, fullWidth = false, onClick, type = 'button', disabled, style = {} }) => {
  const variants = {
    primary:  { background: 'var(--orange-primary)', color: '#fff', border: 'none' },
    secondary:{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
    ghost:    { background: 'transparent', color: 'var(--text-secondary)', border: 'none' },
    danger:   { background: 'var(--error-dim)', color: 'var(--error)', border: '1px solid var(--error)' },
    success:  { background: 'var(--success-dim)', color: 'var(--success)', border: '1px solid var(--success)' },
    outline:  { background: 'transparent', color: 'var(--orange-primary)', border: '1px solid var(--orange-primary)' },
  };
  const sizes = {
    xs: { padding: '0.3rem 0.6rem', fontSize: '11px', borderRadius: 'var(--radius-sm)' },
    sm: { padding: '0.4rem 0.875rem', fontSize: '12px', borderRadius: 'var(--radius-md)' },
    md: { padding: '0.6rem 1.25rem', fontSize: '14px', borderRadius: 'var(--radius-md)' },
    lg: { padding: '0.8rem 1.75rem', fontSize: '15px', borderRadius: 'var(--radius-lg)' },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...variants[variant],
        ...sizes[size],
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: '0.4rem', fontWeight: 600, cursor: 'pointer',
        width: fullWidth ? '100%' : 'auto',
        transition: 'var(--transition)', opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '0.85'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      {loading ? <span className="ki-spinner" style={{ width: 14, height: 14 }} /> : icon}
      {children}
    </button>
  );
};

// ═══ INPUT ═══════════════════════════════════════════════════
export const Input = ({ label, error, icon, prefix, suffix, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>{label}</label>}
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {icon && <span style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)', pointerEvents: 'none', display: 'flex' }}>{icon}</span>}
      {prefix && <span style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRight: 'none', borderRadius: 'var(--radius-md) 0 0 var(--radius-md)', color: 'var(--text-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>{prefix}</span>}
      <input
        {...props}
        style={{
          paddingLeft: icon ? '2.25rem' : undefined,
          borderRadius: prefix ? '0 var(--radius-md) var(--radius-md) 0' : suffix ? 'var(--radius-md) 0 0 var(--radius-md)' : undefined,
          borderColor: error ? 'var(--error)' : undefined,
          flex: 1,
          ...props.style,
        }}
      />
      {suffix && <span style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: 'none', borderRadius: '0 var(--radius-md) var(--radius-md) 0', color: 'var(--text-muted)', fontSize: '13px' }}>{suffix}</span>}
    </div>
    {error && <span style={{ fontSize: '11px', color: 'var(--error)' }}>{error}</span>}
  </div>
);

// ═══ SELECT ══════════════════════════════════════════════════
export const Select = ({ label, error, children, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>}
    <select {...props}>{children}</select>
    {error && <span style={{ fontSize: '11px', color: 'var(--error)' }}>{error}</span>}
  </div>
);

// ═══ MODAL ═══════════════════════════════════════════════════
export const Modal = ({ open, onClose, title, children, width = 500, footer }) => {
  if (!open) return null;
  return (
    <div className="ki-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ki-modal" style={{ maxWidth: width }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '1.2rem', padding: '0.2rem', borderRadius: 'var(--radius-sm)', lineHeight: 1 }}>✕</button>
        </div>
        <div>{children}</div>
        {footer && <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
};

// ═══ SKELETON ════════════════════════════════════════════════
export const Skeleton = ({ w = '100%', h = 20, rounded = false, style = {} }) => (
  <div className="ki-skeleton" style={{ width: w, height: h, borderRadius: rounded ? '99px' : 'var(--radius-md)', ...style }} />
);

export const SkeletonCard = () => (
  <div className="ki-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
    <Skeleton w="60%" h={14} />
    <Skeleton h={32} />
    <Skeleton w="40%" h={12} />
  </div>
);

// ═══ STAT CARD ═══════════════════════════════════════════════
export const StatCard = ({ title, value, subtitle, icon, color = 'var(--orange-primary)', trend, loading }) => (
  <div className="ki-card" style={{ position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color }} />
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: '0.25rem' }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>{title}</p>
        {loading ? <Skeleton h={28} w="70%" /> : (
          <p style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1.1 }}>{value}</p>
        )}
        {subtitle && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '0.4rem' }}>{subtitle}</p>}
        {trend !== undefined && (
          <p style={{ fontSize: '11px', marginTop: '0.4rem', color: trend >= 0 ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs mes anterior
          </p>
        )}
      </div>
      {icon && (
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
          {icon}
        </div>
      )}
    </div>
  </div>
);

// ═══ EMPTY STATE ══════════════════════════════════════════════
export const EmptyState = ({ icon = '📭', title = 'Sin datos', description = '', action }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '0.75rem' }}>
    <span style={{ fontSize: '2.5rem' }}>{icon}</span>
    <p style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{title}</p>
    {description && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', maxWidth: 300 }}>{description}</p>}
    {action}
  </div>
);

// ═══ PAGE HEADER ══════════════════════════════════════════════
export const PageHeader = ({ title, subtitle, actions }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.3rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{subtitle}</p>}
    </div>
    {actions && <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
  </div>
);

// ═══ THEME TOGGLE ════════════════════════════════════════════
export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} title="Cambiar tema" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.6rem', color: 'var(--text-secondary)', fontSize: '1rem', cursor: 'pointer', transition: 'var(--transition)', display: 'flex', alignItems: 'center' }}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
};
