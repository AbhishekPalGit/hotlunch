import React from 'react';

/* ── Single shimmer block ─────────────────────────────────────────── */
export const ShimmerBlock = ({ width = '100%', height = 12, className = '', style = {} }) => (
  <div
    className={`shimmer-base ${className}`}
    style={{ width, height, ...style }}
  />
);

/* ── Stat chips row (Dashboard) ──────────────────────────────────── */
export const ShimmerStats = ({ count = 4 }) => (
  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="shimmer-card" style={{ flex: '1 1 160px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <ShimmerBlock width={42} height={42} className="shimmer-circle" />
        <div style={{ flex: 1 }}>
          <ShimmerBlock width="60%" height={10} className="shimmer-line-sm" />
          <ShimmerBlock width="45%" height={18} style={{ marginTop: 4 }} />
        </div>
      </div>
    ))}
  </div>
);

/* ── Student / child cards grid (Dashboard / Children) ───────────── */
export const ShimmerCards = ({ count = 3 }) => (
  <div className="student-cards-grid">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="shimmer-card student-card">
        <ShimmerBlock width={64} height={64} className="shimmer-circle" style={{ margin: '0 auto 14px' }} />
        <ShimmerBlock width="70%" height={16} className="shimmer-title" style={{ margin: '0 auto 14px' }} />
        <ShimmerBlock width="90%" height={10} className="shimmer-line-sm" />
        <ShimmerBlock width="75%" height={10} className="shimmer-line-sm" />
        <ShimmerBlock width="80%" height={10} className="shimmer-line-sm" />
        <hr style={{ border: 'none', borderTop: '1px solid #F0F2F5', margin: '14px 0' }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <ShimmerBlock width="50%" height={36} className="shimmer-rect" />
          <ShimmerBlock width="50%" height={36} className="shimmer-rect" />
        </div>
      </div>
    ))}
  </div>
);

/* ── Table rows (Orders, Children list, Credit History) ─────────── */
export const ShimmerTable = ({ rows = 6, cols = 6 }) => (
  <div className="hl-table-wrap">
    {/* fake header */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 12, padding: '14px 16px',
      borderBottom: '1px solid #E5E7EB', background: '#F9FAFB'
    }}>
      {Array.from({ length: cols }).map((_, i) => (
        <ShimmerBlock key={i} width="70%" height={10} />
      ))}
    </div>
    {/* fake rows */}
    {Array.from({ length: rows }).map((_, r) => (
      <div
        key={r}
        className="shimmer-table-row"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, padding: '14px 16px' }}
      >
        {Array.from({ length: cols }).map((_, c) => (
          <ShimmerBlock
            key={c}
            width={c === 0 ? '80%' : c === cols - 1 ? '50%' : '65%'}
            height={12}
          />
        ))}
      </div>
    ))}
  </div>
);

/* ── Profile form skeleton ───────────────────────────────────────── */
export const ShimmerProfile = () => (
  <div className="shimmer-card" style={{ maxWidth: 760 }}>
    {/* avatar + buttons */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
      <ShimmerBlock width={72} height={72} className="shimmer-circle" />
      <div>
        <ShimmerBlock width={130} height={34} className="shimmer-rect" style={{ marginBottom: 8 }} />
        <ShimmerBlock width={110} height={34} className="shimmer-rect" />
      </div>
    </div>
    {/* form fields 2-col */}
    <div className="form-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="form-group">
          <ShimmerBlock width="40%" height={10} className="shimmer-line-sm" style={{ marginBottom: 8 }} />
          <ShimmerBlock width="100%" height={40} className="shimmer-rect" />
        </div>
      ))}
    </div>
    <hr style={{ border: 'none', borderTop: '1px solid #F0F2F5', margin: '20px 0' }} />
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <ShimmerBlock width={140} height={40} className="shimmer-rect" />
    </div>
  </div>
);

/* ── Cart / Checkout ─────────────────────────────────────────────── */
export const ShimmerCart = () => (
  <div className="checkout-grid">
    <ShimmerTable rows={4} cols={7} />
    <div className="shimmer-card">
      <ShimmerBlock width="55%" height={16} className="shimmer-title" />
      {[80, 70, 60, 85, 90].map((w, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <ShimmerBlock width={`${w - 20}%`} height={11} />
          <ShimmerBlock width="20%" height={11} />
        </div>
      ))}
      <hr style={{ border: 'none', borderTop: '1px solid #F0F2F5', margin: '16px 0' }} />
      <ShimmerBlock width="100%" height={42} className="shimmer-rect" />
    </div>
  </div>
);

/* ── Lunch-card preview ──────────────────────────────────────────── */
export const ShimmerLunchCards = ({ count = 6, twoCol = true }) => (
  <div className="card">
    <div className="card-body">
      <div style={{ display: twoCol ? 'grid' : 'block', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px', marginBottom: twoCol ? 0 : 12 }}>
            <ShimmerBlock width="60%" height={14} style={{ marginBottom: 8 }} />
            <ShimmerBlock width="40%" height={10} className="shimmer-line-sm" />
            <ShimmerBlock width="75%" height={12} className="shimmer-line" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default ShimmerBlock;
