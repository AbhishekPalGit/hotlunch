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
  deleteCartItemApi,
} from '../../services/api';
import { ShimmerCart } from '../../components/Shimmer';
import { exportInvoice } from '../../utils/invoiceGenerator';

const PAYMENT_METHODS_OPTIONS = [
  // Column 1
  'Use Available Credit',
  'Use Available Credit',
  'Use Available Credit',
  'Use Available Credit',
  'Use Available Credit',
  // Column 2
  'Use Available Credit',
  'Use Available Credit',
  'Use Available Credit',
  'Use Available Credit',
  'Use Available Credit'
];

const Checkout = ({ availableFunds = 0, setAvailableFunds, setAmountOwed, refreshCart, refreshUserData }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [childrenList, setChildrenList] = useState([]);
  const [orders, setOrders] = useState([]);
  const [expandedOrderIds, setExpandedOrderIds] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [selectedMethodIdx, setSelectedMethodIdx] = useState(0);

  // Success receipt modal
  const [showSuccess, setShowSuccess] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // Quick Top-up Modal
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, order: null });
  const [deleting, setDeleting] = useState(false);

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

  /* ── Load Cart Orders ── */
  const loadCartOrders = async () => {
    setLoading(true);
    try {
      const cartRes = await getCartApi();
      if (cartRes && cartRes.status === 'success' && Array.isArray(cartRes.data) && cartRes.data.length > 0) {
        const rawGroups = cartRes.data;
        const stateOrderIds = location.state?.orderIds && Array.isArray(location.state.orderIds) && location.state.orderIds.length > 0
          ? location.state.orderIds.map(id => parseInt(id, 10))
          : null;

        const filteredGroups = stateOrderIds
          ? rawGroups.filter(g => g.orderId && stateOrderIds.includes(parseInt(g.orderId, 10)))
          : rawGroups;

        if (filteredGroups.length === 0) {
          setOrders([]);
          setSummary(null);
          return;
        }

        const mappedOrders = filteredGroups.map((g, idx) => {
          const oId = g.orderId || g.id || (idx + 1);
          const cName = resolveChildName(g.childId || g.typeId, g.childName || g.studentName);

          let dateStr = '';
          if (g.createdDate) {
            try {
              const d = new Date(g.createdDate);
              dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            } catch (e) {
              dateStr = String(g.createdDate);
            }
          } else {
            dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          }

          let dateSections = [];
          if (Array.isArray(g.dates) && g.dates.length > 0) {
            dateSections = g.dates.map(ds => ({
              date: ds.displayDate || ds.date || 'Meal Date',
              items: (ds.items || []).flatMap(it => {
                const mainItem = {
                  name: (it.name || it.itemName || 'Meal Item').toUpperCase(),
                  unitPrice: parseFloat(it.price || it.unitPrice || 0),
                  quantity: parseInt(it.quantity, 10) || 1,
                  total: parseFloat(it.total ?? (parseFloat(it.price || 0) * (parseInt(it.quantity, 10) || 1)))
                };
                const addonItems = Array.isArray(it.addons) ? it.addons.map(ad => ({
                  name: `+ ${ad.name || ad.itemName || 'Addon'}`.toUpperCase(),
                  unitPrice: parseFloat(ad.price || ad.unitPrice || 0),
                  quantity: parseInt(ad.quantity, 10) || 1,
                  total: parseFloat(ad.total ?? (parseFloat(ad.price || 0) * (parseInt(ad.quantity, 10) || 1)))
                })) : [];
                return [mainItem, ...addonItems];
              })
            }));
          } else if (Array.isArray(g.items) && g.items.length > 0) {
            const groupedByDate = {};
            g.items.forEach(it => {
              const dKey = it.orderDate || it.date || 'Meal Date';
              if (!groupedByDate[dKey]) groupedByDate[dKey] = [];
              const mainQty = parseInt(it.quantity, 10) || 1;
              const mainPrice = parseFloat(it.price || 0);
              groupedByDate[dKey].push({
                name: (it.name || it.itemName || 'Meal Item').toUpperCase(),
                unitPrice: mainPrice,
                quantity: mainQty,
                total: parseFloat(it.total ?? (mainPrice * mainQty))
              });
              if (Array.isArray(it.addons)) {
                it.addons.forEach(ad => {
                  const adQty = parseInt(ad.quantity, 10) || 1;
                  const adPrice = parseFloat(ad.price || 0);
                  groupedByDate[dKey].push({
                    name: `+ ${ad.name || ad.itemName || 'Addon'}`.toUpperCase(),
                    unitPrice: adPrice,
                    quantity: adQty,
                    total: parseFloat(ad.total ?? (adPrice * adQty))
                  });
                });
              }
            });
            dateSections = Object.entries(groupedByDate).map(([dt, its]) => ({
              date: dt,
              items: its
            }));
          }

          const computedItemsTotal = dateSections.reduce((sum, ds) => 
            sum + ds.items.reduce((iSum, it) => iSum + (it.total || 0), 0), 0
          );
          const oSubtotal = parseFloat(g.amount) > 0 ? parseFloat(g.amount) : computedItemsTotal;
          const oTax = parseFloat(g.salesTax ?? g.tax ?? 0);
          const oSchoolFee = parseFloat(g.schoolFees ?? g.schoolFee ?? 0);
          const oLateFee = parseFloat(g.lateFees ?? g.lateFee ?? 0);
          const oGrandTotal = parseFloat((oSubtotal + oTax + oSchoolFee + oLateFee).toFixed(2));

          return {
            orderId: oId,
            orderNumber: `#${oId}`,
            createdDate: dateStr,
            childName: cName,
            amount: oGrandTotal,
            dates: dateSections,
            orderAmount: oSubtotal,
            salesTax: oTax,
            schoolFees: oSchoolFee,
            lateFees: oLateFee,
            grandTotal: oGrandTotal
          };
        });

        setOrders(mappedOrders);
        if (mappedOrders.length > 0) {
          setExpandedOrderIds([mappedOrders[0].orderId]);
        }

        const validIds = mappedOrders.map(o => o.orderId).filter(id => typeof id === 'number' || (typeof id === 'string' && !id.startsWith('local_')));
        if (validIds.length > 0) {
          try {
            const calcRes = await calculateTotalApi({ orderIds: validIds, useCredits: true });
            if (calcRes && calcRes.status === 'success') {
              setSummary(calcRes);
            }
          } catch (calcErr) {
            console.error('Error calculating total:', calcErr);
          }
        }
      } else {
        setOrders([]);
        setSummary(null);
      }
    } catch (err) {
      console.error('Cart fetch notice for checkout:', err);
      setOrders([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCartOrders();
  }, [location.state]);

  const toggleExpandOrder = (id) => {
    setExpandedOrderIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const promptDeleteOrder = (order) => {
    setDeleteModal({
      isOpen: true,
      order,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.order) return;
    const orderId = deleteModal.order.orderId;
    setDeleting(true);
    try {
      await deleteCartItemApi(orderId);
      toast.success('Order removed from cart.');
      const remainingOrders = orders.filter(o => o.orderId !== orderId);
      setOrders(remainingOrders);
      if (refreshCart) refreshCart();
      const validIds = remainingOrders.map(o => o.orderId).filter(id => typeof id === 'number' || (typeof id === 'string' && !id.startsWith('local_')));
      if (validIds.length > 0) {
        try {
          const calcRes = await calculateTotalApi({ orderIds: validIds, useCredits: true });
          if (calcRes && calcRes.status === 'success') {
            setSummary(calcRes);
          }
        } catch (calcErr) {
          console.error('Error recalculating total after delete:', calcErr);
        }
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.error('Delete order error:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail?.message || 'Could not remove order from cart.';
      toast.error(errMsg);
      const remainingOrders = orders.filter(o => o.orderId !== orderId);
      setOrders(remainingOrders);
      if (refreshCart) refreshCart();
    } finally {
      setDeleting(false);
      setDeleteModal({ isOpen: false, order: null });
    }
  };

  const handleDownloadInvoice = async (order) => {
    try {
      const cleanId = String(order.orderNumber || order.orderId || order.id || 'receipt').replace(/^#/, '');
      await exportInvoice(order, { download: true, print: false });
      toast.success(`Invoice #${cleanId} downloaded as PDF!`);
    } catch (err) {
      console.error('Error generating invoice from checkout:', err);
      const targetId = order.orderNumber || order.orderId || order.id || order.rawId;
      if (targetId) {
        navigate(`/myorders/${targetId}`, { state: { orderId: targetId, order } });
      } else {
        window.print();
      }
    }
  };

  /* ── Calculations ── */
  const dueAmount = summary 
    ? parseFloat(summary.subtotal ?? 0)
    : orders.reduce((acc, o) => acc + (parseFloat(o.orderAmount) || 0), 0);

  const salesTax = summary
    ? parseFloat(summary.salesTax ?? 0)
    : orders.reduce((acc, o) => acc + (parseFloat(o.salesTax) || 0), 0);

  const schoolFees = summary
    ? parseFloat(summary.schoolFees ?? 0)
    : orders.reduce((acc, o) => acc + (parseFloat(o.schoolFees) || 0), 0);

  const convenienceFee = summary
    ? parseFloat(summary.convenienceFee ?? 0)
    : 0.00;

  const totalAmount = summary
    ? parseFloat(summary.total ?? (dueAmount + salesTax + schoolFees + convenienceFee))
    : (dueAmount + salesTax + schoolFees + convenienceFee);

  const avlCredits = summary?.availableCredits !== undefined
    ? parseFloat(summary.availableCredits)
    : parseFloat(availableFunds || 0);

  const appliedCredits = summary?.creditsApplied !== undefined
    ? parseFloat(summary.creditsApplied)
    : Math.min(totalAmount, avlCredits);

  const amountToPay = summary?.amountToPay !== undefined
    ? parseFloat(summary.amountToPay)
    : Math.max(0, totalAmount - appliedCredits);

  const deficit = Math.max(0, amountToPay - avlCredits);

  /* ── Proceed with Checkout ── */
  const handleProceed = async () => {
    const activeOrderIds = orders.map(o => o.orderId).filter(Boolean);
    if (activeOrderIds.length === 0) {
      toast.warn('No orders selected for checkout.');
      return;
    }

    if (avlCredits < amountToPay) {
      toast.warn(`Insufficient wallet credits. Please add funds to cover $${amountToPay.toFixed(2)}.`);
      setShowTopupModal(true);
      setTopupAmount(deficit.toFixed(2));
      return;
    }

    setPaying(true);
    try {
      try {
        const validRes = await validateOrdersApi({ orderIds: activeOrderIds });
        if (validRes && validRes.valid === false) {
          toast.error(validRes.message || 'Validation error');
          setPaying(false);
          return;
        }
      } catch (e) {
        // Validation notice
      }

      const checkRes = await checkoutApi({
        orderIds: activeOrderIds,
        paymentMethod: 'wallet_credit',
        useCredits: true,
        notes: 'Paid using available wallet credits'
      });

      if (checkRes && checkRes.status === 'success') {
        setReceipt(checkRes);
        setShowSuccess(true);
        if (refreshCart) refreshCart();
        if (refreshUserData) refreshUserData();
        if (setAvailableFunds && checkRes.remainingCredits !== undefined) {
          setAvailableFunds(parseFloat(checkRes.remainingCredits));
        }
        toast.success('Orders placed and paid successfully!');
      } else {
        toast.error(checkRes?.message || 'Checkout failed. Please try again.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail?.message || 'Payment processing failed. Please try again.';
      toast.error(errMsg);
    } finally {
      setPaying(false);
    }
  };

  /* ── Quick Top-up Handler ── */
  const handleTopupSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(topupAmount);
    if (isNaN(amt) || amt <= 0) return toast.warn('Enter a valid amount.');

    setTopupLoading(true);
    try {
      const res = await topupCreditApi({ amount: amt, isDraft: 0 });
      if (res && (res.status === 'success' || res.newBalance !== undefined)) {
        toast.success(`Successfully added $${amt.toFixed(2)} to your wallet!`);
        setShowTopupModal(false);
        setTopupAmount('');
        if (refreshUserData) refreshUserData();
        if (setAvailableFunds && res.newBalance !== undefined) {
          setAvailableFunds(parseFloat(res.newBalance));
        }
        await loadCartOrders();
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
      <div style={{ marginTop: 24 }}>
        <ShimmerCart />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="checkout-empty-wrap" style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', margin: '24px 0', border: '1px solid #E2E8F0' }}>
        <i className="lni lni-cart" style={{ fontSize: 56, color: '#006D77', display: 'block', marginBottom: 16 }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Your Checkout Cart is Empty</h2>
        <p style={{ color: '#64748B', fontSize: 15, maxWidth: 460, margin: '0 auto 24px' }}>
          There are no pending meal orders selected for checkout. Please browse our daily menus to select meals for your children.
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate('/dashboard')}
          style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, borderRadius: 8, cursor: 'pointer' }}
        >
          Browse Menus
        </button>
      </div>
    );
  }

  const col1Methods = PAYMENT_METHODS_OPTIONS.slice(0, 5);
  const col2Methods = PAYMENT_METHODS_OPTIONS.slice(5, 10);

  return (
    <div className="checkout-page-container">
      {/* ── Left Column: Orders List Stack ── */}
      <div className="checkout-orders-stack">
        {orders.map((order, idx) => {
          const isExpanded = expandedOrderIds.includes(order.orderId);

          return (
            <div className="checkout-order-card" key={order.orderId || idx}>
              {/* Order Header Bar */}
              <div
                className="checkout-order-header"
                onClick={() => toggleExpandOrder(order.orderId)}
              >
                <div className="checkout-order-meta-group">
                  <div className="checkout-order-badge-icon">
                    <i className="lni lni-calendar" />
                  </div>

                  <span className="checkout-order-title">
                    ORDER {order.orderNumber}
                  </span>

                  <span className="checkout-order-pipe">|</span>

                  <div className="checkout-order-meta-item">
                    <i className="lni lni-calendar" />
                    <span>{order.createdDate}</span>
                  </div>

                  <span className="checkout-order-pipe">|</span>

                  <div className="checkout-order-meta-item">
                    <i className="lni lni-user" />
                    <span>{order.childName}</span>
                  </div>

                  <span className="checkout-order-pipe">|</span>

                  <div className="checkout-order-meta-item">
                    <i className="lni lni-dollar" />
                    <span>${order.amount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Top-Right Action Circles */}
                <div
                  className="checkout-order-actions"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="checkout-circle-btn teal"
                    onClick={() => handleDownloadInvoice(order)}
                    title="Download Invoice"
                  >
                    <i className="lni lni-download" />
                  </button>

                  <button
                    type="button"
                    className="checkout-circle-btn pink"
                    onClick={() => promptDeleteOrder(order)}
                    title="Delete Order from Cart"
                  >
                    <i className="lni lni-minus" />
                  </button>

                  <button
                    type="button"
                    className="checkout-circle-btn cyan"
                    onClick={() => toggleExpandOrder(order.orderId)}
                    title={isExpanded ? 'Collapse Details' : 'Expand Details'}
                  >
                    <i className="lni lni-eye" />
                  </button>
                </div>
              </div>

              {/* Expanded Order Table Details */}
              {isExpanded && (
                <div className="checkout-order-expanded">
                  <table className="checkout-table">
                    <thead>
                      <tr className="checkout-table-header">
                        <th>ITEM DESCRIPTION</th>
                        <th className="text-right">UNIT PRICE</th>
                        <th className="text-center">QUANTITY</th>
                        <th className="text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.dates && order.dates.length > 0 ? (
                        order.dates.map((dSection, dIdx) => (
                          <React.Fragment key={dIdx}>
                            <tr className="checkout-date-row">
                              <td colSpan={4}>{dSection.date}</td>
                            </tr>
                            {dSection.items.map((it, itIdx) => (
                              <tr className="checkout-item-row" key={itIdx}>
                                <td>
                                  <span className="checkout-item-name">{it.name}</span>
                                </td>
                                <td className="text-right">${it.unitPrice.toFixed(2)}</td>
                                <td className="text-center">{it.quantity}</td>
                                <td className="text-right">${it.total.toFixed(2)}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      ) : (
                        <tr className="checkout-item-row">
                          <td colSpan={4} style={{ textAlign: 'center', color: '#94A3B8', padding: '16px' }}>
                            Standard School Lunch Meal Plan Included
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Subtotal & Breakdown Lines */}
                  <div className="checkout-order-summary-footer">
                    <div className="checkout-sub-row">
                      <span>Order Amount</span>
                      <span>${order.orderAmount.toFixed(2)}</span>
                    </div>
                    <div className="checkout-sub-row">
                      <span>Sales Tax</span>
                      <span>${order.salesTax.toFixed(2)}</span>
                    </div>
                    {order.schoolFees > 0 && (
                      <div className="checkout-sub-row">
                        <span>School Fees</span>
                        <span>${order.schoolFees.toFixed(2)}</span>
                      </div>
                    )}
                    {order.lateFees > 0 && (
                      <div className="checkout-sub-row">
                        <span>Late Fees</span>
                        <span>${order.lateFees.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="checkout-sub-row grand-total">
                      <span>Grand Total</span>
                      <span>${order.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Right Column: Payment & Transaction Details Card ── */}
      <div className="checkout-payment-card">
        {/* Teal Header Banner */}
        <div className="checkout-payment-header">
          PAYMENT
        </div>

        <div className="checkout-payment-body">
          {/* Section 1: Choose a Payment Method */}
          <div className="checkout-section-title">
            <i className="lni lni-credit-cards" />
            <span>Choose a Payment Method</span>
          </div>

          <div className="checkout-payment-methods-grid">
            {/* Column 1 */}
            <div>
              {col1Methods.map((method, idx) => (
                <label className="checkout-radio-option" key={idx} style={{ marginBottom: 10 }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={selectedMethodIdx === idx}
                    onChange={() => setSelectedMethodIdx(idx)}
                  />
                  <span>{method}</span>
                </label>
              ))}
            </div>

            {/* Column 2 */}
            <div>
              {col2Methods.map((method, idx) => {
                const actualIdx = idx + 5;
                return (
                  <label className="checkout-radio-option" key={actualIdx} style={{ marginBottom: 10 }}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={selectedMethodIdx === actualIdx}
                      onChange={() => setSelectedMethodIdx(actualIdx)}
                    />
                    <span>{method}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 2: Transaction Details */}
          <div className="checkout-section-title">
            <i className="lni lni-receipt" />
            <span>Transaction Details</span>
          </div>

          <div className="checkout-transaction-table">
            <div className="checkout-transaction-row plain">
              <span>Due Amount</span>
              <span>${dueAmount.toFixed(2)}</span>
            </div>

            <div className="checkout-transaction-row shaded">
              <span>Sales Tax</span>
              <span>${salesTax.toFixed(2)}</span>
            </div>

            {schoolFees > 0 && (
              <div className="checkout-transaction-row plain">
                <span>School Fees</span>
                <span>${schoolFees.toFixed(2)}</span>
              </div>
            )}

            <div className="checkout-transaction-row plain">
              <span>Avl. Credits</span>
              <span>${avlCredits.toFixed(2)}</span>
            </div>

            {appliedCredits > 0 && (
              <div className="checkout-transaction-row shaded">
                <span>Credits Applied</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>-${appliedCredits.toFixed(2)}</span>
              </div>
            )}

            <div className="checkout-transaction-row plain">
              <span>Total</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>

            <div className="checkout-transaction-row shaded">
              <span>Convenience: +</span>
              <span>${convenienceFee.toFixed(2)}</span>
            </div>

            <div className="checkout-transaction-row amount-to-pay">
              <span>Amount to Pay</span>
              <span className="pay-val">${amountToPay.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Button: PROCEED */}
          <div className="checkout-proceed-btn-wrapper">
            <button
              type="button"
              className="btn-checkout-proceed"
              onClick={handleProceed}
              disabled={paying}
            >
              {paying ? 'PROCESSING...' : 'PROCEED'}
            </button>
          </div>

          {/* Bottom Footnote Notice */}
          <p className="checkout-convenience-note">
            *NOTE: If you are paying more than one order, convenience fees if applicable, will be allocated across all orders being paid. This may cause a very minor variance in the actual charge.
          </p>
        </div>
      </div>

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
                {[25, 50, 100].map(v => (
                  <button
                    key={v}
                    type="button"
                    className="btn-cancel"
                    style={{ fontSize: 12, padding: '4px 12px' }}
                    onClick={() => setTopupAmount(v.toFixed(2))}
                  >
                    +${v}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
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
                  {topupLoading ? 'Adding...' : 'Add Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Success Receipt Modal ── */}
      {showSuccess && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 460, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#DEF7EC', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32 }}>
              ✓
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 8 }}>
              Payment Successful!
            </h2>
            <p style={{ color: '#636363', fontSize: 14, marginBottom: 20 }}>
              Your order has been paid and confirmed.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="btn-cancel"
                onClick={() => navigate('/myorders')}
              >
                View My Orders
              </button>
              <button
                className="btn-primary"
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Delete Confirmation Modal ── */}
      {deleteModal.isOpen && deleteModal.order && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteModal({ isOpen: false, order: null })}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                <i className="lni lni-trash-can" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1E293B' }}>
                  Remove Order #{deleteModal.order.orderId}?
                </h3>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  Student: {deleteModal.order.childName}
                </span>
              </div>
            </div>

            <p style={{ color: '#64748B', fontSize: 13.5, lineHeight: 1.5, margin: '14px 0 20px' }}>
              Are you sure you want to remove this meal order of <strong>${deleteModal.order.grandTotal.toFixed(2)}</strong> from your checkout cart?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn-cancel"
                disabled={deleting}
                onClick={() => setDeleteModal({ isOpen: false, order: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={deleting}
                onClick={handleConfirmDelete}
                style={{ background: '#E54A4A', borderColor: '#E54A4A', color: '#fff' }}
              >
                {deleting ? 'Removing...' : 'Remove Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
