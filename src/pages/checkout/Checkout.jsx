import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  getCartApi,
  calculateTotalApi,
  validateOrdersApi,
  checkoutApi,
  getChildrenApi,
  topupCreditApi,
} from '../../services/api';
import { ShimmerCart } from '../../components/Shimmer';

const Checkout = ({ availableFunds = 0, setAvailableFunds, setAmountOwed, refreshCart, refreshUserData }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [childrenList, setChildrenList] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [orderIds, setOrderIds] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [useCredits, setUseCredits] = useState(true);

  // Success receipt modal
  const [showSuccess, setShowSuccess] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // Cancel confirmation modal
  const [showCancel, setShowCancel] = useState(false);

  // Quick Top-up Modal
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  // Load children for real student name resolution
  useEffect(() => {
    getChildrenApi()
      .then(res => {
        if (res && Array.isArray(res.data)) {
          setChildrenList(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const resolveChildName = (childId, fallbackName) => {
    const found = (childrenList || []).find(c => c && String(c.id) === String(childId));
    if (found) {
      return found.fullName || `${found.firstName || ''} ${found.lastName || ''}`.trim() || found.name || 'Student';
    }
    if (fallbackName && !String(fallbackName).startsWith('Child #')) {
      return fallbackName;
    }
    return fallbackName || 'Student';
  };

  /* ── Load cart + calculate totals ── */
  const loadCartAndCalculate = async () => {
    setLoading(true);
    try {
      const cartRes = await getCartApi();
      if (cartRes && cartRes.status === 'success') {
        const data = cartRes.data || [];
        const flat = [];
        let collectedIds = [];

        // Check if specific orderIds were passed from Shopping Cart state
        const stateOrderIds = location.state?.orderIds && Array.isArray(location.state.orderIds) && location.state.orderIds.length > 0
          ? location.state.orderIds.map(id => parseInt(id, 10))
          : null;

        const processGroup = (group) => {
          const groupOrderId = group.orderId ? parseInt(group.orderId, 10) : null;
          if (stateOrderIds && groupOrderId && !stateOrderIds.includes(groupOrderId)) {
            return; // Skip if user only selected specific orders
          }
          if (groupOrderId) collectedIds.push(groupOrderId);

          const childName = resolveChildName(
            group.childId || group.typeId,
            group.childName || group.studentName || group.student || group.name
          );

          const dates = group.dates || [];
          if (dates.length > 0) {
            dates.forEach(d => {
              const dateLabel = d.date || d.displayDate || '--';
              (d.items || []).forEach(item => {
                const itOrderId = item.orderId ? parseInt(item.orderId, 10) : groupOrderId;
                if (itOrderId) collectedIds.push(itOrderId);
                flat.push({
                  orderId: itOrderId,
                  name: item.name || item.itemName || '--',
                  student: childName,
                  date: dateLabel,
                  price: parseFloat(item.price || 0),
                  quantity: parseInt(item.quantity, 10) || 1,
                  size: item.sizeLabel || item.size || item.portionSize || '',
                  addons: item.addons || item.addon || []
                });
              });
            });
          } else if (group.items && group.items.length > 0) {
            group.items.forEach(item => {
              const itOrderId = item.orderId ? parseInt(item.orderId, 10) : groupOrderId;
              if (itOrderId) collectedIds.push(itOrderId);
              flat.push({
                orderId: itOrderId,
                name: item.name || item.itemName || '--',
                student: childName,
                date: item.orderDate || '--',
                price: parseFloat(item.price || 0),
                quantity: parseInt(item.quantity, 10) || 1,
                size: item.sizeLabel || item.size || item.portionSize || '',
                addons: item.addons || item.addon || []
              });
            });
          } else if (group.orderId) {
            // Flat order object fallback
            flat.push({
              orderId: groupOrderId,
              name: group.menuName || group.name || 'Lunch Meal',
              student: childName,
              date: group.createdDate ? group.createdDate.split('T')[0] : '--',
              price: parseFloat(group.amount || group.price || 0),
              quantity: 1,
              size: '',
              addons: []
            });
          }
        };

        if (Array.isArray(data)) {
          data.forEach(processGroup);
        }

        collectedIds = [...new Set(collectedIds.filter(Boolean))];
        setCartItems(flat);
        setOrderIds(collectedIds);

        if (collectedIds.length > 0) {
          const calcRes = await calculateTotalApi({ orderIds: collectedIds, useCredits });
          if (calcRes && calcRes.status === 'success') {
            setSummary(calcRes);
          }
        } else {
          setSummary(null);
        }
      }
    } catch (err) {
      console.error('Checkout init error:', err);
      toast.error('Unable to initialize checkout. Please review your cart.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCartAndCalculate();
  }, [location.state]);

  /* ── Recalculate when useCredits changes ── */
  useEffect(() => {
    if (orderIds.length === 0) return;
    calculateTotalApi({ orderIds, useCredits })
      .then(res => {
        if (res && res.status === 'success') {
          setSummary(res);
        }
      })
      .catch(err => {
        console.error('Recalculate total error:', err);
      });
  }, [useCredits, orderIds]);

  /* ── Derived amounts ── */
  const localSubtotal   = cartItems.reduce((a, c) => a + c.price * c.quantity, 0);
  const displaySubtotal = summary ? parseFloat(summary.subtotal || 0)       : localSubtotal;
  const displayTax      = summary ? parseFloat(summary.salesTax || 0)       : localSubtotal * 0.08;
  const displayFees     = summary ? parseFloat(summary.schoolFees || 0)     : 0;
  const displayCredits  = summary ? parseFloat(summary.creditsApplied || 0) : 0;
  const displayTotal    = summary ? parseFloat(summary.total || 0)          : localSubtotal * 1.08;
  const displayToPay    = summary ? parseFloat(summary.amountToPay || 0)    : displayTotal;
  const availCreds      = summary ? parseFloat(summary.availableCredits || 0) : parseFloat(availableFunds || 0);

  // Difference needed if insufficient credits
  const deficit = Math.max(0, displayTotal - availCreds);

  /* ── Finalize Payment / Checkout ── */
  const handlePay = async () => {
    if (orderIds.length === 0) {
      toast.error('No orders available in cart for checkout.');
      return;
    }

    if (availCreds < displayTotal) {
      toast.warn(`Insufficient wallet credits. Please add funds to cover $${displayTotal.toFixed(2)}.`);
      setShowTopupModal(true);
      setTopupAmount(deficit.toFixed(2));
      return;
    }

    setPaying(true);
    try {
      // Step 1: Pre-Checkout Validation
      try {
        const validRes = await validateOrdersApi({ orderIds });
        if (validRes && validRes.valid === false) {
          const detailMsgs = validRes.invalidOrders && validRes.invalidOrders.length > 0
            ? validRes.invalidOrders.map(o => o.reason).join(' | ')
            : validRes.message;
          toast.error(detailMsgs || 'Some orders failed pre-checkout validation.');
          setPaying(false);
          return;
        }
      } catch (vErr) {
        // If validation endpoint returns 400 or warning
        console.log('Pre-checkout validation notice:', vErr);
      }

      // Step 2: Finalize Checkout via Wallet Credits
      const checkRes = await checkoutApi({
        orderIds,
        paymentMethod: 'wallet_credit',
        useCredits: true,
        notes: 'Paid using available wallet credits',
      });

      if (checkRes && checkRes.status === 'success') {
        setReceipt(checkRes);
        setShowSuccess(true);

        // Sync global cart & user state
        if (refreshCart) {
          refreshCart();
        }
        if (refreshUserData) {
          refreshUserData();
        }

        if (setAvailableFunds && checkRes.remainingCredits !== undefined) {
          setAvailableFunds(parseFloat(checkRes.remainingCredits));
        }
        if (refreshCart) {
          refreshCart();
        }

        toast.success('Orders placed and paid successfully!');
      } else {
        const msg = checkRes?.message || 'Checkout failed. Please try again.';
        toast.error(msg);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      const errMsg = err.response?.data?.message
        || err.response?.data?.detail?.message
        || (Array.isArray(err.response?.data?.detail) ? err.response?.data?.detail.map(d => d.msg).join(', ') : null)
        || err.message
        || 'Payment processing failed.';
      toast.error(errMsg);
    } finally {
      setPaying(false);
    }
  };

  /* ── Quick Top-up Handler ── */
  const handleTopupSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(topupAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.warn('Please enter a valid amount to top up.');
      return;
    }

    setTopupLoading(true);
    try {
      const res = await topupCreditApi({ amount: amt, isDraft: 0 });
      if (res && (res.status === 'success' || res.newBalance !== undefined)) {
        toast.success(`Successfully added $${amt.toFixed(2)} to your wallet!`);
        setShowTopupModal(false);
        setTopupAmount('');

        // Refresh user funds in state
        if (refreshUserData) {
          refreshUserData();
        }
        if (setAvailableFunds && res.newBalance !== undefined) {
          setAvailableFunds(parseFloat(res.newBalance));
        }

        // Recalculate totals immediately
        if (orderIds.length > 0) {
          const calcRes = await calculateTotalApi({ orderIds, useCredits: true });
          if (calcRes && calcRes.status === 'success') {
            setSummary(calcRes);
          }
        }
      } else {
        toast.error(res?.message || 'Could not complete top up.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to top up wallet.');
    } finally {
      setTopupLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="page-header">
          <div className="shimmer-base shimmer-title" style={{ width: 180 }} />
          <div className="shimmer-base shimmer-line-sm" style={{ width: 280, marginTop: 8 }} />
        </div>
        <ShimmerCart />
      </>
    );
  }

  return (
    <>
      {/* ── Page Header ── */}
      <div className="page-header">
        <h1 className="page-title">
          <i className="lni lni-credit-cards" style={{ fontSize: 24, marginRight: 8, verticalAlign: 'middle', color: '#006D77' }} />
          Checkout & Finalize Orders
        </h1>
        <p className="page-subtitle">Review your selected child meals and pay seamlessly with your wallet credits.</p>
      </div>

      {cartItems.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <i className="lni lni-cart" style={{ fontSize: 56, color: '#9CA3AF', marginBottom: 16, display: 'block' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#1F2937' }}>No Items to Checkout</h2>
          <p style={{ color: '#636363', marginBottom: 24 }}>Your shopping cart is currently empty or these orders have already been finalized.</p>
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>
            Browse Menus & Place Orders
          </button>
        </div>
      ) : (
        <div className="checkout-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* ── Left Column: Payment Method & Wallet Balance ── */}
          <div className="card" style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
            <div className="card-body" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="lni lni-wallet" style={{ color: '#006D77' }} /> Payment Method
              </h3>

              {/* Wallet Credits Option (Active Primary) */}
              <div
                style={{
                  border: `2px solid ${useCredits ? '#006D77' : '#E5E7EB'}`,
                  borderRadius: 12,
                  padding: '18px 20px',
                  marginBottom: 20,
                  background: useCredits ? '#F0F9F9' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                onClick={() => setUseCredits(true)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        border: `2px solid ${useCredits ? '#006D77' : '#9CA3AF'}`,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {useCredits && <span style={{ width: 12, height: 12, background: '#006D77', borderRadius: '50%' }} />}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#006D77' }}>
                        Parent Wallet Credits
                      </div>
                      <div style={{ fontSize: 13, color: '#636363', marginTop: 2 }}>
                        Current Balance: <strong style={{ color: '#1F2937' }}>${availCreds.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#006D77',
                      background: '#E6F4F5',
                      padding: '4px 10px',
                      borderRadius: 20
                    }}
                  >
                    INSTANT PAY
                  </span>
                </div>

                {/* Credit Application Breakdown */}
                {displayCredits > 0 && (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop: '1px dashed #B2DFDB',
                      fontSize: 13,
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: '#22A06B',
                      fontWeight: 600
                    }}
                  >
                    <span>Credits to be applied:</span>
                    <span>−${displayCredits.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Insufficient Credit Alert Banner */}
              {availCreds < displayTotal && (
                <div
                  style={{
                    background: '#FEF3C7',
                    border: '1px solid #F59E0B',
                    borderRadius: 10,
                    padding: '14px 16px',
                    marginBottom: 20,
                    color: '#92400E'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <i className="lni lni-warning" style={{ fontSize: 20, marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                        Insufficient Wallet Balance
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                        You need <strong>${deficit.toFixed(2)}</strong> more to complete this order. Top up now to pay instantly.
                      </div>
                      <button
                        className="btn-primary"
                        style={{
                          marginTop: 10,
                          fontSize: 12,
                          padding: '6px 14px',
                          background: '#D97706',
                          borderColor: '#D97706'
                        }}
                        onClick={() => {
                          setTopupAmount(deficit.toFixed(2));
                          setShowTopupModal(true);
                        }}
                      >
                        + Top Up Wallet (${deficit.toFixed(2)})
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                <button
                  className="btn-cancel"
                  style={{ flex: 1, padding: '12px 18px', fontWeight: 600 }}
                  onClick={() => setShowCancel(true)}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  style={{
                    flex: 2,
                    padding: '12px 20px',
                    fontSize: 15,
                    fontWeight: 700,
                    background: availCreds >= displayTotal ? '#006D77' : '#9CA3AF',
                    cursor: availCreds >= displayTotal ? 'pointer' : 'not-allowed'
                  }}
                  onClick={handlePay}
                  disabled={paying || availCreds < displayTotal}
                >
                  {paying ? (
                    'Processing Payment…'
                  ) : (
                    `PAY $${displayTotal.toFixed(2)} WITH CREDITS →`
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ── Right Column: Order Items Summary ── */}
          <div>
            <div className="card" style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
              <div className="card-body" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>
                    Order Items ({cartItems.length})
                  </h3>
                  <button
                    className="btn-cancel"
                    style={{ fontSize: 12, padding: '4px 10px' }}
                    onClick={() => navigate('/shoppingcart')}
                  >
                    Edit Cart
                  </button>
                </div>

                {/* Items List */}
                <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 6 }}>
                  {cartItems.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '10px 0',
                        borderBottom: '1px solid #F3F4F6'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#1F2937' }}>
                          {item.name}
                        </div>
                        <div style={{ color: '#006D77', fontSize: 12, fontWeight: 500, marginTop: 2 }}>
                          {item.student} <span style={{ color: '#9CA3AF' }}>· {item.date}</span>
                        </div>
                        {item.size && (
                          <span
                            style={{
                              display: 'inline-block',
                              marginTop: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              background: '#EFF6FF',
                              color: '#3B82F6',
                              padding: '2px 6px',
                              borderRadius: 4
                            }}
                          >
                            {item.size}
                          </span>
                        )}
                        {item.addons && item.addons.length > 0 && (
                          <div style={{ fontSize: 11, color: '#636363', marginTop: 2 }}>
                            + {item.addons.map(a => a.name || a).join(', ')}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1F2937' }}>
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                        {item.quantity > 1 && (
                          <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                            Qty: {item.quantity} × ${item.price.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Breakdown Box */}
                <div className="checkout-summary-box" style={{ marginTop: 20 }}>
                  <div className="row">
                    <span>Subtotal</span>
                    <span>${displaySubtotal.toFixed(2)}</span>
                  </div>
                  <div className="row">
                    <span>Sales Tax</span>
                    <span>${displayTax.toFixed(2)}</span>
                  </div>
                  {displayFees > 0 && (
                    <div className="row">
                      <span>School Fees</span>
                      <span>${displayFees.toFixed(2)}</span>
                    </div>
                  )}
                  {displayCredits > 0 && (
                    <div className="row">
                      <span>Wallet Credits Applied</span>
                      <span style={{ color: '#22A06B', fontWeight: 600 }}>
                        −${displayCredits.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="row total">
                    <span>Total Order Amount</span>
                    <span style={{ color: '#006D77' }}>${displayTotal.toFixed(2)}</span>
                  </div>
                  <div className="row" style={{ marginTop: 8, fontSize: 12, color: '#636363' }}>
                    <span>Remaining Wallet Balance</span>
                    <span>${Math.max(0, availCreds - displayCredits).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Top Up Modal ── */}
      {showTopupModal && (
        <div className="modal-overlay" onClick={() => setShowTopupModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#006D77', marginBottom: 6 }}>
              Top Up Wallet Credits
            </h2>
            <p style={{ color: '#636363', fontSize: 13, marginBottom: 20 }}>
              Add funds directly to your parent account to complete your meal purchases instantly.
            </p>

            <form onSubmit={handleTopupSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  className="form-control"
                  placeholder="0.00"
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', fontSize: 16 }}
                />
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {deficit > 0 && (
                  <button
                    type="button"
                    className="btn-cancel"
                    style={{ fontSize: 12, padding: '4px 10px', borderColor: '#006D77', color: '#006D77', fontWeight: 600 }}
                    onClick={() => setTopupAmount(deficit.toFixed(2))}
                  >
                    Exact Needed (${deficit.toFixed(2)})
                  </button>
                )}
                <button
                  type="button"
                  className="btn-cancel"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={() => setTopupAmount('25.00')}
                >
                  $25.00
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={() => setTopupAmount('50.00')}
                >
                  $50.00
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={() => setTopupAmount('100.00')}
                >
                  $100.00
                </button>
              </div>

              <div className="modal-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowTopupModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={topupLoading}
                >
                  {topupLoading ? 'Adding Funds…' : 'Add Funds to Wallet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Success Receipt Modal ── */}
      {showSuccess && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 480, textAlign: 'center', padding: '32px 28px' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: '#E6F4EA',
                color: '#22A06B',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 38,
                marginBottom: 16
              }}
            >
              ✓
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1F2937', marginBottom: 6 }}>
              Payment Successful!
            </h2>
            <p style={{ color: '#636363', fontSize: 14, marginBottom: 24 }}>
              Your lunch orders have been confirmed and marked as <strong>PAID</strong>.
            </p>

            {/* Receipt Summary Card */}
            <div
              style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: 13,
                marginBottom: 24
              }}
            >
              {receipt?.orderIds && receipt.orderIds.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#636363' }}>Order ID(s):</span>
                  <span style={{ fontWeight: 700, color: '#006D77' }}>
                    #{receipt.orderIds.join(', #')}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#636363' }}>Payment Method:</span>
                <span style={{ fontWeight: 600 }}>Wallet Credits</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#636363' }}>Total Paid:</span>
                <span style={{ fontWeight: 700, color: '#22A06B' }}>
                  ${parseFloat(receipt?.totalAmount || displayTotal).toFixed(2)}
                </span>
              </div>
              {receipt?.remainingCredits !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #E5E7EB' }}>
                  <span style={{ color: '#636363' }}>Remaining Credits:</span>
                  <span style={{ fontWeight: 700 }}>
                    ${parseFloat(receipt.remainingCredits).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn-cancel"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowSuccess(false);
                  navigate('/dashboard');
                }}
              >
                Dashboard
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowSuccess(false);
                  navigate('/myorders');
                }}
              >
                View in My Orders →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Confirmation Modal ── */}
      {showCancel && (
        <div className="modal-overlay" onClick={() => setShowCancel(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Cancel Checkout?</h2>
            <p style={{ color: '#636363', fontSize: 14, marginBottom: 20 }}>
              Your draft meal orders will remain safely saved in your shopping cart for later checkout.
            </p>
            <div className="modal-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-cancel" onClick={() => setShowCancel(false)}>
                Stay Here
              </button>
              <button
                className="btn-primary"
                style={{ background: '#E54A4A', borderColor: '#E54A4A' }}
                onClick={() => {
                  setShowCancel(false);
                  navigate('/shoppingcart');
                }}
              >
                Return to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Checkout;
