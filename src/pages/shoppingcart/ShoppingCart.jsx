import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiTrash2, FiRefreshCw } from 'react-icons/fi';
import { getCartApi, deleteCartItemApi, calculateTotalApi } from '../../services/api';
import { ShimmerCart } from '../../components/Shimmer';


const ShoppingCart = () => {
  const navigate = useNavigate();
  const [cartGroups, setCartGroups] = useState([]);   // grouped by child
  const [flatItems, setFlatItems]   = useState([]);   // flat list for delete actions
  const [loading, setLoading]       = useState(true);
  const [summary, setSummary]       = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // null = clear all

  /* ── Fetch cart from API ── */
  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await getCartApi();
      if (res && res.status === 'success') {
        // data can be an array of child groups or a flat array
        const data = res.data || [];
        if (Array.isArray(data)) {
          // Try to detect grouped vs flat
          const isGrouped = data.length > 0 && (data[0].childName || data[0].student || data[0].dates || data[0].items);
          if (isGrouped) {
            setCartGroups(data);
            // Flatten for display
            const flat = [];
            data.forEach(group => {
              const childName = group.childName || group.student || group.name || 'Student';
              const dates = group.dates || [];
              dates.forEach(dateBlock => {
                const dateLabel = dateBlock.date || dateBlock.displayDate || '--';
                const items = dateBlock.items || dateBlock.itemsArray || [];
                items.forEach(item => {
                  flat.push({
                    id:       item.orderId || item.id,
                    student:  childName,
                    item:     item.name || item.itemName || '--',
                    date:     dateLabel,
                    price:    parseFloat(item.price || 0),
                    quantity: item.quantity || 1,
                    size:     item.size || item.portionSize || '',
                    addons:   item.addon || item.addons || [],
                  });
                });
              });
            });
            setFlatItems(flat);
          } else {
            // Flat response — treat each record as an order item
            setCartGroups([]);
            const flat = data.map(item => ({
              id:       item.orderId || item.id,
              student:  item.student || item.childName || '--',
              item:     item.name || item.itemName || '--',
              date:     item.date || item.displayDate || '--',
              price:    parseFloat(item.price || item.amount || 0),
              quantity: item.quantity || 1,
              size:     item.size || '',
              addons:   item.addon || item.addons || [],
            }));
            setFlatItems(flat);
          }
        }
        // Also compute totals
        await handleCalcTotal(res.data);
      } else {
        setFlatItems([]);
      }
    } catch (err) {
      console.error('Cart fetch error:', err);
      setFlatItems([]);
    } finally {
      setLoading(false);
    }
  };

  /* ── Calculate order totals ── */
  const handleCalcTotal = async (cartData) => {
    try {
      // Collect all order IDs
      let orderIds = [];
      if (Array.isArray(cartData)) {
        cartData.forEach(group => {
          if (group.orderId) orderIds.push(group.orderId);
          (group.dates || []).forEach(d => {
            (d.items || []).forEach(it => {
              if (it.orderId) orderIds.push(it.orderId);
            });
          });
          // flat
          if (!group.dates && group.orderId) orderIds.push(group.orderId);
        });
      }
      // dedupe
      orderIds = [...new Set(orderIds)];
      if (orderIds.length === 0) return;

      setCalcLoading(true);
      const res = await calculateTotalApi({ orderIds, useCredits: true });
      if (res && res.status === 'success') {
        setSummary(res);
      }
    } catch (err) {
      // silently ignore – show local subtotal instead
    } finally {
      setCalcLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  /* ── Remove single item ── */
  const confirmDelete = (item) => {
    setDeleteTarget(item);
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    setShowDeleteModal(false);
    if (!deleteTarget) {
      // Clear all
      try {
        await deleteCartItemApi('all');
        setFlatItems([]);
        setSummary(null);
        toast.success('Cart cleared!');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to clear cart');
      }
      return;
    }
    try {
      await deleteCartItemApi(deleteTarget.id);
      setFlatItems(prev => prev.filter(c => c.id !== deleteTarget.id));
      toast.success('Item removed from cart');
      fetchCart(); // re-fetch to update totals
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove item');
    }
    setDeleteTarget(null);
  };

  /* ── Derived totals (fallback if calculate API fails) ── */
  const localSubtotal = flatItems.reduce((a, c) => a + c.price * c.quantity, 0);
  const displaySubtotal     = summary ? parseFloat(summary.subtotal || 0)          : localSubtotal;
  const displayTax          = summary ? parseFloat(summary.salesTax || 0)          : localSubtotal * 0.08;
  const displayFees         = summary ? parseFloat(summary.schoolFees || 0)        : 0;
  const displayCredits      = summary ? parseFloat(summary.creditsApplied || 0)    : 0;
  const displayTotal        = summary ? parseFloat(summary.total || 0)             : localSubtotal * 1.08;
  const displayAmtToPay     = summary ? parseFloat(summary.amountToPay || 0)       : displayTotal;

  return (
    <>
      {/* ── Header ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="page-title">
            <i className="lni lni-cart-alt" style={{ fontSize: 22 }} /> Shopping Cart
          </h1>
          {flatItems.length > 0 && (
            <button
              className="action-btn red"
              title="Clear Cart"
              onClick={() => { setDeleteTarget(null); setShowDeleteModal(true); }}
              style={{ width: 38, height: 38 }}
            >
              <FiTrash2 size={16} />
            </button>
          )}
        </div>
        <button
          className="btn-cancel"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={fetchCart}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? 'spin-icon' : ''} size={14} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <ShimmerCart />
      ) : flatItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
          <i className="lni lni-cart-alt" style={{ fontSize: 52, display: 'block', marginBottom: 12 }} />
          <p style={{ fontSize: 16 }}>Your cart is empty.</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/dashboard')}>
            Browse Menu
          </button>
        </div>
      ) : (
        <div className="checkout-grid">
          {/* ── Cart Table ── */}
          <div className="hl-table-wrap">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E7EB', fontWeight: 700 }}>
              Cart Items ({flatItems.length})
            </div>
            <table className="hl-table">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>ITEM</th>
                  <th>DATE</th>
                  <th>SIZE</th>
                  <th>PRICE</th>
                  <th>QTY</th>
                  <th>TOTAL</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {flatItems.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td style={{ fontWeight: 500 }}>{item.student}</td>
                    <td>
                      <div>{item.item}</div>
                      {item.addons && item.addons.length > 0 && (
                        <div style={{ fontSize: 11, color: '#636363', marginTop: 2 }}>
                          + {item.addons.map(a => a.name || a).join(', ')}
                        </div>
                      )}
                    </td>
                    <td style={{ color: '#636363' }}>{item.date}</td>
                    <td>
                      {item.size ? (
                        <span style={{ fontSize: 11, background: '#EFF6FF', color: '#4A90D9', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                          {item.size}
                        </span>
                      ) : '--'}
                    </td>
                    <td>${item.price.toFixed(2)}</td>
                    <td>{item.quantity}</td>
                    <td><strong>${(item.price * item.quantity).toFixed(2)}</strong></td>
                    <td>
                      <button className="action-btn red" onClick={() => confirmDelete(item)}>
                        <FiTrash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Order Summary ── */}
          <div className="card">
            <div className="card-body">
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1F2937' }}>Order Summary</h3>
              {calcLoading ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#006D77' }}>Calculating…</div>
              ) : (
                <div className="checkout-summary-box">
                  <div className="row"><span>Subtotal</span><span>${displaySubtotal.toFixed(2)}</span></div>
                  <div className="row"><span>Sales Tax</span><span>${displayTax.toFixed(2)}</span></div>
                  {displayFees > 0 && (
                    <div className="row"><span>School Fees</span><span>${displayFees.toFixed(2)}</span></div>
                  )}
                  {displayCredits > 0 && (
                    <div className="row"><span>Credits Applied</span><span style={{ color: '#22A06B' }}>-${displayCredits.toFixed(2)}</span></div>
                  )}
                  <div className="row"><span>Total</span><span>${displayTotal.toFixed(2)}</span></div>
                  <div className="row total"><span>Amount to Pay</span><span>${displayAmtToPay.toFixed(2)}</span></div>
                </div>
              )}
              <button
                className="btn-primary"
                style={{ width: '100%', marginTop: 16 }}
                onClick={() => navigate('/checkout')}
              >
                PROCEED TO CHECKOUT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <i className="lni lni-warning" style={{ fontSize: 40, color: '#E54A4A' }} />
            </div>
            <h2 style={{ textAlign: 'center' }}>
              {deleteTarget ? 'Remove Item?' : 'Clear Cart?'}
            </h2>
            <p style={{ textAlign: 'center', color: '#636363', marginBottom: 24 }}>
              {deleteTarget
                ? `Remove "${deleteTarget.item}" from your cart?`
                : 'Are you sure you want to remove all items from your cart?'}
            </p>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button
                className="btn-primary"
                style={{ background: '#E54A4A' }}
                onClick={executeDelete}
              >
                {deleteTarget ? 'Remove' : 'Yes, Clear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShoppingCart;
