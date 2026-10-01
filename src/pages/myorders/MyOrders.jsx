import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getOrdersApi, cancelOrderApi } from '../../services/api';
import { ShimmerTable } from '../../components/Shimmer';


const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [orderIdFilter, setOrderIdFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [menuFilter, setMenuFilter] = useState('');
  const [campusFilter, setCampusFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await getOrdersApi();
      if (response && response.status === 'success' && Array.isArray(response.data)) {
        const mapped = response.data.map((o, idx) => ({
          rawId: o.id || o.orderId,
          id: o.orderId ? `#${o.orderId}` : `#${o.id || idx + 1}`,
          student: o.student || o.studentName || '--',
          menu: o.menu || o.menuName || '--',
          orderOn: o.orderOn || o.createdDate || '--',
          amount: parseFloat(o.amount || o.totalAmount) || 0,
          creditUsed: parseFloat(o.creditUsed) || 0,
          cancellations: parseFloat(o.cancellations) || 0,
          amountPaid: parseFloat(o.amountPaidDue || o.amountPaid || o.amount) || 0,
          status: (o.status || 'PAID').toUpperCase(),
          canCancel: o.canCancel || false,
          canPay: o.canPay || false
        }));
        setOrders(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancel = async (rawId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      const res = await cancelOrderApi(rawId);
      if (res && res.status === 'success') {
        toast.success('Order cancelled successfully');
        fetchOrders();
      } else {
        toast.error(res?.message || 'Failed to cancel order');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error cancelling order');
    }
  };

  const statusBadge = (status) => {
    switch (status) {
      case 'PAID': return <span className="badge-paid">PAID</span>;
      case 'UNPAID': return <span className="badge-unpaid">UNPAID</span>;
      case 'CANCELLED': return <span className="badge-cancelled">CANCELLED</span>;
      case 'DELETED': return <span className="badge-deleted">DELETED</span>;
      default: return <span>{status}</span>;
    }
  };

  const filtered = orders.filter(o =>
    String(o.id || '').toLowerCase().includes(orderIdFilter.toLowerCase()) &&
    String(o.student || '').toLowerCase().includes(studentFilter.toLowerCase()) &&
    String(o.menu || '').toLowerCase().includes(menuFilter.toLowerCase()) &&
    (statusFilter === 'All Statuses' || o.status === statusFilter)
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          <i className="lni lni-box-cart" style={{ fontSize: 22 }} />
          My Orders
        </h1>
        <p className="page-subtitle">Review, pay, or modify your children's orders.</p>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input placeholder="Order ID" value={orderIdFilter} onChange={e => { setOrderIdFilter(e.target.value); setPage(1); }} />
        <input placeholder="Student" value={studentFilter} onChange={e => { setStudentFilter(e.target.value); setPage(1); }} />
        <input placeholder="Menu" value={menuFilter} onChange={e => { setMenuFilter(e.target.value); setPage(1); }} />
        <input placeholder="Campus" value={campusFilter} onChange={e => { setCampusFilter(e.target.value); setPage(1); }} />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option>All Statuses</option>
          <option>PAID</option>
          <option>UNPAID</option>
          <option>CANCELLED</option>
          <option>DELETED</option>
        </select>
      </div>

      {/* Table */}
      <div className="hl-table-wrap">
        {/* Pagination header */}
        <div className="pagination-row" style={{ borderTop: 'none', borderBottom: '1px solid #E5E7EB' }}>
          <span className="count-text">Showing {filtered.length} orders</span>
          <div className="per-page">
            <span>Items per page: {PER_PAGE}</span>
            <div className="pages">
              <button onClick={() => setPage(p => Math.max(1, p - 1))}>{'<'}</button>
              {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map(p => (
                <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}>{'>'}</button>
            </div>
          </div>
        </div>

        <table className="hl-table">
          <thead>
            <tr>
              <th>ORDER ID</th>
              <th>STUDENT</th>
              <th>MENU</th>
              <th>ORDER ON</th>
              <th>AMOUNT</th>
              <th>CREDIT USED</th>
              <th>CANCELLATIONS</th>
              <th>AMOUNT PAID/DUE</th>
              <th>STATUS</th>
              <th style={{ textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Shimmer rows while fetching
              <tr>
                <td colSpan={10} style={{ padding: 0, border: 'none' }}>
                  <ShimmerTable rows={6} cols={10} />
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                  No order records found.
                </td>
              </tr>
            ) : (
              paginated.map(o => (
                <tr key={o.id}>
                  <td><span className="link-id">{o.id}</span></td>
                  <td>{o.student}</td>
                  <td>{o.menu}</td>
                  <td>{o.orderOn}</td>
                  <td>${o.amount.toFixed(2)}</td>
                  <td>${o.creditUsed.toFixed(2)}</td>
                  <td>${o.cancellations.toFixed(2)}</td>
                  <td><strong>${o.amountPaid.toFixed(2)}</strong></td>
                  <td>{statusBadge(o.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {o.canCancel && (
                        <button
                          onClick={() => handleCancel(o.rawId)}
                          style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#EF4444', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default MyOrders;
