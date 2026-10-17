import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiTrash2,
  FiEdit2,
  FiCreditCard,
  FiFileText,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiX
} from 'react-icons/fi';
import {
  getCartApi,
  deleteCartItemApi,
  calculateTotalApi,
  getChildrenApi
} from '../../services/api';
import { ShimmerCartTable } from '../../components/Shimmer';
import './ShoppingCart.css';

const ShoppingCart = ({
  cartItems = [],
  amountOwed = 0,
  removeFromCart,
  clearCart,
  refreshCart
}) => {
  const navigate = useNavigate();

  const [childrenList, setChildrenList] = useState([]);
  const [cartOrders, setCartOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  // Filter States
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  const [searchMenu, setSearchMenu] = useState('');

  // Selection States
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  // Pagination States
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal States
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    mode: 'single', // 'single' | 'selected' | 'all'
    targetOrder: null
  });
  const [detailsModal, setDetailsModal] = useState({
    isOpen: false,
    order: null
  });

  // Load children for name lookup
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
    const found = (childrenList || []).find(
      c => c && String(c.id) === String(childId)
    );
    if (found) {
      return (
        found.fullName ||
        `${found.firstName || ''} ${found.lastName || ''}`.trim() ||
        found.name ||
        'Student'
      );
    }
    if (fallbackName && !String(fallbackName).startsWith('Child #')) {
      return fallbackName;
    }
    return fallbackName || 'Student';
  };

  // Format date helper: "Oct 17, 26 9:15 AM"
  const formatCreatedDate = (dateVal) => {
    try {
      const d = dateVal ? new Date(dateVal) : new Date();
      if (isNaN(d.getTime())) return String(dateVal || '');
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const day = d.getDate();
      const year = String(d.getFullYear()).slice(-2);
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
    } catch (e) {
      return '';
    }
  };

  // Fetch cart orders from API
  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await getCartApi();
      if (res && res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
        const mappedOrders = res.data.map((group, idx) => {
          const rawOrderId = group.orderId || group.id;
          const orderId = rawOrderId || (idx + 1);
          const childName = resolveChildName(
            group.childId || group.typeId,
            group.childName || group.studentName || group.student || group.name
          );
          const menuName = group.menuName || group.menuTitle || 'Lunch Menu';
          const campusName = group.campusName || (group.campusFee !== undefined ? parseFloat(group.campusFee).toFixed(2) : '-');

          // Calculate sum directly from line items and addons if available
          const itemsList = group.items || [];
          const calculatedItemsTotal = Array.isArray(itemsList) && itemsList.length > 0
            ? itemsList.reduce((sum, it) => {
                const p = parseFloat(it.price || 0);
                const q = parseInt(it.quantity, 10) || 1;
                const addSum = Array.isArray(it.addons)
                  ? it.addons.reduce((aSum, a) => aSum + (parseFloat(a.price || 0) * (parseInt(a.quantity, 10) || 1)), 0)
                  : 0;
                return sum + (p * q) + addSum;
              }, 0)
            : 0;

          const amount = parseFloat(group.amount || group.totalAmount || calculatedItemsTotal || 0);
          const createdDate = group.createdDate || group.createdAt || new Date().toISOString();

          return {
            orderId,
            childId: group.childId || group.typeId,
            childName,
            menuName,
            campusName,
            amount,
            createdDate,
            formattedCreatedOn: formatCreatedDate(createdDate),
            items: itemsList,
            dates: group.dates || []
          };
        });

        setCartOrders(mappedOrders);
        await handleCalcTotal(mappedOrders.map(o => o.orderId));
        return;
      }

      // Fallback: If backend cart data is empty, check locally passed cartItems
      if (cartItems && cartItems.length > 0) {
        const orderMap = {};
        cartItems.forEach((item, idx) => {
          const oId = item.orderId || item.id || (idx + 1);
          if (!orderMap[oId]) {
            const cName = resolveChildName(
              item.childId || item.typeId || item.studentId,
              item.studentName || item.student || item.childName
            );
            orderMap[oId] = {
              orderId: oId,
              childId: item.childId || item.typeId,
              childName: cName,
              menuName: item.menuName || item.menu || 'Lunch Menu',
              campusName: item.campusName || '-',
              amount: 0,
              createdDate: item.createdDate || item.date || new Date().toISOString(),
              formattedCreatedOn: formatCreatedDate(item.createdDate || item.date || new Date()),
              items: [],
              dates: []
            };
          }
          const itemPrice = parseFloat(item.price || 0);
          const itemQty = parseInt(item.quantity, 10) || 1;
          orderMap[oId].amount += itemPrice * itemQty;
          orderMap[oId].items.push(item);
        });

        const fallbackList = Object.values(orderMap);
        setCartOrders(fallbackList);
        await handleCalcTotal(fallbackList.map(o => o.orderId));
      } else {
        setCartOrders([]);
        setSummary(null);
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
      // Fallback to local cartItems on error
      if (cartItems && cartItems.length > 0) {
        const fallbackList = cartItems.map((item, idx) => ({
          orderId: item.orderId || item.id || (idx + 1),
          childId: item.childId || item.typeId,
          childName: item.studentName || item.student || 'Student',
          menuName: item.menuName || 'Lunch Menu',
          campusName: item.campusName || '-',
          amount: parseFloat(item.price || 0) * (parseInt(item.quantity, 10) || 1),
          createdDate: item.date || new Date().toISOString(),
          formattedCreatedOn: formatCreatedDate(item.date || new Date()),
          items: [item],
          dates: []
        }));
        setCartOrders(fallbackList);
      } else {
        setCartOrders([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCalcTotal = async (orderIds) => {
    try {
      const uniqueIds = [...new Set(orderIds)].filter(id => typeof id === 'number' || (typeof id === 'string' && !id.startsWith('local_')));
      if (uniqueIds.length === 0) return;
      const res = await calculateTotalApi({ orderIds: uniqueIds, useCredits: true });
      if (res && res.status === 'success') {
        setSummary(res);
      }
    } catch (e) {
      // ignore silently, fallback to sum
    }
  };

  useEffect(() => {
    fetchCart();
  }, [cartItems]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return cartOrders.filter(order => {
      const matchOrderId = !searchOrderId || String(order.orderId).toLowerCase().includes(searchOrderId.toLowerCase().trim());
      const matchStudent = !searchStudent || String(order.childName).toLowerCase().includes(searchStudent.toLowerCase().trim());
      const matchMenu = !searchMenu || String(order.menuName).toLowerCase().includes(searchMenu.toLowerCase().trim());
      return matchOrderId && matchStudent && matchMenu;
    });
  }, [cartOrders, searchOrderId, searchStudent, searchMenu]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Adjust currentPage if out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Checkbox Selection
  const allVisibleSelected =
    paginatedOrders.length > 0 &&
    paginatedOrders.every(order => selectedOrderIds.includes(order.orderId));

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(paginatedOrders.map(o => o.orderId));
      setSelectedOrderIds(prev => prev.filter(id => !visibleIds.has(id)));
    } else {
      const visibleIds = paginatedOrders.map(o => o.orderId);
      setSelectedOrderIds(prev => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const handleToggleSelectOrder = (orderId) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  // Top Action: Delete button click
  const handleTopDeleteClick = () => {
    if (selectedOrderIds.length > 0) {
      setDeleteModal({
        isOpen: true,
        mode: 'selected',
        targetOrder: null
      });
    } else {
      setDeleteModal({
        isOpen: true,
        mode: 'all',
        targetOrder: null
      });
    }
  };

  // Row Action: Single Delete click
  const confirmDeleteOrder = (order) => {
    setDeleteModal({
      isOpen: true,
      mode: 'single',
      targetOrder: order
    });
  };

  // Execute Deletion
  const executeDelete = async () => {
    const { mode, targetOrder } = deleteModal;
    setDeleteModal({ isOpen: false, mode: 'single', targetOrder: null });

    try {
      if (mode === 'all') {
        await deleteCartItemApi('all');
        if (clearCart) clearCart();
        setSelectedOrderIds([]);
        setCartOrders([]);
        setSummary(null);
        toast.success('Shopping cart cleared!');
      } else if (mode === 'selected') {
        const idsToDelete = selectedOrderIds.join(',');
        await deleteCartItemApi(idsToDelete);
        setSelectedOrderIds([]);
        toast.success(`Removed ${selectedOrderIds.length} orders from cart`);
      } else if (mode === 'single' && targetOrder) {
        const orderIdToDelete = targetOrder.orderId;
        await deleteCartItemApi(orderIdToDelete);
        setSelectedOrderIds(prev => prev.filter(id => id !== orderIdToDelete));
        toast.success(`Removed order #${orderIdToDelete} from cart`);
      }

      if (refreshCart) refreshCart();
      await fetchCart();
    } catch (err) {
      console.error('Delete cart error:', err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.detail?.message ||
        'Could not remove order from cart';
      toast.error(errMsg);
      if (refreshCart) refreshCart();
      await fetchCart();
    }
  };

  // Row Action: Proceed to checkout for single order
  const handleProceedToCheckout = (specificOrderIds = null) => {
    if (cartOrders.length === 0) {
      toast.warn('Your cart is empty. Please select lunch meals first.');
      return;
    }
    const orderIdsToPay = specificOrderIds && specificOrderIds.length > 0
      ? specificOrderIds
      : (selectedOrderIds.length > 0 ? selectedOrderIds : cartOrders.map(o => o.orderId));

    navigate('/checkout', { state: { orderIds: orderIdsToPay } });
  };

  // Row Action: Edit Order
  const handleEditOrder = (order) => {
    navigate('/dashboard');
  };

  // Row Action: View Details
  const handleViewDetails = (order) => {
    setDetailsModal({
      isOpen: true,
      order
    });
  };

  // Amount Owed Calculation
  const totalCartSum = cartOrders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
  const displayAmountOwed =
    summary?.amountToPay !== undefined
      ? parseFloat(summary.amountToPay)
      : (amountOwed > 0 ? parseFloat(amountOwed) : totalCartSum);

  // Pagination page numbers generator: e.g. 1 2 3 ... 10
  const paginationPages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, '...', totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage, '...', totalPages];
  }, [totalPages, currentPage]);

  return (
    <div className="cart-page-wrap">
      {/* ── Top Header Row ── */}
      <div className="cart-header-row">
        <div className="cart-header-left">
          <h1 className="cart-main-title">Shopping Cart</h1>
          <div className="cart-header-actions">
            <button
              className="cart-header-btn teal"
              title="Proceed to Checkout"
              onClick={() => handleProceedToCheckout()}
            >
              <FiCreditCard />
            </button>
            <button
              className="cart-header-btn peach-red"
              title={selectedOrderIds.length > 0 ? `Delete ${selectedOrderIds.length} Selected Orders` : 'Clear Cart'}
              onClick={handleTopDeleteClick}
            >
              <FiTrash2 />
            </button>
          </div>
        </div>

      </div>

      {/* ── Main Content Card ── */}
      <div className="cart-content-card">
        {/* Toolbar: Search Inputs & Pagination */}
        <div className="cart-toolbar-row">
          <div className="cart-toolbar-filters">
            <span className="cart-search-icon">
              <FiSearch />
            </span>
            <input
              type="text"
              className="cart-filter-field input-order-id"
              placeholder="Order ID"
              value={searchOrderId}
              onChange={e => { setSearchOrderId(e.target.value); setCurrentPage(1); }}
            />
            <input
              type="text"
              className="cart-filter-field input-student"
              placeholder="Student"
              value={searchStudent}
              onChange={e => { setSearchStudent(e.target.value); setCurrentPage(1); }}
            />
            <input
              type="text"
              className="cart-filter-field input-menu"
              placeholder="Menu"
              value={searchMenu}
              onChange={e => { setSearchMenu(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="cart-toolbar-pagination">
            <div className="cart-pagesize-wrapper">
              <select
                className="cart-pagesize-select"
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <FiChevronDown className="cart-pagesize-chevron" />
            </div>

            <div className="cart-pagination-bar">
              <button
                className="cart-pagi-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                title="Previous Page"
              >
                <FiChevronLeft />
              </button>

              {paginationPages.map((pg, idx) =>
                pg === '...' ? (
                  <span key={`dots_${idx}`} className="cart-pagi-dots">…</span>
                ) : (
                  <button
                    key={pg}
                    className={`cart-pagi-btn ${currentPage === pg ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pg)}
                  >
                    {pg}
                  </button>
                )
              )}

              <button
                className="cart-pagi-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                title="Next Page"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <ShimmerCartTable rows={6} />
        ) : paginatedOrders.length === 0 ? (
          <div className="cart-empty-container">
            <i className="lni lni-cart cart-empty-icon" />
            <p className="cart-empty-text">
              {cartOrders.length === 0
                ? 'Your shopping cart is empty.'
                : 'No orders match your filter criteria.'}
            </p>
            {cartOrders.length === 0 ? (
              <button
                className="cart-browse-btn"
                onClick={() => navigate('/dashboard')}
              >
                Browse Menus
              </button>
            ) : (
              <button
                className="cart-browse-btn"
                onClick={() => {
                  setSearchOrderId('');
                  setSearchStudent('');
                  setSearchMenu('');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="cart-table-container">
            <table className="cart-data-table">
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className="cart-custom-checkbox"
                      checked={allVisibleSelected}
                      onChange={handleToggleSelectAll}
                      title="Select All Visible"
                    />
                  </th>
                  <th>ORDER ID</th>
                  <th>STUDENT</th>
                  <th>MENU</th>
                  <th>CAMPUS</th>
                  <th>AMOUNT</th>
                  <th>CREATED ON</th>
                  <th style={{ width: 150 }}></th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map(order => {
                  const isChecked = selectedOrderIds.includes(order.orderId);
                  return (
                    <tr
                      key={order.orderId}
                      className={isChecked ? 'selected-row' : ''}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className="cart-custom-checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOrder(order.orderId)}
                        />
                      </td>
                      <td className="td-order-id">{order.orderId}</td>
                      <td className="td-student">{order.childName}</td>
                      <td className="td-menu">{order.menuName}</td>
                      <td className="td-campus">{order.campusName}</td>
                      <td className="td-amount">
                        ${order.amount.toFixed(2)}
                      </td>
                      <td className="td-created">
                        {order.formattedCreatedOn}
                      </td>
                      <td>
                        <div className="td-actions-cell">
                          <button
                            className="cart-action-btn teal"
                            title="Proceed to Checkout"
                            onClick={() => handleProceedToCheckout([order.orderId])}
                          >
                            <FiCreditCard />
                          </button>
                          <button
                            className="cart-action-btn light-blue"
                            title="Edit Order"
                            onClick={() => handleEditOrder(order)}
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            className="cart-action-btn peach"
                            title="Order Details"
                            onClick={() => handleViewDetails(order)}
                          >
                            <FiFileText />
                          </button>
                          <button
                            className="cart-action-btn light-red"
                            title="Delete Order"
                            onClick={() => confirmDeleteOrder(order)}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {deleteModal.isOpen && (
        <div
          className="cart-modal-backdrop"
          onClick={() => setDeleteModal({ isOpen: false, mode: 'single', targetOrder: null })}
        >
          <div
            className="cart-modal-card"
            style={{ maxWidth: 460 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="cart-modal-header">
              <h3 className="cart-modal-title" style={{ color: '#E54A4A' }}>
                {deleteModal.mode === 'all'
                  ? 'Clear Cart?'
                  : deleteModal.mode === 'selected'
                  ? `Delete ${selectedOrderIds.length} Selected Orders?`
                  : `Delete Order #${deleteModal.targetOrder?.orderId}?`}
              </h3>
              <button
                className="cart-modal-close"
                onClick={() => setDeleteModal({ isOpen: false, mode: 'single', targetOrder: null })}
              >
                <FiX />
              </button>
            </div>
            <div className="cart-modal-body">
              <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.5 }}>
                {deleteModal.mode === 'all'
                  ? 'Are you sure you want to remove all pending orders from your shopping cart?'
                  : deleteModal.mode === 'selected'
                  ? `Are you sure you want to remove the ${selectedOrderIds.length} selected orders from your cart?`
                  : `Are you sure you want to remove order #${deleteModal.targetOrder?.orderId} for ${deleteModal.targetOrder?.childName} from your cart?`}
              </p>
            </div>
            <div className="cart-modal-footer">
              <button
                className="cart-modal-btn-cancel"
                onClick={() => setDeleteModal({ isOpen: false, mode: 'single', targetOrder: null })}
              >
                Cancel
              </button>
              <button
                className="cart-modal-btn-delete"
                onClick={executeDelete}
              >
                {deleteModal.mode === 'all' ? 'Yes, Clear All' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order Details Modal ── */}
      {detailsModal.isOpen && detailsModal.order && (
        <div
          className="cart-modal-backdrop"
          onClick={() => setDetailsModal({ isOpen: false, order: null })}
        >
          <div
            className="cart-modal-card"
            onClick={e => e.stopPropagation()}
          >
            <div className="cart-modal-header">
              <h3 className="cart-modal-title">
                Order #{detailsModal.order.orderId} - {detailsModal.order.childName}
              </h3>
              <button
                className="cart-modal-close"
                onClick={() => setDetailsModal({ isOpen: false, order: null })}
              >
                <FiX />
              </button>
            </div>
            <div className="cart-modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13, color: '#64748B' }}>
                <div><strong>Menu:</strong> {detailsModal.order.menuName}</div>
                <div><strong>Created:</strong> {detailsModal.order.formattedCreatedOn}</div>
              </div>

              {detailsModal.order.items && detailsModal.order.items.length > 0 ? (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#006D77' }}>
                      <tr>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Item</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Price</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailsModal.order.items.map((it, iIdx) => (
                        <tr key={it.id || iIdx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 600, color: '#334155' }}>
                              {it.name || it.itemName || 'Meal Dish'}
                            </div>
                            {it.orderDate && (
                              <div style={{ fontSize: 11, color: '#94A3B8' }}>{it.orderDate}</div>
                            )}
                            {it.addons && it.addons.length > 0 && (
                              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                                + {it.addons.map(a => a.name || a.title || a).join(', ')}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>
                            {it.quantity || 1}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>
                            ${parseFloat(it.price || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                            ${((parseFloat(it.price || 0)) * (it.quantity || 1)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                  No itemized breakdown available for this order.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, fontSize: 15, fontWeight: 700, color: '#006D77' }}>
                Total Order Amount: ${detailsModal.order.amount.toFixed(2)}
              </div>
            </div>
            <div className="cart-modal-footer">
              <button
                className="cart-modal-btn-cancel"
                onClick={() => setDetailsModal({ isOpen: false, order: null })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingCart;
