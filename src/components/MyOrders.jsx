import React, { useState } from 'react';

const MyOrders = ({ activeTab, setActiveTab }) => {
  const [viewState, setViewState] = useState('list'); // 'list' or 'invoice'
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Search inputs
  const [searchID, setSearchID] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  const [searchMenu, setSearchMenu] = useState('');
  const [searchCampus, setSearchCampus] = useState('');
  const [searchStatus, setSearchStatus] = useState('');

  // Mock Orders Data (Screenshot 8)
  const [orders, setOrders] = useState([
    { id: '4066751', studentName: 'Jane Doe', menuName: 'August 2023', campus: 'Valleyview Middle New', orderedOn: 'Aug 11, 23 8:45 PM', amount: 35.00, creditUsed: 0.00, cancellations: 0.00, paidDue: 35.00, status: 'PAID', grade: '6', classroom: '1' },
    { id: '4067283', studentName: 'John Doe', menuName: 'August 2023', campus: 'Valleyview Middle New', orderedOn: 'Aug 11, 23 8:45 PM', amount: 49.00, creditUsed: 0.00, cancellations: 0.00, paidDue: 49.00, status: 'UNPAID', grade: '1', classroom: '6' },
    { id: '4067284', studentName: 'Jane Doe', menuName: 'August 2023', campus: 'Valleyview Middle New', orderedOn: 'Aug 11, 23 8:45 PM', amount: 50.00, creditUsed: 0.00, cancellations: 0.00, paidDue: 50.00, status: 'PAID', grade: '6', classroom: '1' },
    { id: '4067285', studentName: 'Jane Doe', menuName: 'August 2023', campus: 'Valleyview Middle New', orderedOn: 'Aug 11, 23 8:45 PM', amount: 60.00, creditUsed: 0.00, cancellations: 15.00, paidDue: 45.00, status: 'UNPAID', grade: '6', classroom: '1' },
    { id: '4067286', studentName: 'Jane Doe', menuName: 'August 2023', campus: 'Valleyview Middle New', orderedOn: 'Aug 11, 23 8:45 PM', amount: 60.00, creditUsed: 0.00, cancellations: 0.00, paidDue: 0.00, status: 'CANCELLED', grade: '6', classroom: '1' },
    { id: '4067287', studentName: 'Jane Doe', menuName: 'August 2023', campus: 'Valleyview Middle New', orderedOn: 'Aug 11, 23 8:45 PM', amount: 50.00, creditUsed: 0.00, cancellations: 0.00, paidDue: 0.00, status: 'DELETED', grade: '6', classroom: '1' }
  ]);

  const handleOpenInvoice = (order) => {
    setSelectedOrder(order);
    setViewState('invoice');
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PAID': return 'badge-success';
      case 'UNPAID': return 'badge-danger';
      case 'CANCELLED': return 'badge-pending';
      case 'DELETED': return 'badge-danger';
      default: return '';
    }
  };

  const filteredOrders = orders.filter(order => {
    return (
      order.id.toLowerCase().includes(searchID.toLowerCase()) &&
      order.studentName.toLowerCase().includes(searchStudent.toLowerCase()) &&
      order.menuName.toLowerCase().includes(searchMenu.toLowerCase()) &&
      order.campus.toLowerCase().includes(searchCampus.toLowerCase()) &&
      order.status.toLowerCase().includes(searchStatus.toLowerCase())
    );
  });

  return (
    <div style={styles.container}>
      {viewState === 'list' ? (
        /* ================= ORDERS LIST VIEW (Screenshot 8) ================= */
        <div>
          <div style={styles.header}>
            <h2>
              <i className="lni lni-postcard" style={{ marginRight: '10px', color: 'var(--primary)' }}></i>
              My Orders
            </h2>
            <p className="text-muted">Review, pay, or modify your children's orders.</p>
          </div>

          {/* Search Filters Row */}
          <div style={styles.filtersRow} className="card">
            <div style={styles.filterField}>
              <input 
                type="text" 
                placeholder="Order ID" 
                style={styles.filterInput}
                value={searchID}
                onChange={(e) => setSearchID(e.target.value)}
              />
            </div>
            <div style={styles.filterField}>
              <input 
                type="text" 
                placeholder="Student" 
                style={styles.filterInput}
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
              />
            </div>
            <div style={styles.filterField}>
              <input 
                type="text" 
                placeholder="Menu" 
                style={styles.filterInput}
                value={searchMenu}
                onChange={(e) => setSearchMenu(e.target.value)}
              />
            </div>
            <div style={styles.filterField}>
              <input 
                type="text" 
                placeholder="Campus" 
                style={styles.filterInput}
                value={searchCampus}
                onChange={(e) => setSearchCampus(e.target.value)}
              />
            </div>
            <div style={styles.filterField}>
              <select 
                className="form-control"
                style={{ padding: '4px', border: 'none', background: 'transparent', width: '100%', fontSize: '13px' }}
                value={searchStatus}
                onChange={(e) => setSearchStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="PAID">PAID</option>
                <option value="UNPAID">UNPAID</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="DELETED">DELETED</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="table-container">
            <div style={styles.tableHeaderRow}>
              <span style={{ fontWeight: '500' }}>Showing {filteredOrders.length} orders</span>
              {/* Pagination indicators */}
              <div style={styles.pagination}>
                <span className="text-muted" style={{ marginRight: '10px' }}>Items per page: 10</span>
                <button style={styles.pageNumBtn} disabled>&lt;</button>
                <button style={{...styles.pageNumBtn, ...styles.pageNumActive}}>1</button>
                <button style={styles.pageNumBtn}>2</button>
                <button style={styles.pageNumBtn}>&gt;</button>
              </div>
            </div>

            <table className="custom-table">
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
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: '600', color: 'var(--primary)' }}>#{order.id}</td>
                    <td style={{ fontWeight: '500' }}>{order.studentName}</td>
                    <td>{order.menuName}</td>
                    <td>{order.orderedOn}</td>
                    <td>${order.amount.toFixed(2)}</td>
                    <td>${order.creditUsed.toFixed(2)}</td>
                    <td>${order.cancellations.toFixed(2)}</td>
                    <td style={{ fontWeight: '600' }}>${order.paidDue.toFixed(2)}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 8px', borderRadius: '4px' }}
                        onClick={() => handleOpenInvoice(order)}
                      >
                        <i className="lni lni-eye" style={{ fontSize: '13px' }}></i> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= ORDER DETAILS / INVOICE VIEW (Screenshot 9) ================= */
        <div>
          {/* Breadcrumb Navigation */}
          <button style={styles.backBtn} onClick={() => setViewState('list')}>
            <i className="lni lni-arrow-left"></i> Back to My Orders
          </button>

          {/* Invoice Card Panel */}
          <div className="card" style={styles.invoiceCard}>
            <div style={styles.invoiceHeader}>
              <div>
                <h2 style={{ color: '#E54A4B', fontSize: '24px' }}>
                  Order #{selectedOrder.id} INVOICE
                </h2>
                <span className={`badge ${getStatusBadgeClass(selectedOrder.status)}`} style={{ marginTop: '8px' }}>
                  {selectedOrder.status}
                </span>
              </div>
              <div style={styles.invoiceActions}>
                <button style={styles.circleBtn} onClick={() => window.print()} title="Print Order">
                  <i className="lni lni-printer"></i>
                </button>
                <button style={styles.circleBtn} onClick={() => alert('Download PDF')} title="Download PDF">
                  <i className="lni lni-file-download"></i>
                </button>
              </div>
            </div>

            <div style={styles.invoiceMeta}>
              <div style={styles.metaCol}>
                <h4 style={styles.metaHeader}>Billed To:</h4>
                <div style={styles.metaVal}>Test Parent Account</div>
                <div className="text-muted">testparentaccount2023@gmail.com</div>
              </div>

              <div style={styles.metaCol}>
                <h4 style={styles.metaHeader}>From School:</h4>
                <div style={styles.metaVal}>{selectedOrder.campus}</div>
                <div className="text-muted">donotreply@hotlunch.com</div>
              </div>
            </div>

            {/* Grid Information Fields */}
            <div style={styles.infoGrid}>
              <div style={styles.infoBlock}>
                <div style={styles.infoLabel}>STUDENT</div>
                <div style={styles.infoVal}>{selectedOrder.studentName}</div>
              </div>
              <div style={styles.infoBlock}>
                <div style={styles.infoLabel}>GRADE</div>
                <div style={styles.infoVal}>{selectedOrder.grade}</div>
              </div>
              <div style={styles.infoBlock}>
                <div style={styles.infoLabel}>CLASSROOM</div>
                <div style={styles.infoVal}>{selectedOrder.classroom}</div>
              </div>
              <div style={styles.infoBlock}>
                <div style={styles.infoLabel}>ORDER CREATED BY</div>
                <div style={styles.infoVal}>Test Parent Account</div>
              </div>
              <div style={styles.infoBlock}>
                <div style={styles.infoLabel}>MENU</div>
                <div style={styles.infoVal}>{selectedOrder.menuName}</div>
              </div>
              <div style={styles.infoBlock}>
                <div style={styles.infoLabel}>ORDER DATE</div>
                <div style={styles.infoVal}>28 Aug, 2023</div>
              </div>
              <div style={styles.infoBlock}>
                <div style={styles.infoLabel}>ORDER TOTAL</div>
                <div style={{...styles.infoVal, color: 'var(--primary)', fontWeight: '700'}}>${selectedOrder.amount.toFixed(2)}</div>
              </div>
            </div>

            {/* Daily items list tables */}
            <div style={styles.itemsBlock}>
              <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Order Details</h3>
              <table className="custom-table" style={{ border: '1px solid var(--border)', borderRadius: '6px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th>ITEM DESCRIPTION</th>
                    <th>UNIT PRICE</th>
                    <th>QUANTITY</th>
                    <th style={{ textAlign: 'right' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Monday Group */}
                  <tr style={styles.dayGroupRow}>
                    <td colSpan="4" style={styles.dayGroupLabel}>Monday, 28 Aug, 2023</td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '24px' }}>
                      <span style={{ fontWeight: '500' }}>STRAWBERRY JUICE - REGULAR</span>
                    </td>
                    <td>$3.25</td>
                    <td>1</td>
                    <td style={{ textAlign: 'right' }}>$3.25</td>
                  </tr>
                  {/* Tuesday Group */}
                  <tr style={styles.dayGroupRow}>
                    <td colSpan="4" style={styles.dayGroupLabel}>Tuesday, 29 Aug, 2023</td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '24px' }}>
                      <span style={{ fontWeight: '500' }}>BAKED POTATO WITH VEGGIES (GLUTEN FREE) - REGULAR</span>
                    </td>
                    <td>$8.50</td>
                    <td>1</td>
                    <td style={{ textAlign: 'right' }}>$8.50</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Breakdown Summaries & Actions */}
            <div style={styles.invoiceFooter}>
              {/* Cost breakdown */}
              <div style={styles.breakdownContainer}>
                <div style={styles.breakdownRow}>
                  <span className="text-muted">Order Amount:</span>
                  <span style={styles.breakdownVal}>${(selectedOrder.amount - 2.50).toFixed(2)}</span>
                </div>
                <div style={styles.breakdownRow}>
                  <span className="text-muted">Sales Tax:</span>
                  <span style={styles.breakdownVal}>$0.50</span>
                </div>
                <div style={styles.breakdownRow}>
                  <span className="text-muted">School Fees:</span>
                  <span style={styles.breakdownVal}>$2.00</span>
                </div>
                <div style={styles.breakdownRow}>
                  <span className="text-muted">Late Fees:</span>
                  <span style={styles.breakdownVal}>$0.00</span>
                </div>
                <div style={styles.divider}></div>
                <div style={styles.grandTotalRow}>
                  <span style={{ fontWeight: '600' }}>Grand Total:</span>
                  <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '18px' }}>
                    ${selectedOrder.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom buttons panel */}
            <div style={styles.invoiceActionsRow}>
              <button 
                className="btn btn-outline-danger" 
                onClick={() => {
                  alert('Order cancellation processed.');
                  setViewState('list');
                }}
              >
                CANCEL ORDER
              </button>
              <button 
                className="btn btn-outline" 
                onClick={() => {
                  alert('Redirecting to weekly menu to modify...');
                  setActiveTab('home');
                }}
              >
                MODIFY ORDER
              </button>
              {selectedOrder.status !== 'PAID' && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    alert('Redirecting to checkout payment portal...');
                    setActiveTab('cart');
                  }}
                >
                  PAY NOW
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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
    flexWrap: 'wrap'
  },
  filterField: {
    flex: 1,
    minWidth: '130px',
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
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--primary)',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0',
    marginBottom: '16px',
    fontSize: '14px'
  },
  invoiceCard: {
    backgroundColor: '#ffffff',
    padding: '30px',
    border: '1px solid var(--border)',
    borderRadius: '12px'
  },
  invoiceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '20px',
    marginBottom: '20px'
  },
  invoiceActions: {
    display: 'flex',
    gap: '10px'
  },
  circleBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '1px solid var(--border)',
    backgroundColor: '#ffffff',
    color: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s'
  },
  invoiceMeta: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
    marginBottom: '24px'
  },
  metaHeader: {
    fontSize: '13px',
    color: 'var(--text-gray)',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: '6px'
  },
  metaVal: {
    fontWeight: '600',
    fontSize: '15px'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '16px',
    backgroundColor: '#f8fafc',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    marginBottom: '24px'
  },
  infoLabel: {
    fontSize: '10px',
    color: 'var(--text-gray)',
    fontWeight: '700',
    marginBottom: '4px'
  },
  infoVal: {
    fontSize: '13px',
    fontWeight: '600'
  },
  itemsBlock: {
    marginBottom: '30px'
  },
  dayGroupRow: {
    backgroundColor: '#f1f5f9'
  },
  dayGroupLabel: {
    fontWeight: '600',
    color: 'var(--primary)',
    padding: '8px 16px',
    fontSize: '13px'
  },
  invoiceFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '30px'
  },
  breakdownContainer: {
    width: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  breakdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px'
  },
  breakdownVal: {
    fontWeight: '500'
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--border)',
    margin: '8px 0'
  },
  grandTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  invoiceActionsRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    borderTop: '1px solid var(--border)',
    paddingTop: '20px'
  }
};

export default MyOrders;
