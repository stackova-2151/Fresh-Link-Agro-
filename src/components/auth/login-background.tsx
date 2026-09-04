import type { ReactNode } from 'react';

/**
 * LoginBackground
 * Wraps the login page with three purely-decorative background layers
 * (back → front): solid surface color → dot-grid → blurred color orbs.
 *
 * Scoped to the login page only — do not reuse elsewhere.
 * All decoration is pointer-events:none and z-index:0 so the card
 * (z-index:1) always sits on top and receives all interactions.
 */
export function LoginBackground({ children }: { children: ReactNode }) {
  return (
    <div
      className="login-bg-root"
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'hsl(var(--surface-1))',
      }}
    >
      {/* Layer 1 — dot-grid pattern */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, #0F6E56 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          opacity: 0.09,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Layer 2a — teal orb, top-left */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-180px',
          left: '-160px',
          width: 'clamp(280px, 45vw, 620px)',
          height: 'clamp(280px, 45vw, 620px)',
          borderRadius: '50%',
          background: '#5DCAA5',
          opacity: 0.65,
          filter: 'blur(110px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Layer 2b — amber orb, bottom-right */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-180px',
          right: '-160px',
          width: 'clamp(280px, 45vw, 620px)',
          height: 'clamp(280px, 45vw, 620px)',
          borderRadius: '50%',
          background: '#FAC775',
          opacity: 0.55,
          filter: 'blur(120px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Card — sits above all decoration layers */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}
