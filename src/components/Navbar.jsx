import React from 'react';

const Navbar = ({ 
  userName = "John Doe", 
  availableFunds = 120.00, 
  amountOwed = 120.00, 
  cartTotal = 50.00, 
  cartCount = 7, 
  setActiveTab,
  onAddFunds,
  onPayNow,
  setMobileOpen
}) => {
  // Current formatted date/time matching Screenshot 2
  const formattedDateTime = "Monday, Aug 12 14:30 PM";

  return (
    <header style={styles.navbar}>
      {/* Welcome Message Panel */}
      <div style={styles.welcomeSection}>
        {/* Mobile Hamburger menu toggle button */}
        <button style={styles.menuToggleBtn} onClick={() => setMobileOpen(true)}>
          <i className="lni lni-menu" style={{ fontSize: '20px' }}></i>
        </button>

        <div style={styles.avatar}>JD</div>
        <div>
          <div style={styles.welcomeText}>Welcome back, {userName}!</div>
          <div style={styles.dateText}>{formattedDateTime}</div>
        </div>
      </div>

      {/* Metrics & Actions & Cart */}
      <div style={styles.actionsSection}>
        {/* Available Funds */}
        <div style={styles.metricBlock}>
          <div style={styles.metricLabel}>
            Available Funds: <span style={styles.fundsValue}>${availableFunds.toFixed(2)}</span>
          </div>
          <button style={styles.addFundsBtn} onClick={onAddFunds}>
            ADD FUNDS
          </button>
        </div>

        {/* Amount Owed */}
        <div style={styles.metricBlock}>
          <div style={styles.metricLabel}>
            Amount Owed: <span style={styles.owedValue}>${amountOwed.toFixed(2)}</span>
          </div>
          <button style={styles.payNowBtn} onClick={onPayNow}>
            PAY NOW
          </button>
        </div>

        {/* Cart Pill */}
        <div 
          style={styles.cartPill} 
          onClick={() => setActiveTab('cart')}
          title="Go to Shopping Cart"
        >
          <span style={styles.cartText}>Cart ${cartTotal.toFixed(2)}</span>
          <div style={styles.cartBasket}>
            <i className="lni lni-cart" style={styles.cartIcon}></i>
            <span style={styles.cartCountBadge}>{cartCount}</span>
          </div>
        </div>

        {/* Notification Bell */}
        <div style={styles.bellContainer}>
          <i className="lni lni-alarm" style={styles.bellIcon}></i>
          <span style={styles.bellDot}></span>
        </div>
      </div>
    </header>
  );
};

const styles = {
  navbar: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid var(--border)',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  welcomeSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  menuToggleBtn: {
    display: 'none',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--primary)',
    padding: '4px',
    marginRight: '8px'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '14px'
  },
  welcomeText: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--primary)'
  },
  dateText: {
    fontSize: '11px',
    color: 'var(--text-gray)'
  },
  actionsSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px'
  },
  metricBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '4px 12px',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-main)',
    border: '1px solid var(--border)'
  },
  metricLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-gray)'
  },
  fundsValue: {
    color: 'var(--success)',
    fontWeight: '600',
    fontSize: '13px'
  },
  owedValue: {
    color: 'var(--error)',
    fontWeight: '600',
    fontSize: '13px'
  },
  addFundsBtn: {
    backgroundColor: '#006D77',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Poppins', sans-serif"
  },
  payNowBtn: {
    backgroundColor: '#83C5BE',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Poppins', sans-serif"
  },
  cartPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--bg-main)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '4px 6px 4px 12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  cartPillHover: {
    backgroundColor: '#ffffff',
    borderColor: 'var(--primary)'
  },
  cartText: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--primary)'
  },
  cartBasket: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  cartIcon: {
    color: '#ffffff',
    fontSize: '14px'
  },
  cartCountBadge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#E54A4B',
    color: '#ffffff',
    fontSize: '8px',
    fontWeight: '700',
    borderRadius: '50%',
    width: '14px',
    height: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  bellContainer: {
    position: 'relative',
    cursor: 'pointer'
  },
  bellIcon: {
    fontSize: '20px',
    color: 'var(--text-gray)'
  },
  bellDot: {
    position: 'absolute',
    top: '0',
    right: '2px',
    width: '6px',
    height: '6px',
    backgroundColor: 'var(--error)',
    borderRadius: '50%'
  }
};

export default Navbar;
