import React, { useState } from 'react';

const HomeDashboard = ({ students, setStudents, addToCart, activeTab, setActiveTab }) => {
  const [currentView, setCurrentView] = useState('students_list'); // 'students_list' or 'weekly_menu'
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Weekly Menu filters & state
  const [selectedCampus, setSelectedCampus] = useState('Valleyview Middle New');
  const [viewType, setViewType] = useState('Week'); // 'Week' or 'Month'
  const [copyFromStudent, setCopyFromStudent] = useState('');
  const [firstItemAllDays, setFirstItemAllDays] = useState(false);
  const [activeWeekStart, setActiveWeekStart] = useState(new Date("2026-08-12"));
  
  // Menu selection quantities state (student_id -> day -> item_name -> qty)
  const [menuQuantities, setMenuQuantities] = useState({});

  // Mock Menu Data for Monday - Friday
  const menuData = {
    Monday: [
      { id: 'm1', name: 'Double Cheese Burger', size: 'LARGE', price: 12.00, image: '🍔', isVegetarian: true, allergens: ['Dairy', 'Gluten'] },
      { id: 'm2', name: 'Baked Potato Soup', size: 'REGULAR', price: 8.50, image: '🥣', isVegan: true, allergens: [] }
    ],
    Tuesday: [
      { id: 't1', name: 'Honey Glazed Wings', size: 'LARGE', price: 15.00, image: '🍗', allergens: ['Soy', 'Gluten'], addonsCount: 3 },
      { id: 't2', name: 'Strawberry Juice', size: 'REGULAR', price: 3.25, image: '🍓', isVegan: true, allergens: [] }
    ],
    Wednesday: [
      { id: 'w1', name: 'Chicken Caesar Salad', size: 'REGULAR', price: 11.50, image: '🥗', allergens: ['Dairy', 'Fish', 'Gluten'] },
      { id: 'w2', name: 'Double Cheese Burger', size: 'LARGE', price: 12.00, image: '🍔', isVegetarian: true, allergens: ['Dairy', 'Gluten'] }
    ],
    Thursday: [
      { id: 'th1', name: 'Honey Glazed Wings', size: 'LARGE', price: 15.00, image: '🍗', allergens: ['Soy', 'Gluten'], addonsCount: 0 },
      { id: 'th2', name: 'Baked Potato Soup', size: 'REGULAR', price: 8.50, image: '🥣', isVegan: true, allergens: [] }
    ],
    Friday: [
      { id: 'f1', name: 'Pepperoni Pizza Slice', size: 'LARGE', price: 9.75, image: '🍕', allergens: ['Dairy', 'Gluten'] },
      { id: 'f2', name: 'Fruit Salad Medley', size: 'REGULAR', price: 6.00, image: '🍉', isVegan: true, isGlutenFree: true, allergens: [] }
    ]
  };

  const handleStudentSelectForOrder = (student) => {
    setSelectedStudent(student);
    setCurrentView('weekly_menu');
  };

  const updateQuantity = (day, item, change) => {
    const studentId = selectedStudent.id;
    const currentQty = (menuQuantities[studentId]?.[day]?.[item.name] || 0);
    const newQty = Math.max(0, currentQty + change);

    setMenuQuantities(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [day]: {
          ...(prev[studentId]?.[day] || {}),
          [item.name]: newQty
        }
      }
    }));
  };

  const handleFinishOrder = () => {
    // Collect all items > 0 for this student
    const studentId = selectedStudent.id;
    const studentSelections = menuQuantities[studentId] || {};
    let addedAny = false;

    Object.keys(studentSelections).forEach(day => {
      Object.keys(studentSelections[day]).forEach(itemName => {
        const qty = studentSelections[day][itemName];
        if (qty > 0) {
          // Find item price
          let itemDetails = null;
          Object.values(menuData).forEach(items => {
            const found = items.find(i => i.name === itemName);
            if (found) itemDetails = found;
          });

          if (itemDetails) {
            addToCart({
              studentName: selectedStudent.name,
              studentId: selectedStudent.studentId,
              itemName: itemDetails.name,
              price: itemDetails.price,
              quantity: qty,
              day,
              date: "12 Aug, 2026"
            });
            addedAny = true;
          }
        }
      });
    });

    if (addedAny) {
      alert(`Order summary added to cart for ${selectedStudent.name}! Redirecting to Shopping Cart.`);
      setActiveTab('cart');
    } else {
      alert("Please select at least one lunch item with a quantity greater than zero.");
    }
  };

  return (
    <div style={styles.container}>
      {currentView === 'students_list' ? (
        /* ================= STUDENTS VIEW (Screenshot 5) ================= */
        <div>
          <div style={styles.headerRow}>
            <h2>Manage & Place Orders</h2>
            <p className="text-muted">Select a student below to customize and order their weekly lunches.</p>
          </div>

          <div style={styles.studentsGrid}>
            {students.map((student, idx) => (
              <div key={student.id} style={styles.studentCard}>
                <div style={styles.cardHeader}>
                  <div style={{
                    ...styles.avatarCircle,
                    backgroundColor: idx % 2 === 0 ? '#006D77' : '#E29578'
                  }}>
                    {student.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div style={styles.actions}>
                    <button style={styles.iconBtn} onClick={() => alert(`Edit student ${student.name}`)} title="Edit">
                      <i className="lni lni-pencil" style={{ color: '#E29578' }}></i>
                    </button>
                    <button 
                      style={styles.iconBtn} 
                      onClick={() => setStudents(prev => prev.filter(s => s.id !== student.id))}
                      title="Delete"
                    >
                      <i className="lni lni-trash-can" style={{ color: '#E54A4B' }}></i>
                    </button>
                  </div>
                </div>

                <div style={styles.studentDetails}>
                  <h3 style={styles.studentName}>{student.name}</h3>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>School:</span>
                    <span style={styles.detailValue}>{student.campus}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Grade:</span>
                    <span style={styles.detailValue}>{student.grade}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Classroom:</span>
                    <span style={styles.detailValue}>{student.classroom}</span>
                  </div>
                  
                  <div style={styles.balanceDivider}></div>
                  
                  <div style={styles.balanceRow}>
                    <div>
                      <div style={styles.balLabel}>Balance Owed</div>
                      <div style={styles.balValueOwed}>${student.owed.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={styles.balLabel}>Credits</div>
                      <div style={styles.balValueCredit}>${student.balance.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                <button 
                  className="btn btn-primary" 
                  style={styles.orderBtn}
                  onClick={() => handleStudentSelectForOrder(student)}
                >
                  <i className="lni lni-add-cart"></i> Place Order
                </button>
              </div>
            ))}

            {/* Add Student Card Button */}
            <div 
              style={{...styles.studentCard, ...styles.addStudentCard}}
              onClick={() => setActiveTab('children')}
            >
              <i className="lni lni-circle-plus" style={styles.addIcon}></i>
              <span style={styles.addText}>Add New Child</span>
            </div>
          </div>

          <div style={styles.bottomBar}>
            <button 
              className="btn btn-primary" 
              style={{ padding: '12px 24px' }}
              onClick={() => setActiveTab('cart')}
            >
              PROCEED TO CHECKOUT <i className="lni lni-arrow-right"></i>
            </button>
          </div>
        </div>
      ) : (
        /* ================= WEEKLY MENU VIEW (Screenshot 2) ================= */
        <div>
          {/* Breadcrumb / Back Navigation */}
          <button style={styles.backBtn} onClick={() => setCurrentView('students_list')}>
            <i className="lni lni-arrow-left"></i> Back to Student List
          </button>

          <div style={styles.menuHeaderRow}>
            <div>
              <h2>Weekly Ordering Menu</h2>
              <p className="text-muted">Ordering for: <strong style={{ color: 'var(--primary)' }}>{selectedStudent?.name}</strong></p>
            </div>
            
            {/* Filter Bar */}
            <div style={styles.filterRow}>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Campus</label>
                <select 
                  className="form-control" 
                  value={selectedCampus} 
                  onChange={(e) => setSelectedCampus(e.target.value)}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  <option>Valleyview Middle New</option>
                  <option>Loyola Elementary</option>
                </select>
              </div>

              <div style={styles.toggleGroup}>
                <button 
                  style={{...styles.toggleBtn, ...(viewType === 'Week' ? styles.toggleBtnActive : {})}}
                  onClick={() => setViewType('Week')}
                >
                  Week
                </button>
                <button 
                  style={{...styles.toggleBtn, ...(viewType === 'Month' ? styles.toggleBtnActive : {})}}
                  onClick={() => setViewType('Month')}
                >
                  Month
                </button>
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Copy order from</label>
                <select 
                  className="form-control" 
                  value={copyFromStudent} 
                  onChange={(e) => setCopyFromStudent(e.target.value)}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  <option value="">Select student...</option>
                  {students.filter(s => s.id !== selectedStudent?.id).map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.checkboxGroup}>
                <input 
                  type="checkbox" 
                  id="firstItemAll" 
                  checked={firstItemAllDays}
                  onChange={(e) => setFirstItemAllDays(e.target.checked)}
                />
                <label htmlFor="firstItemAll" style={styles.checkboxLabel}>FIRST ITEM FOR ALL DAYS</label>
              </div>
            </div>
          </div>

          {/* Week Calendar Navigation */}
          <div style={styles.calendarNav}>
            <button style={styles.arrowBtn} onClick={() => alert('Previous week')}>
              <i className="lni lni-chevron-left"></i>
            </button>
            <span style={styles.weekDateRange}>12 Aug - 16 Aug, 2026</span>
            <button style={styles.arrowBtn} onClick={() => alert('Next week')}>
              <i className="lni lni-chevron-right"></i>
            </button>
          </div>

          {/* Daily Menu Columns Grid */}
          <div style={styles.menuGrid}>
            {Object.keys(menuData).map((day) => {
              const items = menuData[day];
              return (
                <div key={day} style={styles.menuColumn}>
                  <div style={styles.columnHeader}>
                    <div style={styles.columnDay}>{day}</div>
                    <div style={styles.columnDate}>
                      {day === 'Monday' ? '12 Aug' : day === 'Tuesday' ? '13 Aug' : day === 'Wednesday' ? '14 Aug' : day === 'Thursday' ? '15 Aug' : '16 Aug'}
                    </div>
                  </div>

                  <div style={styles.columnBody}>
                    {items.map((item, idx) => {
                      // Apply 'First item for all days' auto-quantity of 1 if checked and first index
                      const studentId = selectedStudent?.id;
                      const isAutoSelected = firstItemAllDays && idx === 0;
                      const currentQty = isAutoSelected ? 1 : (menuQuantities[studentId]?.[day]?.[item.name] || 0);

                      return (
                        <div key={item.id} style={styles.foodCard}>
                          <div style={styles.foodHeader}>
                            <span style={styles.foodEmoji}>{item.image}</span>
                            <span style={styles.sizeTag}>{item.size}</span>
                          </div>
                          
                          <h4 style={styles.foodName}>{item.name}</h4>
                          
                          {/* Allergen Icons */}
                          <div style={styles.allergensList}>
                            {item.isVegan && <span style={{...styles.dot, backgroundColor: '#28A745'}} title="Vegan"></span>}
                            {item.isVegetarian && <span style={{...styles.dot, backgroundColor: '#83C5BE'}} title="Vegetarian"></span>}
                            {item.isGlutenFree && <span style={{...styles.dot, backgroundColor: '#E29578'}} title="Gluten Free"></span>}
                            {item.allergens.length > 0 && <span style={{...styles.dot, backgroundColor: '#E54A4B'}} title={`Allergens: ${item.allergens.join(', ')}`}></span>}
                          </div>

                          {/* Addons Counter Indicator */}
                          {item.addonsCount !== undefined && (
                            <button style={styles.addonsBtn} onClick={() => alert('Manage Add-ons dialog')}>
                              {item.addonsCount} Addons <i className="lni lni-chevron-right" style={{ fontSize: '9px' }}></i>
                            </button>
                          )}

                          <div style={styles.foodFooter}>
                            <span style={styles.foodPrice}>${item.price.toFixed(2)}</span>
                            
                            {/* Quantity Selector */}
                            <div style={styles.qtyContainer}>
                              <button 
                                style={styles.qtyBtn} 
                                onClick={() => updateQuantity(day, item, -1)}
                                disabled={isAutoSelected}
                              >
                                -
                              </button>
                              <span style={styles.qtyVal}>{currentQty}</span>
                              <button 
                                style={styles.qtyBtn} 
                                onClick={() => updateQuantity(day, item, 1)}
                                disabled={isAutoSelected}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legends & Actions Bottom Footer */}
          <div style={styles.menuFooter}>
            <div style={styles.legendContainer}>
              <div style={styles.legendItem}>
                <span style={{...styles.dot, backgroundColor: '#28A745'}}></span>
                <span>Vegan</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{...styles.dot, backgroundColor: '#83C5BE'}}></span>
                <span>Vegetarian</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{...styles.dot, backgroundColor: '#E29578'}}></span>
                <span>Gluten Free</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{...styles.dot, backgroundColor: '#E54A4B'}}></span>
                <span>Allergens</span>
              </div>
              <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => alert('Add order notes')}>
                ADD NOTES
              </button>
            </div>

            <div style={styles.menuActionButtons}>
              <button className="btn btn-secondary" onClick={() => setCurrentView('students_list')}>
                CANCEL
              </button>
              <button className="btn btn-outline" onClick={() => alert('Switching to next child...')}>
                NEXT CHILD
              </button>
              <button className="btn btn-primary" onClick={handleFinishOrder}>
                FINISH ORDER
              </button>
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
  headerRow: {
    marginBottom: '8px'
  },
  studentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '20px'
  },
  studentCard: {
    backgroundColor: '#ffffff',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '300px'
  },
  addStudentCard: {
    border: '2px dashed var(--primary-light)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: 'rgba(0, 109, 119, 0.02)',
    transition: 'all 0.2s'
  },
  addIcon: {
    fontSize: '36px',
    color: 'var(--primary)',
    marginBottom: '10px'
  },
  addText: {
    fontWeight: '500',
    color: 'var(--primary)',
    fontSize: '15px'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  avatarCircle: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '16px'
  },
  actions: {
    display: 'flex',
    gap: '6px'
  },
  iconBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    fontSize: '16px'
  },
  studentDetails: {
    flex: 1,
    marginBottom: '20px'
  },
  studentName: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--primary)',
    marginBottom: '12px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    marginBottom: '6px'
  },
  detailLabel: {
    color: 'var(--text-gray)'
  },
  detailValue: {
    fontWeight: '500'
  },
  balanceDivider: {
    height: '1px',
    backgroundColor: 'var(--border)',
    margin: '14px 0'
  },
  balanceRow: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  balLabel: {
    fontSize: '10px',
    color: 'var(--text-gray)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  balValueOwed: {
    color: 'var(--error)',
    fontWeight: '600',
    fontSize: '16px'
  },
  balValueCredit: {
    color: 'var(--success)',
    fontWeight: '600',
    fontSize: '16px'
  },
  orderBtn: {
    width: '100%',
    padding: '10px',
    fontSize: '13px'
  },
  bottomBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    borderTop: '1px solid var(--border)',
    paddingTop: '20px'
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
  menuHeaderRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px'
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
    backgroundColor: '#ffffff',
    padding: '14px 20px',
    borderRadius: '8px',
    border: '1px solid var(--border)'
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-gray)'
  },
  toggleGroup: {
    display: 'flex',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    overflow: 'hidden'
  },
  toggleBtn: {
    backgroundColor: '#ffffff',
    border: 'none',
    padding: '6px 14px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  toggleBtnActive: {
    backgroundColor: 'var(--primary)',
    color: '#ffffff'
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  checkboxLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--primary)',
    cursor: 'pointer'
  },
  calendarNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    backgroundColor: '#ffffff',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    marginBottom: '20px'
  },
  arrowBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '16px',
    color: 'var(--primary)',
    cursor: 'pointer'
  },
  weekDateRange: {
    fontSize: '15px',
    fontWeight: '600'
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '16px',
    overflowX: 'auto',
    marginBottom: '24px'
  },
  menuColumn: {
    minWidth: '200px',
    backgroundColor: '#ffffff',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    overflow: 'hidden'
  },
  columnHeader: {
    backgroundColor: 'var(--bg-main)',
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
    textAlign: 'center'
  },
  columnDay: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--primary)'
  },
  columnDate: {
    fontSize: '11px',
    color: 'var(--text-gray)'
  },
  columnBody: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  foodCard: {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    position: 'relative'
  },
  foodHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  foodEmoji: {
    fontSize: '24px'
  },
  sizeTag: {
    fontSize: '9px',
    fontWeight: '700',
    backgroundColor: 'var(--accent-light)',
    color: 'var(--accent)',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  foodName: {
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '6px',
    height: '38px',
    overflow: 'hidden',
    lineHeight: '1.3'
  },
  allergensList: {
    display: 'flex',
    gap: '4px',
    marginBottom: '10px'
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block'
  },
  addonsBtn: {
    width: '100%',
    padding: '4px 8px',
    fontSize: '10px',
    borderRadius: '4px',
    border: '1px solid var(--border)',
    backgroundColor: '#ffffff',
    color: 'var(--primary)',
    cursor: 'pointer',
    marginBottom: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  foodFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  foodPrice: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--primary)'
  },
  qtyContainer: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    overflow: 'hidden',
    backgroundColor: '#ffffff'
  },
  qtyBtn: {
    border: 'none',
    backgroundColor: 'transparent',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  qtyVal: {
    fontSize: '12px',
    fontWeight: '600',
    width: '20px',
    textAlign: 'center'
  },
  menuFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: '16px 24px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    flexWrap: 'wrap',
    gap: '16px'
  },
  legendContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
    fontSize: '12px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--text-gray)'
  },
  menuActionButtons: {
    display: 'flex',
    gap: '12px'
  }
};

export default HomeDashboard;
