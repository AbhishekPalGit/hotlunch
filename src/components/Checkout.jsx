import React, { useState } from 'react';

const Checkout = ({ cartItems, cartTotal, availableFunds, setActiveTab, clearCart, setAmountOwed, setAvailableFunds }) => {
  const [expandedOrder, setExpandedOrder] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('credit');
  
  const subtotal = cartTotal;
  const tax = subtotal * 0.1;
  const schoolFees = 2.50;
  const grandTotal = subtotal + tax + schoolFees;

  const handlePaymentSubmit = () => {
    if (paymentMethod === 'credit' && availableFunds < grandTotal) {
      alert('Insufficient available credit. Please add funds first.');
      return;
    }

    if (paymentMethod === 'credit') {
      setAvailableFunds(prev => prev - grandTotal);
    }
    
    // Clear owed amount and cart
    setAmountOwed(0);
    clearCart();
    alert('Payment successful! Your order has been placed.');
    setActiveTab('orders');
  };

  return (
    <div style={styles.container}>
      {/* Back button */}
      <button style={styles.backBtn} onClick={() => setActiveTab('cart')}>
        <i className="lni lni-arrow-left"></i> Back to Shopping Cart
      </button>

      <div style={styles.header}>
        <h2>Checkout</h2>
        <p className="text-muted">Review and choose payment method for your school lunch order.</p>
      </div>

      <div style={styles.splitLayout}>
        {/* Left Side: Order items list */}
        <div style={styles.leftCol}>
          <div style={styles.accordionCard} className="card">
            {/* Accordion Header */}
            <div 
              style={styles.accordionHeader} 
              onClick={() => setExpandedOrder(!expandedOrder)}
            >
              <div style={styles.accordionTitle}>
                <i className={`lni ${expandedOrder ? 'lni-chevron-down' : 'lni-chevron-right'}`} style={{ color: 'var(--primary)' }}></i>
                <span>ORDER #{Math.floor(1000000 + Math.random() * 9000000)}</span>
              </div>
              <div style={styles.accordionMeta}>
                <span>12 Aug, 2026</span>
                <span style={styles.metaDot}>•</span>
                <span>{cartItems[0]?.studentName || 'Students'}</span>
                <span style={styles.metaDot}>•</span>
                <span style={{ fontWeight: '600', color: 'var(--primary)' }}>${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Accordion Content */}
            {expandedOrder && (
              <div style={styles.accordionContent}>
                <table className="custom-table" style={{ border: 'none' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <th>ITEM DESCRIPTION</th>
                      <th>UNIT PRICE</th>
                      <th>QTY</th>
                      <th style={{ textAlign: 'right' }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ fontWeight: '500' }}>{item.itemName}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>For {item.studentName} - {item.day}</div>
                        </td>
                        <td>${item.price.toFixed(2)}</td>
                        <td>{item.quantity}</td>
                        <td style={{ textAlign: 'right', fontWeight: '500' }}>${(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Subtotals nested */}
                <div style={styles.nestedBreakdown}>
                  <div style={styles.breakdownRow}>
                    <span className="text-muted">Order Amount:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div style={styles.breakdownRow}>
                    <span className="text-muted">Sales Tax (10%):</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div style={styles.breakdownRow}>
                    <span className="text-muted">School Fees:</span>
                    <span>${schoolFees.toFixed(2)}</span>
                  </div>
                  <div style={styles.breakdownRow}>
                    <span className="text-muted">Late Fees:</span>
                    <span>$0.00</span>
                  </div>
                  <div style={styles.divider}></div>
                  <div style={styles.nestedTotalRow}>
                    <span>Grand Total:</span>
                    <span style={{ color: 'var(--primary)', fontWeight: '700' }}>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Payment card */}
        <div style={styles.rightCol}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={styles.paymentBanner}>
              <h3>PAYMENT</h3>
            </div>
            
            <div style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '14px', color: 'var(--text-gray)' }}>
                Choose a Payment Method
              </h4>
              
              {/* Radio Credit Selector */}
              <div style={styles.paymentOption}>
                <input 
                  type="radio" 
                  id="payCredit" 
                  name="payMethod" 
                  checked={paymentMethod === 'credit'}
                  onChange={() => setPaymentMethod('credit')}
                />
                <label htmlFor="payCredit" style={styles.radioLabel}>
                  <div>
                    <div style={{ fontWeight: '600' }}>Use Available Credit</div>
                    <div className="text-muted" style={{ fontSize: '12px' }}>
                      Current balance: <strong style={{ color: 'var(--success)' }}>${availableFunds.toFixed(2)}</strong>
                    </div>
                  </div>
                </label>
              </div>

              <div style={styles.paymentOption}>
                <input 
                  type="radio" 
                  id="payCard" 
                  name="payMethod"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                />
                <label htmlFor="payCard" style={styles.radioLabel}>
                  <div>
                    <div style={{ fontWeight: '600' }}>Credit / Debit Card</div>
                    <div className="text-muted" style={{ fontSize: '12px' }}>Pay securely with Visa, Mastercard, or AMEX</div>
                  </div>
                </label>
              </div>

              {/* Transaction details block */}
              <div style={styles.transactionBlock}>
                <h4 style={{ fontSize: '12px', color: 'var(--text-gray)', marginBottom: '10px' }}>TRANSACTION DETAILS</h4>
                <div style={styles.transRow}>
                  <span>Due Amount:</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
                <div style={styles.transRow}>
                  <span>Avl. Credits:</span>
                  <span>-${availableFunds >= grandTotal ? grandTotal.toFixed(2) : availableFunds.toFixed(2)}</span>
                </div>
                <div style={styles.divider}></div>
                <div style={{...styles.transRow, fontWeight: '600'}}>
                  <span>Amount to Pay:</span>
                  <span>${availableFunds >= grandTotal ? '0.00' : (grandTotal - availableFunds).toFixed(2)}</span>
                </div>
              </div>

              <button 
                className="btn btn-primary" 
                style={styles.proceedBtn}
                onClick={handlePaymentSubmit}
              >
                PROCEED
              </button>

              <p style={styles.disclosure}>
                * Payments made via Credit Card may incur a 2.5% convenience fee. Using available school lunch credits is free of transaction fees.
              </p>
            </div>
          </div>
        </div>
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
    marginBottom: '8px',
    fontSize: '14px'
  },
  header: {
    marginBottom: '8px'
  },
  splitLayout: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  leftCol: {
    flex: 1.5,
    minWidth: '350px'
  },
  rightCol: {
    flex: 1,
    minWidth: '300px'
  },
  accordionCard: {
    padding: '0',
    overflow: 'hidden'
  },
  accordionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#f8fafc',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border)',
    flexWrap: 'wrap',
    gap: '10px'
  },
  accordionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: '600',
    fontSize: '15px'
  },
  accordionMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text-gray)'
  },
  metaDot: {
    color: '#cbd5e1'
  },
  accordionContent: {
    padding: '16px'
  },
  nestedBreakdown: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    width: '100%',
    maxWidth: '320px',
    marginLeft: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  breakdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px'
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--border)',
    margin: '8px 0'
  },
  nestedTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: '600',
    fontSize: '14px'
  },
  paymentBanner: {
    backgroundColor: 'var(--primary)',
    padding: '16px 24px',
    color: '#ffffff'
  },
  paymentOption: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    marginBottom: '12px',
    cursor: 'pointer',
    backgroundColor: '#f8fafc'
  },
  radioLabel: {
    cursor: 'pointer',
    flex: 1,
    fontSize: '14px'
  },
  transactionBlock: {
    marginTop: '24px',
    padding: '16px',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-main)'
  },
  transRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    marginBottom: '6px'
  },
  proceedBtn: {
    width: '100%',
    padding: '12px',
    marginTop: '20px'
  },
  disclosure: {
    fontSize: '10px',
    color: 'var(--text-gray)',
    marginTop: '12px',
    lineHeight: '1.4',
    textAlign: 'center'
  }
};

export default Checkout;
