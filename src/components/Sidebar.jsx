import React from 'react';

const Sidebar = ({ activeTab, setActiveTab, cartItemsCount, mobileOpen, setMobileOpen }) => {
  const menuItems = [
    { id: 'home', label: 'Home', icon: 'lni-home' },
    { id: 'children', label: 'Children', icon: 'lni-friends' },
    { id: 'orders', label: 'My Orders', icon: 'lni-postcard' },
    { id: 'cart', label: 'Shopping Cart', icon: 'lni-cart-alt', badge: cartItemsCount },
    { id: 'credits', label: 'Credit History', icon: 'lni-clock-dollar' },
    { id: 'lunchcard', label: 'Lunch Card', icon: 'lni-credit-cards' },
    { id: 'profile', label: 'Profile Settings', icon: 'lni-user-settings' }
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)} 
          style={styles.mobileOverlay}
        />
      )}

      <aside style={{
        ...styles.sidebar,
        ...(mobileOpen ? styles.sidebarMobileOpen : {})
      }}>
        {/* Brand Header */}
        <div style={styles.brandContainer}>
          <div style={styles.logoCircle}>
            <i className="lni lni-box-4" style={styles.logoIcon}></i>
          </div>
          <span style={styles.brandName}>
            <span style={{ color: '#E54A4B', fontWeight: '700' }}>hot</span>
            <span style={{ color: '#006D77', fontWeight: '600' }}>Lunch</span>
          </span>
          
          {/* Close button on mobile */}
          <button style={styles.closeBtn} onClick={() => setMobileOpen(false)}>
            <i className="lni lni-close"></i>
          </button>
        </div>

        {/* School Contact Details Card */}
        <div style={styles.schoolCard}>
          <h4 style={styles.schoolName}>LOYOLA MARYMOUNT UNIVERSITY</h4>
          <div style={styles.schoolContact}>
            <div>
              <i className="lni lni-phone" style={styles.schoolIcon}></i>
              <span>(023) 456-7891</span>
            </div>
            <div>
              <i className="lni lni-envelope" style={styles.schoolIcon}></i>
              <span>donotreply@hotlunch.com</span>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav style={styles.nav}>
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {})
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i
                    className={`lni ${item.icon}`}
                    style={{
                      fontSize: '18px',
                      color: isActive ? '#006D77' : '#636363'
                    }}
                  ></i>
                  <span style={isActive ? styles.labelTextActive : styles.labelText}>
                    {item.label}
                  </span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span style={styles.cartBadge}>{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout button at bottom */}
        <div style={styles.logoutContainer}>
          <button
            onClick={() => alert('Signing out...')}
            style={styles.logoutBtn}
          >
            <i className="lni lni-exit" style={{ fontSize: '18px' }}></i>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

const styles = {
  sidebar: {
    width: '260px',
    backgroundColor: '#ffffff',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    padding: '20px 0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    transition: 'transform 0.3s ease-in-out'
  },
  sidebarMobileOpen: {
    transform: 'translateX(0) !important'
  },
  mobileOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 99
  },
  closeBtn: {
    display: 'none', // Overridden in media queries/responsive checks
    background: 'transparent',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    marginLeft: 'auto',
    color: 'var(--text-gray)'
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 24px',
    marginBottom: '24px',
    position: 'relative'
  },
  logoCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: '#FFDDD2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoIcon: {
    color: '#E54A4B',
    fontSize: '20px',
    fontWeight: 'bold'
  },
  brandName: {
    fontSize: '22px',
    letterSpacing: '-0.5px'
  },
  schoolCard: {
    margin: '0 16px 24px 16px',
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-main)',
    border: '1px solid var(--border)'
  },
  schoolName: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--primary)',
    marginBottom: '8px',
    lineHeight: '1.4',
    letterSpacing: '0.5px'
  },
  schoolContact: {
    fontSize: '11px',
    color: 'var(--text-gray)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  schoolIcon: {
    marginRight: '6px',
    fontSize: '10px',
    color: 'var(--primary)'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '0 12px',
    flex: 1
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease'
  },
  navItemActive: {
    backgroundColor: 'rgba(0, 109, 119, 0.08)',
    color: '#006D77'
  },
  labelText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#636363'
  },
  labelTextActive: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#006D77'
  },
  cartBadge: {
    backgroundColor: '#006D77',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: '600',
    borderRadius: '10px',
    padding: '2px 8px',
    lineHeight: '1'
  },
  logoutContainer: {
    padding: '0 12px',
    marginTop: 'auto'
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: 'var(--error)',
    fontSize: '14px',
    fontWeight: '500',
    textAlign: 'left'
  }
};

export default Sidebar;

