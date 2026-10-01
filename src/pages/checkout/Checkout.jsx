import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  getCartApi,
  calculateTotalApi,
  validateOrdersApi,
  checkoutApi,
} from '../../services/api';
import { ShimmerCart } from '../../components/Shimmer';


const Checkout = () => {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [orderIds, setOrderIds]   = useState([]);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [paying, setPaying]       = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCancel, setShowCancel]   = useState(false);
  const [useCredits, setUseCredits]   = useState(true);

  /* ── Load cart + calculate totals ── */
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const cartRes = await getCartApi();
        if (cartRes && cartRes.status === 'success') {
          const data = cartRes.data || [];
          const flat = [];
          const ids  = [];
          const processGroup = (group) => {
            const childName = group.childName || group.student || group.name || 'Student';
            (group.dates || []).forEach(d => {
              const dateLabel = d.date || d.displayDate || '--';
              (d.items || []).forEach(item => {
                if (item.orderId) ids.push(item.orderId);
                flat.push({
                  name:     item.name || item.itemName || '--',
                  student:  childName,
                  date:     dateLabel,
                  price:    parseFloat(item.price || 0),
                  quantity: item.quantity || 1,
                });
              });
            });
            // flat structure
            if (group.orderId && !group.dates) {
              ids.push(group.orderId);
              flat.push({
                name:     group.name || '--',
                student:  childName,
                date:     group.date || '--',
                price:    parseFloat(group.price || group.amount || 0),
                quantity: group.quantity || 1,
              });
            }
          };

          if (Array.isArray(data)) {
            data.forEach(processGroup);
          }

          // Also collect top-level orderIds
          data.forEach(d => { if (d.orderId) ids.push(d.orderId); });
          const uniqueIds = [...new Set(ids)];

          setCartItems(flat);
          setOrderIds(uniqueIds);

          // Calculate totals
          if (uniqueIds.length > 0) {
            const calcRes = await calculateTotalApi({ orderIds: uniqueIds, useCredits });
            if (calcRes && calcRes.status === 'success') {
              setSummary(calcRes);
            }
          }
        }
      } catch (err) {
        console.error('Checkout init error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  /* ── Recalculate when useCredits changes ── */
  useEffect(() => {
    if (orderIds.length === 0) return;
    calculateTotalApi({ orderIds, useCredits })
      .then(res => { if (res?.status === 'success') setSummary(res); })
      .catch(() => {});
  }, [useCredits]);

  /* ── Finalize payment ── */
  const handlePay = async () => {
    if (orderIds.length === 0) return toast.error('No items in cart to checkout.');
    setPaying(true);
    try {
      // Step 1: Validate
      const validRes = await validateOrdersApi({ orderIds });
      if (validRes && validRes.valid === false) {
        toast.error(validRes.message || 'Some items failed validation. Please review your cart.');
        setPaying(false);
        return;
      }

      // Step 2: Checkout
      const checkRes = await checkoutApi({
        orderIds,
        paymentMethod: 'wallet_credit',
        notes: 'Paid using available wallet credits',
      });

      if (checkRes && checkRes.status === 'success') {
        setShowSuccess(true);
      } else {
        toast.error(checkRes?.message || 'Payment failed. Please try again.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment processing failed.');
    } finally {
      setPaying(false);
    }
  };

  /* ── Derived amounts ── */
  const localSubtotal   = cartItems.reduce((a, c) => a + c.price * c.quantity, 0);
  const displaySubtotal = summary ? parseFloat(summary.subtotal || 0)       : localSubtotal;
  const displayTax      = summary ? parseFloat(summary.salesTax || 0)       : localSubtotal * 0.08;
  const displayFees     = summary ? parseFloat(summary.schoolFees || 0)     : 0;
  const displayCredits  = summary ? parseFloat(summary.creditsApplied || 0) : 0;
  const displayTotal    = summary ? parseFloat(summary.total || 0)          : localSubtotal * 1.08;
  const displayToPay    = summary ? parseFloat(summary.amountToPay || 0)    : displayTotal;
  const availCreds      = summary ? parseFloat(summary.availableCredits || 0) : 0;

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
      <div className="page-header">
        <h1 className="page-title">Checkout</h1>
        <p className="page-subtitle">Review your order and complete payment.</p>
      </div>

      <div className="checkout-grid">
        {/* ── Payment / Credits Panel ── */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Payment Method</h3>

            {/* Wallet Credit Toggle */}
            <div style={{
              border: `2px solid ${useCredits ? '#006D77' : '#D2DCE8'}`,
              borderRadius: 10, padding: 16, marginBottom: 20,
              background: useCredits ? '#E6F4F5' : '#fff',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
              onClick={() => setUseCredits(true)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 18, height: 18, border: `2px solid ${useCredits ? '#006D77' : '#D2DCE8'}`,
                  borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {useCredits && <span style={{ width: 9, height: 9, background: '#006D77', borderRadius: '50%' }} />}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#006D77' }}>Wallet Credits</div>
                  <div style={{ fontSize: 12, color: '#636363' }}>
                    Available: <strong>${availCreds.toFixed(2)}</strong>
                    {displayCredits > 0 && (
                      <span style={{ color: '#22A06B', marginLeft: 8 }}>
                        (−${displayCredits.toFixed(2)} applied)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {availCreds < displayToPay && (
              <div style={{
                background: '#FFF7ED', border: '1px solid #FCD34D', borderRadius: 8,
                padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#92400E'
              }}>
                <i className="lni lni-warning" style={{ marginRight: 6 }} />
                Insufficient wallet balance. Please top up via <strong>Credit History</strong> to complete this payment.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button className="btn-cancel" onClick={() => setShowCancel(true)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handlePay}
                disabled={paying || cartItems.length === 0}
                style={{ opacity: paying ? 0.7 : 1 }}
              >
                {paying ? 'Processing…' : `PAY $${displayToPay.toFixed(2)} →`}
              </button>
            </div>
          </div>
        </div>

        {/* ── Order Summary ── */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Order Items</h3>
              {cartItems.length === 0 ? (
                <p style={{ color: '#9CA3AF', textAlign: 'center' }}>No items in cart.</p>
              ) : cartItems.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 13, padding: '7px 0', borderBottom: '1px solid #F3F4F6'
                }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                    <div style={{ color: '#9CA3AF', fontSize: 11 }}>{item.student} · {item.date}</div>
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}

              <div className="checkout-summary-box" style={{ marginTop: 16 }}>
                <div className="row"><span>Subtotal</span><span>${displaySubtotal.toFixed(2)}</span></div>
                <div className="row"><span>Sales Tax</span><span>${displayTax.toFixed(2)}</span></div>
                {displayFees > 0 && (
                  <div className="row"><span>School Fees</span><span>${displayFees.toFixed(2)}</span></div>
                )}
                {displayCredits > 0 && (
                  <div className="row">
                    <span>Credits Applied</span>
                    <span style={{ color: '#22A06B' }}>−${displayCredits.toFixed(2)}</span>
                  </div>
                )}
                <div className="row"><span>Total</span><span>${displayTotal.toFixed(2)}</span></div>
                <div className="row total"><span>Amount to Pay</span><span>${displayToPay.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Success Modal ── */}
      {showSuccess && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, color: '#22A06B', marginBottom: 12 }}>✓</div>
            <h2>Payment Successful!</h2>
            <p style={{ color: '#636363', marginBottom: 24 }}>
              Your payment of <strong>${displayToPay.toFixed(2)}</strong> was processed successfully.
            </p>
            <button className="btn-primary" onClick={() => { setShowSuccess(false); navigate('/myorders'); }}>
              View My Orders
            </button>
          </div>
        </div>
      )}

      {/* ── Cancel Modal ── */}
      {showCancel && (
        <div className="modal-overlay" onClick={() => setShowCancel(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2>Cancel Checkout?</h2>
            <p style={{ color: '#636363', marginBottom: 24 }}>
              Your cart items will be preserved for later.
            </p>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCancel(false)}>No, Stay</button>
              <button
                className="btn-primary"
                style={{ background: '#E54A4A' }}
                onClick={() => { setShowCancel(false); navigate('/shoppingcart'); }}
              >
                Go Back to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Checkout;
