import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getDashboardSummaryApi, getMenusApi, getMenusForChildApi, getMenuDetailApi } from '../../services/api';
import { ShimmerStats, ShimmerCards } from '../../components/Shimmer';

const AVATARS = ['#006D77', '#E29578', '#4A90D9', '#9B59B6', '#F4A261', '#2A9D8F'];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Helper to calculate week days dynamically starting from current date onwards
function getWeekDates(offset = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentDayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const distToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + distToMonday + (offset * 7));

  const weekDays = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  days.forEach((dayName, idx) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + idx);
    dayDate.setHours(0, 0, 0, 0);

    const isPast = dayDate < today;
    const isToday = dayDate.getTime() === today.getTime();

    const monthStr = dayDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const dayNum = String(dayDate.getDate()).padStart(2, '0');
    const formattedDate = `${dayNum} ${monthStr}`;

    weekDays.push({
      dayName,
      dateObj: dayDate,
      formattedDate,
      isPast,
      isToday,
      fullDateStr: dayDate.toISOString().split('T')[0]
    });
  });

  return { weekDays, today, monday };
}

function parseApiMenuData(rawData, visibleDays = []) {
  const result = {};

  if (!visibleDays || visibleDays.length === 0) {
    DAYS_OF_WEEK.forEach(d => {
      result[d] = { date: '', isToday: false, items: [] };
    });
  } else {
    visibleDays.forEach(d => {
      result[d.dayName] = {
        date: d.formattedDate,
        isToday: d.isToday,
        fullDateStr: d.fullDateStr,
        items: []
      };
    });
  }

  if (!rawData) return result;

  let itemList = [];
  if (Array.isArray(rawData)) {
    itemList = rawData;
  } else if (rawData.config && Array.isArray(rawData.config)) {
    rawData.config.forEach(block => {
      if (Array.isArray(block.itemsArray)) itemList.push(...block.itemsArray);
      if (Array.isArray(block.items)) itemList.push(...block.items);
    });
  } else if (rawData.items && Array.isArray(rawData.items)) {
    itemList = rawData.items;
  } else if (rawData.menus && Array.isArray(rawData.menus)) {
    itemList = rawData.menus;
  }

  itemList.forEach((item, index) => {
    let dayName = DAYS_OF_WEEK[index % 5];
    if (item.day) {
      const match = DAYS_OF_WEEK.find(d => d.toLowerCase() === String(item.day).toLowerCase());
      if (match) dayName = match;
    } else if (item.date) {
      const dateObj = new Date(item.date);
      if (!isNaN(dateObj.getTime())) {
        const dIdx = dateObj.getDay() - 1;
        if (dIdx >= 0 && dIdx < 5) dayName = DAYS_OF_WEEK[dIdx];
      }
    }

    const formattedItem = {
      id: item.id || item.itemId || `item_${index}`,
      name: item.name || item.title || item.itemName || 'Meal Option',
      size: item.size || item.portion || 'REGULAR',
      price: parseFloat(item.price || item.amount || 0),
      image: item.image || item.photoUrl || item.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=120&q=80',
      isVegetarian: !!(item.veg || item.isVegetarian || item.is_vegetarian),
      isVegan: !!(item.vegan || item.isVegan || item.is_vegan),
      isGlutenFree: !!(item.glutenFree || item.isGlutenFree || item.is_gluten_free),
      isAllergen: !!(item.allergens?.length || item.is_allergen || item.isAllergen),
      addonsCount: Array.isArray(item.addon) ? item.addon.length : (item.addonsCount || 0)
    };

    if (result[dayName]) {
      result[dayName].items.push(formattedItem);
    }
  });

  return result;
}

const MONTH_GRID_DAYS = [
  { day: 29 }, { day: 30 },
  { day: 1 }, { day: 2 }, { day: 3 },
  { day: 6 }, { day: 7 }, { day: 8 },
  { day: 9 }, { day: 10 },
  { day: 13 }, { day: 14 }, { day: 15 }, { day: 16 }, { day: 17 }
];

const Dashboard = ({ setAvailableFunds, setAmountOwed, addToCart }) => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Accordion state
  const [expandedChildId, setExpandedChildId] = useState(null);
  const [menuViewType, setMenuViewType] = useState('Week'); // 'Week' | 'Month'
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = next week
  const [selectedMonth, setSelectedMonth] = useState('August 2026');
  const [copyFromStudent, setCopyFromStudent] = useState('');
  const [apiMenus, setApiMenus] = useState({});
  const [loadingMenu, setLoadingMenu] = useState(false);

  // Fetch API menus for active child
  const fetchMenuForChild = async (childId) => {
    if (childId === null || childId === undefined) return;
    setLoadingMenu(true);
    try {
      const res = await getMenusForChildApi(childId);
      if (res && res.status === 'success' && res.data) {
        const rawList = Array.isArray(res.data) ? res.data : (res.data.menus || []);
        if (rawList.length > 0 && rawList[0].id) {
          try {
            const detailRes = await getMenuDetailApi(rawList[0].id, childId);
            if (detailRes && detailRes.data) {
              setApiMenus(prev => ({ ...prev, [childId]: detailRes.data }));
            }
          } catch (dErr) {
            setApiMenus(prev => ({ ...prev, [childId]: rawList }));
          }
        } else {
          setApiMenus(prev => ({ ...prev, [childId]: rawList }));
        }
      }
    } catch (err) {
      console.log('Menu API notice:', err);
    } finally {
      setLoadingMenu(false);
    }
  };

  useEffect(() => {
    if (expandedChildId !== null) {
      fetchMenuForChild(expandedChildId);
    }
  }, [expandedChildId]);

  // Quantities state: childId -> day -> itemId -> qty
  const [menuQuantities, setMenuQuantities] = useState({
    default: {
      Monday: { m2: 2 },
      Tuesday: { t2: 1 },
      Wednesday: { w2: 1 },
      Thursday: { th2: 1 },
      Friday: { f2: 1 }
    }
  });

  const fetchDashboard = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await getDashboardSummaryApi();
      if (res && res.status === 'success' && res.data) {
        setSummary(res.data);
        if (res.data.summary) {
          const funds = parseFloat(res.data.summary.availableFunds) || 0;
          const owed  = parseFloat(res.data.summary.amountOwed)     || 0;
          if (setAvailableFunds) setAvailableFunds(funds);
          if (setAmountOwed)     setAmountOwed(owed);
        }
        // Expand first child by default if available
        if (Array.isArray(res.data.children) && res.data.children.length > 0) {
          setExpandedChildId(res.data.children[0].id || 0);
        }
      } else {
        setErrorMsg('Could not load dashboard data.');
      }
    } catch (err) {
      console.error('Dashboard API error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const parent   = summary?.parent  || {};
  const sumData  = summary?.summary || {};
  const children = Array.isArray(summary?.children) ? summary.children : [];
  const firstName = parent.firstName || parent.first_name || '';

  // Helpers for quantity changes
  const updateQty = (childId, day, itemId, delta) => {
    const cid = childId ?? 'default';
    setMenuQuantities(prev => {
      const childData = prev[cid] || {};
      const dayData = childData[day] || {};
      const currentQty = dayData[itemId] || 0;
      const nextQty = Math.max(0, currentQty + delta);
      return {
        ...prev,
        [cid]: {
          ...childData,
          [day]: {
            ...dayData,
            [itemId]: nextQty
          }
        }
      };
    });
  };

  const handleFirstItemAllDays = (childId) => {
    const cid = childId ?? 'default';
    setMenuQuantities(prev => {
      const childData = { ...(prev[cid] || {}) };
      Object.keys(WEEKLY_MENU).forEach(day => {
        const firstItem = WEEKLY_MENU[day].items[0];
        if (firstItem) {
          childData[day] = {
            ...(childData[day] || {}),
            [firstItem.id]: 1
          };
        }
      });
      return { ...prev, [cid]: childData };
    });
    toast.info('Selected first menu item for all days!');
  };

  const handleCopyOrder = (targetChildId, sourceStudentName) => {
    if (!sourceStudentName) return;
    toast.success(`Copied menu selections from ${sourceStudentName}`);
  };

  const handleFinishOrder = (child) => {
    const cid = child?.id ?? 'default';
    const childSelections = menuQuantities[cid] || {};
    let totalItems = 0;

    Object.keys(childSelections).forEach(day => {
      Object.keys(childSelections[day]).forEach(itemId => {
        const qty = childSelections[day][itemId];
        if (qty > 0 && addToCart) {
          totalItems += qty;
          // Find item details
          let itemDetails = null;
          Object.values(WEEKLY_MENU).forEach(d => {
            const found = d.items.find(i => i.id === itemId);
            if (found) itemDetails = found;
          });
          if (itemDetails) {
            addToCart({
              studentName: child?.name || 'Student',
              itemName: itemDetails.name,
              price: itemDetails.price,
              quantity: qty,
              day
            });
          }
        }
      });
    });

    toast.success(`Order summary updated for ${child?.name || 'child'}!`);
    navigate('/shoppingcart');
  };

  const handleNextChild = (currentIndex) => {
    if (currentIndex < children.length - 1) {
      setExpandedChildId(children[currentIndex + 1].id || (currentIndex + 1));
    } else {
      setExpandedChildId(children[0].id || 0);
    }
  };

  /* ─── Loading skeleton ─────────────────────────────────── */
  if (loading) {
    return (
      <>
        <div className="page-header">
          <div>
            <div className="shimmer-base shimmer-title" style={{ width: 280 }} />
            <div className="shimmer-base shimmer-line-sm" style={{ width: 220, marginTop: 6 }} />
          </div>
        </div>
        <ShimmerStats count={4} />
        <ShimmerCards count={3} />
      </>
    );
  }

  /* ─── Error state ───────────────────────────────────────── */
  if (errorMsg) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <i className="lni lni-warning" style={{ fontSize: 48, color: '#E54A4A', display: 'block', marginBottom: 12 }} />
        <p style={{ color: '#E54A4A', fontWeight: 600 }}>{errorMsg}</p>
        <button className="btn-primary" style={{ marginTop: 16 }} onClick={fetchDashboard}>Retry</button>
      </div>
    );
  }

  return (
    <>
      {/* ── Page Header ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">
            Welcome back{firstName ? `, ${firstName}` : ''}! 👋
          </h1>
          <p className="page-subtitle">Here's an overview of your children's meal accounts.</p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={fetchDashboard}>
          <i className="lni lni-reload" /> Refresh
        </button>
      </div>

      {/* ── Summary Stat Chips ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <StatChip icon="lni-dollar" label="Available Funds" value={`$${parseFloat(sumData.availableFunds || 0).toFixed(2)}`} color="#006D77" bg="#E6F4F5" />
        <StatChip icon="lni-alarm" label="Amount Owed" value={`$${parseFloat(sumData.amountOwed || 0).toFixed(2)}`} color="#E54A4A" bg="#FEF2F2" />
        <StatChip icon="lni-cart-alt" label="Cart Items" value={sumData.cartCount || 0} color="#4A90D9" bg="#EFF6FF" />
        <StatChip icon="lni-users" label="Children" value={children.length} color="#9B59B6" bg="#F5F3FF" />
      </div>

      {/* ── Children Accordion Cards List ── */}
      {children.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
          <i className="lni lni-friends" style={{ fontSize: 52, display: 'block', marginBottom: 12 }} />
          <p style={{ fontSize: 16 }}>No children found on your account.</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/children')}>
            + Add a Child
          </button>
        </div>
      ) : (
        <>
          <div className="student-cards-list">
            {children.map((child, i) => {
              const childId  = child.id ?? i;
              const isExpanded = expandedChildId === childId;
              const fullName = child.name || `${child.firstName || ''} ${child.lastName || ''}`.trim() || 'Jane Doe';
              const initials = fullName.split(' ').map(n => n[0] || '').join('').toUpperCase().slice(0, 2);
              const campus   = child.campusName || child.campusInfo?.name || 'Valleyview Middle New';
              const grade    = child.gradeName  || child.gradeInfo?.name  || '6';
              const room     = child.className  || child.classInfo?.name  || '1';
              const balance  = child.balance || child.owed || (45.60 - i * 20).toFixed(2);
              const cidKey   = childId ?? 'default';
              const childQuantities = menuQuantities[cidKey] || {};

              return (
                <React.Fragment key={childId}>
                  {/* Collapsed Horizontal Student Header Card */}
                  {!isExpanded ? (
                    <div
                      className="horizontal-student-card"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpandedChildId(childId)}
                    >
                      <div className="card-left">
                        <div className="avatar" style={{ background: AVATARS[i % AVATARS.length] }}>
                          {initials}
                        </div>
                        <div className="student-name">{fullName}</div>
                        <div className="meta-divider" />
                        <div className="meta-item"><i className="lni lni-apartment" /><span>{campus}</span></div>
                        <div className="meta-divider" />
                        <div className="meta-item"><i className="lni lni-display-alt" /><span>{room}</span></div>
                        <div className="meta-divider" />
                        <div className="meta-item"><i className="lni lni-graduation" /><span>{grade}</span></div>
                      </div>

                      <div className="card-right">
                        <div className="amount-badge">${parseFloat(balance || 0).toFixed(2)}</div>
                        <button className="action-icon-btn" title="Expand Menu Accordion" onClick={(e) => { e.stopPropagation(); setExpandedChildId(childId); }}>
                          <i className="lni lni-chevron-down" />
                        </button>
                        <button className="action-icon-btn" title="Edit student profile" onClick={(e) => { e.stopPropagation(); navigate('/children'); }}>
                          <i className="lni lni-pencil" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Expanded Accordion Container (Weekly & Monthly Menu View) */
                    <div className="student-accordion-container">
                      {/* Top Header Controls Bar */}
                      <div className="accordion-header-bar">
                        <div className="accordion-student-info">
                          <div className="accordion-avatar" style={{ background: AVATARS[i % AVATARS.length] }}>
                            {initials}
                          </div>
                          <div>
                            <input
                              type="text"
                              className="accordion-input-pill"
                              value={fullName}
                              readOnly
                              style={{ width: 130, marginBottom: 4 }}
                            />
                            <select
                              className="accordion-input-pill"
                              value={selectedMonth}
                              onChange={(e) => setSelectedMonth(e.target.value)}
                              style={{ display: 'block', cursor: 'pointer' }}
                            >
                              <option value="August 2026">August 2026</option>
                              <option value="September 2026">September 2026</option>
                            </select>
                          </div>
                          <div className="accordion-meta-block">
                            <div><i className="lni lni-apartment" /> {campus}</div>
                            <div><i className="lni lni-display-alt" /> {room}</div>
                            <div><i className="lni lni-graduation" /> {grade}</div>
                          </div>
                        </div>

                        <div className="accordion-header-controls">
                          {/* Week / Month Toggle Pill */}
                          <div className="week-month-toggle-pill">
                            <button
                              className={menuViewType === 'Week' ? 'active' : ''}
                              onClick={() => setMenuViewType('Week')}
                            >
                              Week
                            </button>
                            <button
                              className={menuViewType === 'Month' ? 'active' : ''}
                              onClick={() => setMenuViewType('Month')}
                            >
                              Month
                            </button>
                          </div>

                          {/* Copy Order From */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B' }}>
                            <span>Copy order from</span>
                            <select
                              className="accordion-input-pill"
                              value={copyFromStudent}
                              onChange={(e) => {
                                setCopyFromStudent(e.target.value);
                                handleCopyOrder(childId, e.target.value);
                              }}
                            >
                              <option value="">Select student</option>
                              {children.filter(c => (c.id ?? i) !== childId).map(c => (
                                <option key={c.id || c.name} value={c.name}>{c.name || 'John Doe'}</option>
                              ))}
                            </select>
                          </div>

                          {/* FIRST ITEM FOR ALL DAYS Button */}
                          <button
                            className="btn-first-item-all"
                            onClick={() => handleFirstItemAllDays(childId)}
                          >
                            FIRST ITEM FOR ALL DAYS
                          </button>

                          {/* Collapse button */}
                          <button
                            className="action-icon-btn"
                            title="Collapse accordion"
                            onClick={() => setExpandedChildId(null)}
                          >
                            <i className="lni lni-chevron-up" />
                          </button>
                        </div>
                      </div>

                      {/* ── View 1: Week View Carousel ── */}
                      {menuViewType === 'Week' ? (() => {
                        const { weekDays } = getWeekDates(weekOffset);
                        // Filter so ONLY current date (today) to further dates are visible
                        const visibleDays = weekDays.filter(d => !d.isPast);

                        return (
                          <div className="accordion-carousel-wrapper" style={{ flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 12 }}>
                              <button
                                className="carousel-nav-btn"
                                onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                                disabled={weekOffset <= 0}
                                style={{
                                  opacity: weekOffset <= 0 ? 0.4 : 1,
                                  cursor: weekOffset <= 0 ? 'not-allowed' : 'pointer'
                                }}
                                title={weekOffset <= 0 ? "Past weeks not accessible" : "Previous Week"}
                              >
                                <i className="lni lni-chevron-left" />
                              </button>

                              <div style={{ flex: 1 }}>
                                {/* Date Range Indicator Bar */}
                                <div style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  marginBottom: 8, padding: '0 4px'
                                }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: '#006D77', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <i className="lni lni-calendar" />
                                    {visibleDays.length > 0
                                      ? `${visibleDays[0].formattedDate} - ${visibleDays[visibleDays.length - 1].formattedDate} (${weekOffset === 0 ? 'Current Week' : `+${weekOffset} Week`})`
                                      : 'No upcoming dates'
                                    }
                                  </span>
                                  <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 500 }}>
                                    Current & Future Dates Only ({visibleDays.length} Days)
                                  </span>
                                </div>

                                {loadingMenu ? (
                                  <div className="weekly-columns-grid">
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, idx) => (
                                      <div className="weekly-day-column" key={idx} style={{ opacity: 0.7 }}>
                                        <div className="weekly-day-header shimmer-base" style={{ height: 38 }} />
                                        <div className="weekly-day-body" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                          <div className="shimmer-base" style={{ height: 85, borderRadius: 12 }} />
                                          <div className="shimmer-base" style={{ height: 85, borderRadius: 12 }} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (() => {
                                  const activeWeeklyMenu = parseApiMenuData(apiMenus[childId], visibleDays);
                                  return (
                                    <div className="weekly-columns-grid">
                                      {Object.keys(activeWeeklyMenu).map(day => {
                                        const dayObj = activeWeeklyMenu[day];
                                        return (
                                          <div className="weekly-day-column" key={day} style={{ border: dayObj.isToday ? '2px solid #006D77' : undefined }}>
                                            <div className="weekly-day-header" style={{ background: dayObj.isToday ? '#E6F4F5' : undefined }}>
                                              <span className="day-date" style={{ color: dayObj.isToday ? '#006D77' : undefined, fontWeight: dayObj.isToday ? 800 : undefined }}>
                                                {dayObj.date}
                                              </span>
                                              <span className="day-name" style={{ color: dayObj.isToday ? '#006D77' : undefined, fontWeight: dayObj.isToday ? 800 : undefined }}>
                                                {day} {dayObj.isToday && <span style={{ fontSize: 10, background: '#006D77', color: '#fff', padding: '1px 5px', borderRadius: 4, marginLeft: 4 }}>TODAY</span>}
                                              </span>
                                              <i className="lni lni-more-alt" style={{ fontSize: 12, color: '#E29578', cursor: 'pointer' }} />
                                            </div>

                                            <div className="weekly-day-body">
                                              {dayObj.items.length === 0 ? (
                                                <div style={{ padding: '30px 10px', fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
                                                  No meals scheduled for {day}.
                                                </div>
                                              ) : (
                                                dayObj.items.map(item => {
                                                  const currentQty = childQuantities[day]?.[item.id] || 0;
                                                  const isSelected = currentQty > 0;

                                                  return (
                                                    <div className={`accordion-food-card ${isSelected ? 'selected' : ''}`} key={item.id}>
                                                      <div className="accordion-food-top">
                                                        <img src={item.image} alt={item.name} className="accordion-food-img" />
                                                        <div>
                                                          <div className="accordion-food-title">{item.name}</div>
                                                          <div className="accordion-food-size">
                                                            <span>{item.size}</span>
                                                            {item.isVegetarian && <span className="tag-dot v-green">V</span>}
                                                            {item.isVegan && <span className="tag-dot vn-green">Vn</span>}
                                                            {item.isGlutenFree && <span className="tag-dot g-gold">G</span>}
                                                            {item.isAllergen && <span className="tag-dot a-red">A</span>}
                                                          </div>
                                                        </div>
                                                      </div>

                                                      <div className="accordion-food-bottom">
                                                        <div className="accordion-qty-box">
                                                          <button className="accordion-qty-btn" onClick={() => updateQty(childId, day, item.id, -1)}>-</button>
                                                          <span className="accordion-qty-val">{currentQty}</span>
                                                          <button className="accordion-qty-btn" onClick={() => updateQty(childId, day, item.id, 1)}>+</button>
                                                        </div>

                                                        {item.addonsCount > 0 && (
                                                          <button className="addons-pill-btn" onClick={() => toast.info('Manage add-ons')}>
                                                            {item.addonsCount} addons
                                                          </button>
                                                        )}

                                                        <span className="accordion-food-price">${item.price.toFixed(2)}</span>
                                                      </div>
                                                    </div>
                                                  );
                                                })
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>

                              <button
                                className="carousel-nav-btn"
                                onClick={() => setWeekOffset(prev => prev + 1)}
                                title="Next Week"
                              >
                                <i className="lni lni-chevron-right" />
                              </button>
                            </div>
                          </div>
                        );
                      })() : (
                        /* ── View 2: Month View Calendar Grid ── */
                        <div className="month-calendar-grid">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(dName => (
                            <div className="month-day-header" key={dName}>{dName}</div>
                          ))}

                          {MONTH_GRID_DAYS.map((cell, idx) => (
                            <div className="month-day-cell" key={idx}>
                              <span className="month-day-number">{cell.day}</span>
                              {cell.count && (
                                <div className="month-order-card">
                                  <div className="month-order-card-header">
                                    <span className="month-order-card-title">{cell.count} products - {cell.price}$</span>
                                    <button className="month-order-card-edit-btn" onClick={() => setMenuViewType('Week')}>
                                      <i className="lni lni-pencil" />
                                    </button>
                                  </div>
                                  <div className="month-order-item-list">
                                    <div>1x Veggie Burger</div>
                                    <div>1x Roast Beef Sandwich</div>
                                    <div>1x Apple Juice</div>
                                    <div>2x Apple Pie</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Accordion Footer Bar */}
                      <div className="accordion-footer-bar">
                        <div className="dietary-legend">
                          <div className="dietary-legend-item"><span className="tag-dot vn-green">Vn</span> Vegan</div>
                          <div className="dietary-legend-item"><span className="tag-dot v-green">V</span> Vegetarian</div>
                          <div className="dietary-legend-item"><span className="tag-dot g-gold">G</span> Gluten free</div>
                          <div className="dietary-legend-item"><span className="tag-dot a-red">A</span> Allergens</div>
                          <button className="btn-add-notes" onClick={() => toast.info('Notes added!')}>
                            ADD NOTES
                          </button>
                        </div>

                        <div className="accordion-footer-actions">
                          <button className="btn-accordion-cancel" onClick={() => setExpandedChildId(null)}>
                            CANCEL
                          </button>
                          <button className="btn-accordion-next" onClick={() => handleNextChild(i)}>
                            NEXT CHILD
                          </button>
                          <button className="btn-accordion-finish" onClick={() => handleFinishOrder(child)}>
                            FINISH ORDER
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Add New Child button */}
            <div className="add-child-horizontal-btn" onClick={() => navigate('/children')}>
              <i className="lni lni-circle-plus" style={{ fontSize: 18 }} />
              <span>Add New Child</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button className="btn-primary" style={{ padding: '12px 28px', fontSize: 14, fontWeight: 700, borderRadius: 8, letterSpacing: 0.5 }} onClick={() => navigate('/shoppingcart')}>
              PROCEED TO CHECKOUT →
            </button>
          </div>
        </>
      )}
    </>
  );
};

/* ── Small Helper: stat chip ── */
function StatChip({ icon, label, value, color, bg }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: '#fff', border: '1px solid #E5E7EB',
      borderRadius: 12, padding: '14px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)', flex: '1 1 160px'
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className={`lni ${icon}`} style={{ fontSize: 18, color }} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#636363', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  );
}

export default Dashboard;
