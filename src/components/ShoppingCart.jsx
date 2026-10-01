import React from 'react';

const ShoppingCart = ({ cartItems, removeFromCart, setActiveTab, cartTotal }) => {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>
          <i className="lni lni-cart-alt" style={{ marginRight: '10px', color: 'var(--primary)' }}></i>
          Shopping Cart
        </h2>
        <p className="text-muted">Review items in your cart before finalizing payment.</p>
      </div>

      <div style={styles.layout}>
        {/* Cart items list */}
        <div style={styles.listContainer}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>CAMPUS</th>
                  <th>ITEM DESCRIPTION</th>
                  <th>DAY / DATE</th>
                  <th>UNIT PRICE</th>
                  <th>QTY</th>
                  <th>TOTAL</th>
                  <th style={{ textAlign: 'right' }}>REMOVE</th>
                </tr>
              </thead>
              <tbody>
                {cartItems.length > 0 ? (
                  cartItems.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{item.studentName}</td>
                      <td>Valleyview Middle New</td>
                      <td>
                        <span style={{ fontWeight: '500' }}>{item.itemName}</span>
                      </td>
                      <td>
                        <span className="badge badge-info">{item.day}</span> <span className="text-muted">({item.date})</span>
                      </td>
                      <td>${item.price.toFixed(2)}</td>
                      <td style={{ fontWeight: '600' }}>{item.quantity}</td>
                      <td style={{ fontWeight: '600' }}>${(item.price * item.quantity).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          style={styles.deleteBtn}
                          onClick={() => removeFromCart(idx)}
                          title="Remove item"
                        >
                          <i className="lni lni-trash-can" style={{ color: 'var(--error)' }}></i>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-gray)' }}>
                      <i className="lni lni-cart-alt" style={{ fontSize: '32px', marginBottom: '10px', display: 'block', color: 'var(--primary-light)' }}></i>
                      Your shopping cart is currently empty. Go to the Home tab to place weekly lunch orders.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cart summary box */}
        {cartItems.length > 0 && (
          <div className="card" style={styles.summaryCard}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              Order Summary
            </h3>
            
            <div style={styles.summaryRow}>
              <span className="text-muted">Subtotal</span>
              <span style={styles.summaryVal}>${cartTotal.toFixed(2)}</span>
            </div>

            <div style={styles.summaryRow}>
              <span className="text-muted">Sales Tax (10%)</span>
              <span style={styles.summaryVal}>${(cartTotal * 0.1).toFixed(2)}</span>
            </div>

            <div style={styles.summaryRow}>
              <span className="text-muted">School Fees</span>
              <span style={styles.summaryVal}>$2.50</span>
            </div>

            <div style={styles.divider}></div>

            <div style={styles.totalRow}>
              <span>Grand Total</span>
              <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '20px' }}>
                ${(cartTotal + (cartTotal * 0.1) + 2.50).toFixed(2)}
              </span>
            </div>

            <button 
              className="btn btn-primary" 
              style={styles.checkoutBtn}
              onClick={() => setActiveTab('checkout')}
            >
              PROCEED TO CHECKOUT <i className="lni lni-arrow-right"></i>
            </button>
            <button 
              className="btn btn-outline" 
              style={{ width: '100%', marginTop: '10px' }}
              onClick={() => setActiveTab('home')}
            >
              CONTINUE ORDERING
            </button>
          </div>
        )}
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
  layout: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  listContainer: {
    flex: 2,
    minWidth: '350px'
  },
  deleteBtn: {
    border: 'none',
    backgroundColor: 'rgba(229, 74, 75, 0.1)',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  summaryCard: {
    flex: 1,
    minWidth: '280px',
    backgroundColor: '#ffffff',
    alignSelf: 'stretch'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    marginBottom: '12px'
  },
  summaryVal: {
    fontWeight: '500'
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--border)',
    margin: '16px 0'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: '600',
    fontSize: '16px',
    marginBottom: '20px'
  },
  checkoutBtn: {
    width: '100%',
    padding: '12px'
  }
};

export default ShoppingCart;
