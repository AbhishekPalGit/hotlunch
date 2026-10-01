import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const menuItems = [
  { title: 'Home', icon: 'lni lni-home', link: 'dashboard' },
  { title: 'Children', icon: 'lni lni-friends', link: 'children' },
  { title: 'My Orders', icon: 'lni lni-box-cart', link: 'myorders' },
  { title: 'Shopping Cart', icon: 'lni lni-cart-alt', link: 'shoppingcart', badge: true },
  { title: 'Credit History', icon: 'lni lni-clock-dollar', link: 'credithistory' },
  { title: 'Lunch Card', icon: 'lni lni-postcard', link: 'lunchcard' },
  { title: 'Profile Settings', icon: 'lni lni-user-settings', link: 'profilesetting' },
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

const Layout = ({ cartCount, cartTotal = 0, availableFunds = 0, amountOwed = 0, userName, setAvailableFunds, setAmountOwed, onSignOut }) => {
  const navigate = useNavigate();
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const initials = userName ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'JD';

  const handlePayNow = () => navigate('/checkout');
  const handleSignOut = () => {
    toast.info('Signed out');
    if (onSignOut) {
      onSignOut();
    }
    navigate('/login');
  };

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
          <button className="signout-btn" onClick={handleSignOut}>
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
              <div className="name">Welcome back, {userName}!</div>
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

            {/* Cart */}
            <NavLink to="/shoppingcart" className="navbar-cart">
              <span>Cart ${(parseFloat(cartTotal) || 0).toFixed(2)}</span>
              <i className="lni lni-cart-alt" style={{ fontSize: 18 }} />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </NavLink>

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
    </div>
  );
};

export default Layout;
