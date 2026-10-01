import React, { useState } from 'react';

const CreditHistory = () => {
  const [searchOrderID, setSearchOrderID] = useState('');
  const [searchType, setSearchType] = useState('');

  // Mock Credit History Data (Screenshot 7)
  const creditData = [
    { id: '1', amount: 100.00, type: 'Credit', student: 'Jane Doe', dateTime: 'Aug 11, 2026 8:45 PM', balance: 0.00, notes: 'Funds added via Credit Card', status: 'FAILURE' },
    { id: '2', amount: 45.00, type: 'Credit', student: 'Jane Doe', dateTime: 'Aug 11, 2026 8:45 PM', balance: 0.00, notes: 'Promotional credit adjustments', status: 'FAILURE' },
    { id: '3', amount: 130.00, type: 'Debit', student: 'John Doe', dateTime: 'Aug 11, 2026 8:45 PM', balance: 0.00, notes: 'Weekly order checkout debit', status: 'PENDING' },
    { id: '4', amount: 300.00, type: 'Credit', student: 'Jane Doe', dateTime: 'Aug 11, 2026 8:45 PM', balance: 0.00, notes: 'Funds added via bank check #401', status: 'SUCCESS' },
    { id: '5', amount: 80.50, type: 'Debit', student: 'John Doe', dateTime: 'Aug 11, 2026 8:45 PM', balance: 0.00, notes: 'Lunch menu adjustments debit', status: '' },
    { id: '6', amount: 78.00, type: 'Debit', student: 'Jane Doe', dateTime: 'Aug 11, 2026 8:45 PM', balance: 0.00, notes: 'Order checkout debit', status: '' }
  ];

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'SUCCESS': return 'badge-success';
      case 'FAILURE': return 'badge-danger';
      case 'PENDING': return 'badge-pending';
      default: return 'badge-info';
    }
  };

  const filteredData = creditData.filter(item => {
    return (
      item.id.toLowerCase().includes(searchOrderID.toLowerCase()) &&
      item.type.toLowerCase().includes(searchType.toLowerCase())
    );
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Credit History</h2>
        <p className="text-muted">View all fund deposits, order debits, and balance adjustments.</p>
      </div>

      {/* Filters Card */}
      <div style={styles.filtersRow} className="card">
        <div style={styles.filterField}>
          <input 
            type="text" 
            placeholder="Order ID" 
            style={styles.filterInput}
            value={searchOrderID}
            onChange={(e) => setSearchOrderID(e.target.value)}
          />
        </div>
        <div style={styles.filterField}>
          <select 
            className="form-control"
            style={{ padding: '4px', border: 'none', background: 'transparent', width: '100%', fontSize: '13px' }}
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="Credit">Credit (Deposit)</option>
            <option value="Debit">Debit (Spent)</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="table-container">
        <div style={styles.tableHeaderRow}>
          <span style={{ fontWeight: '500' }}>Showing {filteredData.length} records</span>
          {/* Pagination */}
          <div style={styles.pagination}>
            <span className="text-muted" style={{ marginRight: '10px' }}>Items per page: 10</span>
            <button style={styles.pageNumBtn} disabled>&lt;</button>
            <button style={{...styles.pageNumBtn, ...styles.pageNumActive}}>1</button>
            <button style={styles.pageNumBtn}>&gt;</button>
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>ORDER ID</th>
              <th>AMOUNT</th>
              <th>TYPE</th>
              <th>STUDENT</th>
              <th>DATE & TIME</th>
              <th>BALANCE</th>
              <th>NOTES</th>
              <th style={{ textAlign: 'right' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: '600', color: 'var(--primary)' }}>#{item.id}</td>
                <td style={{ 
                  fontWeight: '600',
                  color: item.type === 'Credit' ? 'var(--success)' : 'var(--error)'
                }}>
                  {item.type === 'Credit' ? '+' : '-'}${item.amount.toFixed(2)}
                </td>
                <td>
                  <span className={`badge ${item.type === 'Credit' ? 'badge-success' : 'badge-info'}`}>
                    {item.type}
                  </span>
                </td>
                <td style={{ fontWeight: '500' }}>{item.student}</td>
                <td>{item.dateTime}</td>
                <td>${item.balance.toFixed(2)}</td>
                <td style={{ fontSize: '12px', color: 'var(--text-gray)' }}>{item.notes}</td>
                <td style={{ textAlign: 'right' }}>
                  {item.status ? (
                    <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                      {item.status}
                    </span>
                  ) : (
                    <span className="text-muted">--</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  header: {
    marginBottom: '8px'
  },
  filtersRow: {
    display: 'flex',
    padding: '14px 20px',
    gap: '16px',
    maxWidth: '500px'
  },
  filterField: {
    flex: 1,
    minWidth: '120px',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '6px 12px',
    backgroundColor: '#f8fafc'
  },
  filterInput: {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: '13px',
    width: '100%',
    fontFamily: "'Poppins', sans-serif"
  },
  tableHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    backgroundColor: '#ffffff'
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px'
  },
  pageNumBtn: {
    border: '1px solid var(--border)',
    backgroundColor: '#ffffff',
    color: 'var(--text-dark)',
    padding: '4px 10px',
    cursor: 'pointer',
    borderRadius: '4px',
    marginLeft: '4px'
  },
  pageNumActive: {
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    borderColor: 'var(--primary)'
  }
};

export default CreditHistory;
