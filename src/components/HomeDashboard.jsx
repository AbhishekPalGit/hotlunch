import React, { useState, useEffect } from 'react';
import { createOrderApi, getMenusApi, getMenusForChildApi, getMenuDetailApi } from '../services/api';

const HomeDashboard = ({ students, setStudents, addToCart, activeTab, setActiveTab }) => {
  const [currentView, setCurrentView] = useState('students_list'); // 'students_list' or 'weekly_menu'
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Weekly Menu filters & state
  const [selectedCampus, setSelectedCampus] = useState('');
  const [viewType, setViewType] = useState('Week'); // 'Week' or 'Month'
  const [copyFromStudent, setCopyFromStudent] = useState('');
  const [firstItemAllDays, setFirstItemAllDays] = useState(false);
  const [activeWeekStart, setActiveWeekStart] = useState(new Date());
  const [loadingMenu, setLoadingMenu] = useState(false);

  // Menu selection quantities state (student_id -> day -> item_name -> qty)
  const [menuQuantities, setMenuQuantities] = useState({});

  // Dynamic Menu Data for Monday - Friday (loaded from API)
  const [menuData, setMenuData] = useState({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: []
  });

  // Fetch menus dynamically for selected student
  useEffect(() => {
    if (!selectedStudent) return;
    setLoadingMenu(true);

    const loadMenu = async () => {
      try {
        let menuList = [];
        if (selectedStudent.id) {
          const res = await getMenusForChildApi(selectedStudent.id);
          if (res && res.status === 'success' && res.data) {
            menuList = Array.isArray(res.data) ? res.data : (res.data.menus || []);
          }
        }
        if (menuList.length === 0) {
          const genRes = await getMenusApi();
          if (genRes && genRes.status === 'success' && genRes.data) {
            menuList = Array.isArray(genRes.data) ? genRes.data : (genRes.data.menus || []);
          }
        }

        if (menuList.length > 0) {
          const menuId = menuList[0].id;
          const detailRes = await getMenuDetailApi(menuId, selectedStudent.id);
          const rawDetail = detailRes?.data || detailRes;
          const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          const parsed = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] };

          let items = [];
          if (Array.isArray(rawDetail)) items = rawDetail;
          else if (rawDetail?.config && Array.isArray(rawDetail.config)) {
            rawDetail.config.forEach(b => {
              const bItems = Array.isArray(b.itemsArray) ? b.itemsArray : (b.items || []);
              items.push(...bItems);
            });
          } else if (rawDetail?.items) items = rawDetail.items;

          items.forEach((item, idx) => {
            let day = DAYS[idx % 5];
            if (item.day) {
              const matched = DAYS.find(d => d.toLowerCase() === String(item.day).toLowerCase());
              if (matched) day = matched;
            }
            parsed[day].push({
              id: item.id || idx + 1,
              name: item.name || item.title || item.itemName || 'Meal Option',
              size: item.size || 'REGULAR',
              price: parseFloat(item.price || item.amount || 0),
              image: item.image || item.photoUrl || '🍲',
              isVegetarian: !!(item.veg || item.isVegetarian),
              isVegan: !!(item.vegan || item.isVegan),
              isGlutenFree: !!(item.glutenFree || item.isGlutenFree),
              allergens: item.allergens || []
            });
          });

          setMenuData(parsed);
        } else {
          setMenuData({ Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] });
        }
      } catch (err) {
        console.log('Error loading dynamic menu in HomeDashboard:', err);
        setMenuData({ Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] });
      } finally {
        setLoadingMenu(false);
      }
    };

    loadMenu();
  }, [selectedStudent]);

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

  const handleFinishOrder = async () => {
    // Collect all items > 0 for this student
    const studentId = selectedStudent.id;
    const studentSelections = menuQuantities[studentId] || {};
    let addedAny = false;

    const config = { '101': {} };
    const dateStr = '2026-08-12';
    const dayItems = [];
    const itemsToSync = [];

    Object.keys(studentSelections).forEach(day => {
      Object.keys(studentSelections[day]).forEach(itemName => {
        const qty = studentSelections[day][itemName];
        if (qty > 0) {
          let itemDetails = null;
          Object.values(menuData).forEach(items => {
            const found = items.find(i => i.name === itemName);
            if (found) itemDetails = found;
          });

          if (itemDetails) {
            const numericId = parseInt(String(itemDetails.id || '55').replace(/\D/g, ''), 10) || 55;
            dayItems.push({
              id: numericId,
              quantity: qty,
              addon: []
            });

            itemsToSync.push({
              student: selectedStudent.name,
              studentName: selectedStudent.name,
              childName: selectedStudent.name,
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
      config['101'][dateStr] = dayItems;
      try {
        const res = await createOrderApi({
          typeId: parseInt(selectedStudent.id, 10) || 940,
          childId: parseInt(selectedStudent.id, 10) || 940,
          type: 5,
          menuId: 1,
          isDraft: 1,
          notes: '',
          config
        });
        if (res && (res.status === 'success' || res.orderId || res.succ_code)) {
          if (addToCart) {
            itemsToSync.forEach(it => addToCart(it));
          }
          alert(`Order summary added to cart for ${selectedStudent.name}! Redirecting to Shopping Cart.`);
          setActiveTab('cart');
        } else {
          alert(res?.message || 'Failed to add order to cart.');
        }
      } catch (err) {
        console.error('Order API error in HomeDashboard:', err);
        const errMsg = err.response?.data?.message
          || err.response?.data?.detail?.message
          || (Array.isArray(err.response?.data?.detail) ? err.response?.data?.detail.map(d => d.msg).join(', ') : null)
          || err.message
          || 'Failed to add order to cart.';
        alert(errMsg);
      }
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
              style={{ ...styles.studentCard, ...styles.addStudentCard }}
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
                  style={{ ...styles.toggleBtn, ...(viewType === 'Week' ? styles.toggleBtnActive : {}) }}
                  onClick={() => setViewType('Week')}
                >
                  Week
                </button>
                <button
                  style={{ ...styles.toggleBtn, ...(viewType === 'Month' ? styles.toggleBtnActive : {}) }}
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
          {(() => {
            const d = new Date(activeWeekStart || new Date());
            const dow = d.getDay();
            const diff = d.getDate() - dow + (dow === 0 ? -6 : 1);
            const monday = new Date(d.setDate(diff));
            const friday = new Date(monday);
            friday.setDate(monday.getDate() + 4);
            const rangeStr = `${monday.getDate()} ${monday.toLocaleDateString('en-US', { month: 'short' })} - ${friday.getDate()} ${friday.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;

            return (
              <div style={styles.calendarNav}>
                <button
                  style={styles.arrowBtn}
                  onClick={() => {
                    const prev = new Date(monday);
                    prev.setDate(prev.getDate() - 7);
                    setActiveWeekStart(prev);
                  }}
                >
                  <i className="lni lni-chevron-left"></i>
                </button>
                <span style={styles.weekDateRange}>{rangeStr}</span>
                <button
                  style={styles.arrowBtn}
                  onClick={() => {
                    const next = new Date(monday);
                    next.setDate(next.getDate() + 7);
                    setActiveWeekStart(next);
                  }}
                >
                  <i className="lni lni-chevron-right"></i>
                </button>
              </div>
            );
          })()}

          {/* Daily Menu Columns Grid */}
          <div style={styles.menuGrid}>
            {Object.keys(menuData).map((day, dIdx) => {
              const items = menuData[day] || [];
              const d = new Date(activeWeekStart || new Date());
              const dow = d.getDay();
              const diff = d.getDate() - dow + (dow === 0 ? -6 : 1);
              const dayDate = new Date(d.setDate(diff + dIdx));
              const formattedDate = `${dayDate.getDate()} ${dayDate.toLocaleDateString('en-US', { month: 'short' })}`;

              return (
                <div key={day} style={styles.menuColumn}>
                  <div style={styles.columnHeader}>
                    <div style={styles.columnDay}>{day}</div>
                    <div style={styles.columnDate}>{formattedDate}</div>
                  </div>

                  <div style={styles.columnBody}>
                    {items.length === 0 ? (
                      <div style={{ padding: '30px 10px', fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
                        No meals scheduled
                      </div>
                    ) : null}
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
                            {item.isVegan && <span style={{ ...styles.dot, backgroundColor: '#28A745' }} title="Vegan"></span>}
                            {item.isVegetarian && <span style={{ ...styles.dot, backgroundColor: '#83C5BE' }} title="Vegetarian"></span>}
                            {item.isGlutenFree && <span style={{ ...styles.dot, backgroundColor: '#E29578' }} title="Gluten Free"></span>}
                            {item.allergens.length > 0 && <span style={{ ...styles.dot, backgroundColor: '#E54A4B' }} title={`Allergens: ${item.allergens.join(', ')}`}></span>}
                          </div>

                          {/* Addons Counter Indicator */}
                          {Boolean(item.addonsCount && item.addonsCount > 0) && (
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
                <span style={{ ...styles.dot, backgroundColor: '#28A745' }}></span>
                <span>Vegan</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{ ...styles.dot, backgroundColor: '#83C5BE' }}></span>
                <span>Vegetarian</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{ ...styles.dot, backgroundColor: '#E29578' }}></span>
                <span>Gluten Free</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{ ...styles.dot, backgroundColor: '#E54A4B' }}></span>
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
                Add To Cart
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
