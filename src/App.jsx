import React, { useState, useEffect, useCallback } from 'react';
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
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem('is_logged_in') === 'true' || !!localStorage.getItem('access_token')
  );

  const [userName, setUserName] = useState(() => {
    const saved = localStorage.getItem('user_details');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        return u.name || `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.trim() || 'User';
      } catch (e) {}
    }
    return '';
  });

  const [availableFunds, setAvailableFunds] = useState(0);
  const [amountOwed, setAmountOwed] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  // Sync / refresh Cart from backend API
  const refreshCart = useCallback(async () => {
    try {
      const res = await getCartApi();
      if (res && res.status === 'success') {
        const data = res.data || [];
        if (Array.isArray(data) && data.length > 0) {
          const isGrouped = !!(data[0].childName || data[0].student || data[0].dates || data[0].items);
          if (isGrouped) {
            const flat = [];
            data.forEach(group => {
              const childName = group.childName || group.studentName || group.student || group.fullName || group.name || 'Student';
              const dates = group.dates || [];
              if (dates.length > 0) {
                dates.forEach(dateBlock => {
                  const dateLabel = dateBlock.displayDate || dateBlock.date || '--';
                  const items = dateBlock.items || dateBlock.itemsArray || [];
                  items.forEach(item => {
                    flat.push({
                      id: item.orderId || item.id,
                      orderId: item.orderId || group.orderId,
                      student: childName,
                      studentName: childName,
                      childName: childName,
                      item: item.name || item.itemName || '--',
                      date: dateLabel,
                      price: parseFloat(item.price || 0),
                      quantity: parseInt(item.quantity, 10) || 1,
                      size: item.sizeLabel || item.size || item.portionSize || '',
                      addons: item.addon || item.addons || [],
                    });
                  });
                });
              } else if (group.items && group.items.length > 0) {
                group.items.forEach(item => {
                  flat.push({
                    id: item.orderId || item.id,
                    orderId: item.orderId || group.orderId,
                    student: childName,
                    studentName: childName,
                    childName: childName,
                    item: item.name || item.itemName || '--',
                    date: item.orderDate || '--',
                    price: parseFloat(item.price || 0),
                    quantity: parseInt(item.quantity, 10) || 1,
                    size: item.sizeLabel || item.size || item.portionSize || '',
                    addons: item.addon || item.addons || [],
                  });
                });
              }
            });
            setCartItems(flat);
            setCartCount(flat.reduce((sum, it) => sum + (it.quantity || 1), 0));
            setCartTotal(flat.reduce((sum, it) => sum + (it.price * (it.quantity || 1)), 0));
          } else {
            setCartItems(data);
            setCartCount(data.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 1), 0));
            setCartTotal(data.reduce((sum, it) => sum + ((parseFloat(it.price) || 0) * (parseInt(it.quantity, 10) || 1)), 0));
          }
        } else {
          setCartItems([]);
          setCartCount(0);
          setCartTotal(0);
        }
      } else {
        setCartItems([]);
        setCartCount(0);
        setCartTotal(0);
      }
    } catch (err) {
      console.log('Cart refresh notice in App:', err);
    }
  }, []);

  // Fetch user profile and financial balance
  const refreshUserData = useCallback(async () => {
    try {
      const [profileRes, summaryRes] = await Promise.allSettled([
        getProfileApi(),
        getDashboardSummaryApi()
      ]);
      if (profileRes.status === 'fulfilled' && profileRes.value?.status === 'success') {
        const u = profileRes.value.data;
        if (u) {
          const name = u.name || `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.trim();
          if (name) setUserName(name);
        }
      }
      if (summaryRes.status === 'fulfilled' && summaryRes.value?.status === 'success') {
        const sumData = summaryRes.value.data?.summary;
        if (sumData) {
          if (sumData.availableFunds !== undefined) setAvailableFunds(parseFloat(sumData.availableFunds) || 0);
          if (sumData.amountOwed !== undefined) setAmountOwed(parseFloat(sumData.amountOwed) || 0);
        }
      }
    } catch (e) {
      console.log('User data refresh notice in App:', e);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      refreshUserData();
      refreshCart();
    }
  }, [isLoggedIn, refreshUserData, refreshCart]);

  const addToCart = (item) => {
    setCartItems(prev => {
      const next = [...prev, item];
      setCartCount(next.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 1), 0));
      setCartTotal(next.reduce((sum, it) => sum + ((parseFloat(it.price) || 0) * (parseInt(it.quantity, 10) || 1)), 0));
      return next;
    });
  };

  const removeFromCart = (indexOrId) => {
    setCartItems(prev => {
      const next = typeof indexOrId === 'number'
        ? prev.filter((_, idx) => idx !== indexOrId)
        : prev.filter(item => item.id !== indexOrId && item.orderId !== indexOrId);
      setCartCount(next.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 1), 0));
      setCartTotal(next.reduce((sum, it) => sum + ((parseFloat(it.price) || 0) * (parseInt(it.quantity, 10) || 1)), 0));
      return next;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setCartCount(0);
    setCartTotal(0);
  };

  const handleLoginSuccess = (user) => {
    setIsLoggedIn(true);
    if (user?.name) setUserName(user.name);
    refreshUserData();
    refreshCart();
  };

  const handleSignOut = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('is_logged_in');
    localStorage.removeItem('user_details');
    setIsLoggedIn(false);
    setUserName('');
    setAvailableFunds(0);
    setAmountOwed(0);
    setCartItems([]);
    setCartCount(0);
    setCartTotal(0);
  };

  const sharedProps = {
    students: [],
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    refreshCart,
    cartTotal,
    cartCount,
    availableFunds,
    setAvailableFunds,
    amountOwed,
    setAmountOwed,
    userName,
    setUserName,
    refreshUserData
  };

  return (
    <Routes>
      <Route path="/login" element={
        isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />
      } />

      <Route path="/" element={
        isLoggedIn ? (
          <Layout
            cartItems={cartItems}
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
        <Route path="dashboard" element={
          <Dashboard 
            cartItems={cartItems}
            setAvailableFunds={setAvailableFunds} 
            setAmountOwed={setAmountOwed} 
            addToCart={addToCart} 
            refreshCart={refreshCart} 
          />
        } />
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
