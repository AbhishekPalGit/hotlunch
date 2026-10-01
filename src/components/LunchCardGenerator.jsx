import React, { useState } from 'react';

const LunchCardGenerator = ({ students }) => {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedMenu, setSelectedMenu] = useState('August 2026');
  const [intervalType, setIntervalType] = useState('Weekly');
  const [fromDate, setFromDate] = useState('2026-08-12');
  const [toDate, setToDate] = useState('2026-08-16');
  const [twoColumns, setTwoColumns] = useState(false);
  const [cardsGenerated, setCardsGenerated] = useState(false);

  // Mock Lunch Cards Data
  const mockCards = [
    { dayCode: 'MON 08-12-26', studentId: 'VMW175', name: 'Jane Doe', grade: '6', classroom: '1', item: '1x Double Cheese Burger - Large', orderId: '#4063556' },
    { dayCode: 'TUE 08-13-26', studentId: 'VMW175', name: 'Jane Doe', grade: '6', classroom: '1', item: '1x Strawberry Juice - Regular', orderId: '#4063557' },
    { dayCode: 'WED 08-14-26', studentId: 'VMW175', name: 'Jane Doe', grade: '6', classroom: '1', item: '1x Chicken Caesar Salad - Regular', orderId: '#4063558' }
  ];

  const handleGenerate = (e) => {
    e.preventDefault();
    setCardsGenerated(true);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Lunch Card</h2>
        <p className="text-muted">Generate and print ticket cards for student school lunches.</p>
      </div>

      <div style={styles.layout}>
        {/* Left Form: Selectors */}
        <div style={styles.formCol} className="card">
          <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Report Options</h3>
          
          <form onSubmit={handleGenerate} style={styles.form}>
            <div className="form-group">
              <label className="form-label">Student</label>
              <select 
                className="form-control"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                required
              >
                <option value="">Select Student...</option>
                {students.map(s => (
                  <option key={s.id} value={s.name}>{s.name} ({s.studentId})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Menu</label>
              <select 
                className="form-control"
                value={selectedMenu}
                onChange={(e) => setSelectedMenu(e.target.value)}
              >
                <option>August 2026</option>
                <option>September 2026</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Interval Type</label>
              <select 
                className="form-control"
                value={intervalType}
                onChange={(e) => setIntervalType(e.target.value)}
              >
                <option>Weekly</option>
                <option>Monthly</option>
                <option>Custom</option>
              </select>
            </div>

            <div style={styles.dateRow}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">From</label>
                <input 
                  type="date" 
                  className="form-control"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">To</label>
                <input 
                  type="date" 
                  className="form-control"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>

            <div style={styles.checkboxGroup}>
              <input 
                type="checkbox" 
                id="twoCols" 
                checked={twoColumns}
                onChange={(e) => setTwoColumns(e.target.checked)}
              />
              <label htmlFor="twoCols" style={styles.checkboxLabel}>Print two columns of cards</label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              GENERATE REPORT
            </button>
          </form>
        </div>

        {/* Right Preview Card Area */}
        <div style={styles.previewCol}>
          {cardsGenerated ? (
            <div style={styles.previewContainer}>
              <div style={styles.previewHeader}>
                <h3 style={{ fontSize: '15px' }}>Print Preview</h3>
                <div style={styles.printActions}>
                  <button style={{...styles.actionCircle, color: '#56ADE8'}} onClick={() => window.print()} title="Print Cards">
                    <i className="lni lni-printer"></i>
                  </button>
                  <button style={{...styles.actionCircle, color: '#E29578'}} onClick={() => alert('Download PDF')} title="Save as PDF">
                    <i className="lni lni-file-download"></i>
                  </button>
                </div>
              </div>

              {/* Cards Grid */}
              <div style={{
                ...styles.cardsGrid,
                gridTemplateColumns: twoColumns ? '1fr 1fr' : '1fr'
              }}>
                {mockCards.map((card, idx) => (
                  <div key={idx} style={styles.ticketCard}>
                    {/* Top Ticket Header */}
                    <div style={styles.ticketHeader}>
                      <span style={styles.ticketId}>{card.studentId}</span>
                      <span style={styles.ticketDay}>{card.dayCode}</span>
                    </div>
                    {/* Ticket Body */}
                    <div style={styles.ticketBody}>
                      <div style={styles.studentName}>{card.name}</div>
                      <div style={styles.ticketMeta}>
                        <div><strong>Month:</strong> {selectedMenu}</div>
                        <div><strong>School:</strong> Valleyview Middle New</div>
                        <div><strong>Class:</strong> {card.grade} {card.classroom}</div>
                        <div><strong>Order ID:</strong> {card.orderId}</div>
                      </div>
                      
                      <div style={styles.ticketDivider}></div>
                      
                      <div style={styles.ticketItem}>
                        <i className="lni lni-restaurant" style={styles.utensils}></i>
                        <span>{card.item}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={styles.placeholderCard} className="card">
              <i className="lni lni-credit-cards" style={styles.placeholderIcon}></i>
              <h3>Preview Area</h3>
              <p className="text-muted" style={{ textAlign: 'center', maxWidth: '300px' }}>
                Fill options on the left and click Generate Report to render print-ready lunch vouchers.
              </p>
            </div>
          )}
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
  header: {
    marginBottom: '8px'
  },
  layout: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  formCol: {
    flex: 1,
    minWidth: '280px',
    backgroundColor: '#ffffff'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  dateRow: {
    display: 'flex',
    gap: '12px'
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '8px 0'
  },
  checkboxLabel: {
    fontSize: '13px',
    color: 'var(--text-gray)',
    cursor: 'pointer'
  },
  previewCol: {
    flex: 2,
    minWidth: '350px'
  },
  placeholderCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '350px',
    backgroundColor: '#ffffff',
    border: '2px dashed var(--border)'
  },
  placeholderIcon: {
    fontSize: '48px',
    color: 'var(--primary-light)',
    marginBottom: '16px'
  },
  previewContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: '12px 20px',
    borderRadius: '8px',
    border: '1px solid var(--border)'
  },
  printActions: {
    display: 'flex',
    gap: '8px'
  },
  actionCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '1px solid var(--border)',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  cardsGrid: {
    display: 'grid',
    gap: '16px'
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    border: '2px solid var(--primary-light)',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
  },
  ticketHeader: {
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary)',
    padding: '8px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: '700',
    fontSize: '13px'
  },
  ticketBody: {
    padding: '16px'
  },
  studentName: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--primary)',
    marginBottom: '8px'
  },
  ticketMeta: {
    fontSize: '11px',
    color: 'var(--text-gray)',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px'
  },
  ticketDivider: {
    height: '1px',
    borderBottom: '2px dashed var(--border)',
    margin: '12px 0'
  },
  ticketItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: '600',
    color: 'var(--primary)',
    fontSize: '13px'
  },
  utensils: {
    fontSize: '16px',
    color: 'var(--accent)'
  }
};

export default LunchCardGenerator;
