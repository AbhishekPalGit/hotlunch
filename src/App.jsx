import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout/Layout';
import LoginPage from './pages/login/LoginPage';
import Dashboard from './pages/dashboard/Dashboard';
import ChildrenPage from './pages/children/ChildrenPage';
import MyOrders from './pages/myorders/MyOrders';
import ShoppingCart from './pages/shoppingcart/ShoppingCart';
import Checkout from './pages/checkout/Checkout';
import CreditHistory from './pages/credithistory/CreditHistory';
import LunchCard from './pages/lunchcard/LunchCard';
import ProfileSetting from './pages/profileSetting/ProfileSetting';
import { getProfileApi, getDashboardSummaryApi, getCartApi } from './services/api';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('is_logged_in') === 'true' || !!localStorage.getItem('access_token');
  });

  const [userName, setUserName] = useState(() => {
    const savedUser = localStorage.getItem('user_details');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        return parsed.name || parsed.firstName || parsed.first_name || 'User';
      } catch (e) {}
    }
    return 'User';
  });

  const [students] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [availableFunds, setAvailableFunds] = useState(0.00);
  const [amountOwed, setAmountOwed] = useState(0.00);

  // Fetch real user & header details on page load / refresh
  useEffect(() => {
    if (!isLoggedIn) return;

    // 1. User profile
    getProfileApi().then(res => {
      if (res && res.data) {
        const u = res.data;
        const name = u.name || u.firstName || `${u.first_name || ''} ${u.last_name || ''}`.trim();
        if (name) {
          setUserName(name);
          localStorage.setItem('user_details', JSON.stringify(u));
        }
      }
    }).catch(err => console.log('Profile fetch notice:', err));

    // 2. Financial summary (Available Funds & Amount Owed)
    getDashboardSummaryApi().then(res => {
      if (res && res.status === 'success' && res.data?.summary) {
        setAvailableFunds(parseFloat(res.data.summary.availableFunds) || 0);
        setAmountOwed(parseFloat(res.data.summary.amountOwed) || 0);
      }
    }).catch(err => console.log('Summary fetch notice:', err));

    // 3. Live cart items
    getCartApi().then(res => {
      if (res && res.status === 'success' && Array.isArray(res.data?.items)) {
        setCartItems(res.data.items);
      }
    }).catch(err => console.log('Cart fetch notice:', err));
  }, [isLoggedIn]);

  const addToCart = (item) => setCartItems(prev => [...prev, item]);
  const removeFromCart = (idx) => setCartItems(prev => prev.filter((_, i) => i !== idx));
  const clearCart = () => setCartItems([]);
  const cartTotal = cartItems.reduce((acc, c) => acc + (parseFloat(c.price) || 0) * (parseInt(c.quantity, 10) || 1), 0);
  const cartCount = cartItems.reduce((acc, c) => acc + (parseInt(c.quantity, 10) || 1), 0);

  const handleLoginSuccess = (user) => {
    setIsLoggedIn(true);
    if (user) {
      const displayName = user.name || user.firstName || user.first_name || user.email?.split('@')[0] || 'User';
      setUserName(displayName);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_details');
    localStorage.removeItem('is_logged_in');
    setIsLoggedIn(false);
  };

  const sharedProps = {
    students, cartItems, addToCart, removeFromCart, clearCart,
    cartTotal, cartCount, availableFunds, setAvailableFunds,
    amountOwed, setAmountOwed, userName, setUserName
  };

  return (
    <Routes>
      <Route path="/login" element={
        isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />
      } />

      <Route path="/" element={
        isLoggedIn ? (
          <Layout
            cartCount={cartCount}
            cartTotal={cartTotal}
            availableFunds={availableFunds}
            amountOwed={amountOwed}
            userName={userName}
            setAvailableFunds={setAvailableFunds}
            setAmountOwed={setAmountOwed}
            onSignOut={handleSignOut}
          />
        ) : (
          <Navigate to="/login" replace />
        )
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard setAvailableFunds={setAvailableFunds} setAmountOwed={setAmountOwed} addToCart={addToCart} />} />
        <Route path="children" element={<ChildrenPage {...sharedProps} />} />
        <Route path="myorders" element={<MyOrders {...sharedProps} />} />
        <Route path="shoppingcart" element={<ShoppingCart {...sharedProps} />} />
        <Route path="checkout" element={<Checkout {...sharedProps} />} />
        <Route path="credithistory" element={<CreditHistory />} />
        <Route path="lunchcard" element={<LunchCard />} />
        <Route path="profilesetting" element={<ProfileSetting userName={userName} setUserName={setUserName} />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
