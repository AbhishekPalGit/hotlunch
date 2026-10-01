import React, { useState, useEffect } from 'react';
import { getCreditHistoryApi } from '../../services/api';
import { ShimmerTable } from '../../components/Shimmer';


const CreditHistory = () => {
  const [records, setRecords] = useState([]);
  const [availableFunds, setAvailableFunds] = useState('0.00');
  const [loading, setLoading] = useState(true);

  const [orderIdFilter, setOrderIdFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await getCreditHistoryApi();
      if (response && response.status === 'success') {
        if (response.availableFunds !== undefined) {
          setAvailableFunds(response.availableFunds);
        }
        if (Array.isArray(response.data)) {
          const mapped = response.data.map((r, idx) => ({
            id: r.orderId ? `#${r.orderId}` : `#${r.id || idx + 1}`,
            amount: parseFloat(r.amt) || 0,
            displayAmount: r.displayAmount || `$${r.amt || '0.00'}`,
            type: (r.typeName || 'CREDIT').toUpperCase(),
            student: r.student || '--',
            date: r.date || r.createdDate || '--',
            balance: parseFloat(r.balance) || 0,
            notes: r.notes || r.note || '--',
            status: r.status || 'SUCCESS'
          }));
          setRecords(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to load credit history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const typeBadge = (type) => {
    if (type === 'CREDIT' || type.includes('CREDIT')) return <span className="badge-credit">CREDIT</span>;
    return <span className="badge-debit">DEBIT</span>;
  };

  const statusBadge = (status) => {
    switch (String(status).toUpperCase()) {
      case 'FAILURE': return <span className="badge-failure">FAILURE</span>;
      case 'PENDING': return <span className="badge-pending">PENDING</span>;
      case 'SUCCESS': return <span className="badge-success">SUCCESS</span>;
      default: return <span style={{ color: '#9CA3AF' }}>--</span>;
    }
  };

  const filtered = records.filter(r =>
    String(r.id || '').toLowerCase().includes(orderIdFilter.toLowerCase()) &&
    (typeFilter === 'All Types' || r.type === typeFilter)
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Credit History</h1>
          <p className="page-subtitle">View all fund deposits, order debits, and balance adjustments.</p>
        </div>
        <div style={{ background: '#FFFFFF', padding: '12px 20px', borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: 13, color: '#636363', marginRight: 8 }}>Wallet Balance:</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#006D77' }}>${parseFloat(availableFunds || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ maxWidth: 480 }}>
        <input
          placeholder="Order ID"
          value={orderIdFilter}
          onChange={e => { setOrderIdFilter(e.target.value); setPage(1); }}
        />
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
          <option>All Types</option>
          <option>CREDIT</option>
          <option>DEBIT</option>
        </select>
      </div>

      {/* Table */}
      <div className="hl-table-wrap">
        {/* Pagination header */}
        <div className="pagination-row" style={{ borderTop: 'none', borderBottom: '1px solid #E5E7EB' }}>
          <span className="count-text">Showing {filtered.length} records</span>
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
              <th>AMOUNT</th>
              <th>TYPE</th>
              <th>STUDENT</th>
              <th>DATE &amp; TIME</th>
              <th>BALANCE</th>
              <th>NOTES</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 0, border: 'none' }}>
                  <ShimmerTable rows={6} cols={8} />
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                  No transaction records found.
                </td>
              </tr>
            ) : (
              paginated.map(r => (
                <tr key={r.id}>
                  <td><span className="link-id">{r.id}</span></td>
                  <td>
                    <span style={{ fontWeight: 700, color: r.amount >= 0 ? '#22A06B' : '#E54A4A' }}>
                      {r.amount >= 0 ? '+' : ''}${Math.abs(r.amount).toFixed(2)}
                    </span>
                  </td>
                  <td>{typeBadge(r.type)}</td>
                  <td style={{ fontWeight: 500 }}>{r.student}</td>
                  <td style={{ color: '#636363' }}>{r.date}</td>
                  <td>${r.balance.toFixed(2)}</td>
                  <td style={{ color: '#636363', fontSize: 12.5 }}>{r.notes}</td>
                  <td>{statusBadge(r.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default CreditHistory;
