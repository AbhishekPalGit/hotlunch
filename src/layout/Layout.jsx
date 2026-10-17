import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import CartHoverPopup from '../components/CartHoverPopup';

const menuItems = [
  { title: 'Home', icon: 'lni lni-home', link: 'dashboard' },
  { title: 'Children', icon: 'lni lni-users', link: 'children' },
  { title: 'My Orders', icon: 'lni lni-package', link: 'myorders' },
  { title: 'Shopping Cart', icon: 'lni lni-cart', link: 'shoppingcart', badge: true },
  { title: 'Credit History', icon: 'lni lni-timer', link: 'credithistory' },
  { title: 'Lunch Card', icon: 'lni lni-postcard', link: 'lunchcard' },
  { title: 'Profile Settings', icon: 'lni lni-cog', link: 'profilesetting' },
];

function AddFundsModal({ onClose, setAvailableFunds }) {
  const [amount, setAmount] = useState('');

  const handleAdd = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return toast.error('Enter a valid amount');
    setAvailableFunds(prev => prev + val);
    toast.success(`$${val.toFixed(2)} added successfully!`);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2>Add Funds</h2>
        <div className="form-group">
          <label>Amount ($)</label>
          <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleAdd}>Add Funds</button>
        </div>
      </div>
    </div>
  );
}

const Layout = ({ cartItems = [], cartCount = 0, cartTotal = 0, availableFunds = 0, amountOwed = 0, userName = '', setAvailableFunds, setAmountOwed, onSignOut }) => {
  const navigate = useNavigate();
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCartHovered, setIsCartHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const effectiveCartItems = cartItems || [];
  const effectiveCartTotal = cartTotal || 0;
  const effectiveCartCount = cartCount !== undefined ? cartCount : 0;

  const handleCartMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsCartHovered(true);
  };

  const handleCartMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsCartHovered(false);
    }, 250);
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const displayUserName = userName || (() => {
    try {
      const saved = JSON.parse(localStorage.getItem('user_details') || '{}');
      return saved.name || saved.fullName || `${saved.firstName || ''} ${saved.lastName || ''}`.trim() || 'Parent';
    } catch {
      return 'Parent';
    }
  })();
  const initials = displayUserName ? displayUserName.split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) : 'U';

  const handlePayNow = () => navigate('/checkout');
  const handleOpenLogoutModal = () => {
    setShowLogoutModal(true);
  };
  const handleConfirmSignOut = () => {
    setShowLogoutModal(false);
    toast.info('Signed out');
    if (onSignOut) {
      onSignOut();
    }
    navigate('/login');
  };

  useEffect(() => {
    if (!showLogoutModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowLogoutModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLogoutModal]);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon" />
          <div className="logo-text">
            <span className="hot">hot</span><span className="lunch">Lunch</span>
          </div>
        </div>

        {/* School info */}
        <div className="sidebar-school">
          <div className="school-name">Loyola Marymount University</div>
          <div className="school-info">
            <i className="lni lni-phone" style={{ fontSize: 11 }} />
            (023) 456-7891
          </div>
          <div className="school-info">
            <i className="lni lni-envelope" style={{ fontSize: 11 }} />
            donotreply@hotlunch.com
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <ul>
            {menuItems.map(item => (
              <li key={item.link}>
                <NavLink
                  to={`/${item.link}`}
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={() => setMobileOpen(false)}
                >
                  <i className={`nav-icon ${item.icon}`} />
                  <span>{item.title}</span>
                  {item.badge && cartCount > 0 && (
                    <span className="badge">{cartCount}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom Sign Out */}
        <div className="sidebar-bottom">
          <button className="signout-btn" onClick={handleOpenLogoutModal}>
            <i className="lni lni-exit nav-icon" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="main-wrapper">
        {/* Navbar */}
        <header className="navbar">
          {/* Mobile hamburger */}
          <button
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', display: 'none' }}
            className="hamburger-btn"
            onClick={() => setMobileOpen(true)}
          >
            ☰
          </button>

          <div className="user-welcome">
            <div className="user-avatar">{initials}</div>
            <div className="welcome-text">
              <div className="name">Welcome back, {displayUserName}!</div>
              <div className="date">{dateStr} {timeStr}</div>
            </div>
          </div>

          <div className="navbar-actions">
            {/* Available Funds */}
            <div className="navbar-funds">
              <span className="label">Available Funds:</span>
              <span className="amount">${(parseFloat(availableFunds) || 0).toFixed(2)}</span>
              <button className="btn-add-funds" onClick={() => setShowAddFunds(true)}>ADD FUNDS</button>
            </div>

            {/* Amount Owed */}
            <div className="navbar-funds">
              <span className="label">Amount Owed:</span>
              <span className="amount" style={{ color: '#E54A4A' }}>${(parseFloat(amountOwed) || 0).toFixed(2)}</span>
              <button className="btn-pay-now" onClick={handlePayNow}>PAY NOW</button>
            </div>

            {/* Cart with hover popup */}
            <div 
              className="navbar-cart-container"
              onMouseEnter={handleCartMouseEnter}
              onMouseLeave={handleCartMouseLeave}
            >
              <NavLink to="/shoppingcart" className="navbar-cart">
                <span>Cart ${(parseFloat(effectiveCartTotal) || 0).toFixed(2)}</span>
                <i className="lni lni-cart" style={{ fontSize: 18 }} />
                {effectiveCartCount > 0 && <span className="cart-badge">{effectiveCartCount}</span>}
              </NavLink>

              {isCartHovered && (
                <CartHoverPopup
                  cartItems={effectiveCartItems}
                  cartTotal={effectiveCartTotal}
                  onClose={() => setIsCartHovered(false)}
                />
              )}
            </div>

            {/* Bell */}
            <button className="navbar-bell">
              <i className="lni lni-alarm" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {/* Add Funds Modal */}
      {showAddFunds && (
        <AddFundsModal onClose={() => setShowAddFunds(false)} setAvailableFunds={setAvailableFunds} />
      )}

      {/* Logout Confirmation Modal with 72h Cart Deletion Notice */}
      {showLogoutModal && (
        <div className="modal-overlay logout-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="logout-modal-box" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="logout-modal-title">
            <div className="logout-modal-header">
              <div className="logout-icon-bubble">
                <i className="lni lni-exit" />
              </div>
              <button 
                type="button"
                className="logout-modal-close-btn" 
                onClick={() => setShowLogoutModal(false)}
                aria-label="Close"
              >
                <i className="lni lni-close" />
              </button>
            </div>

            <h3 id="logout-modal-title" className="logout-modal-title">Confirm Sign Out</h3>
            <p className="logout-modal-subtitle">
              Are you sure you want to sign out of your account?
            </p>

            {/* 72-Hour Cart Expiration Reminder */}
            <div className="logout-modal-warning-card">
              <div className="logout-warning-icon">
                <i className="lni lni-alarm" />
              </div>
              <div className="logout-warning-content">
                <div className="logout-warning-heading">Cart Policy Reminder</div>
                <div className="logout-warning-text">
                  Any unpaid items in your cart will be <strong>automatically deleted within 72 hours</strong> if not paid.
                </div>
                {effectiveCartCount > 0 && (
                  <div className="logout-cart-pill-wrap">
                    <span className="logout-cart-pill">
                      <i className="lni lni-cart" /> {effectiveCartCount} unpaid item{effectiveCartCount > 1 ? 's' : ''} (${(parseFloat(effectiveCartTotal) || 0).toFixed(2)})
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="logout-modal-actions">
              <button 
                type="button"
                className="logout-btn-cancel" 
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>

              {effectiveCartCount > 0 && (
                <button 
                  type="button"
                  className="logout-btn-review" 
                  onClick={() => {
                    setShowLogoutModal(false);
                    navigate('/shoppingcart');
                  }}
                >
                  <i className="lni lni-cart" />
                  Review Cart
                </button>
              )}

              <button 
                type="button"
                className="logout-btn-confirm" 
                onClick={handleConfirmSignOut}
              >
                <i className="lni lni-exit" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
