import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CartHoverPopup = ({ cartItems = [], cartTotal = 0, onClose }) => {
  const navigate = useNavigate();

  // Parse items into student groups
  const groups = (() => {
    if (!cartItems || cartItems.length === 0) {
      return [];
    }

    const sMap = {};
    const result = [];

    cartItems.forEach(item => {
      const sName = item.student || item.studentName || item.childName || 'Student';
      if (!sMap[sName]) {
        sMap[sName] = { name: sName, total: 0, count: 0, datesMap: {} };
        result.push(sMap[sName]);
      }
      const sObj = sMap[sName];
      const qty = parseInt(item.quantity, 10) || 1;
      const price = parseFloat(item.price || 0);
      sObj.total += price * qty;
      sObj.count += qty;

      const rawDate = item.date || item.day || 'Upcoming Meal';
      const dKey = String(rawDate).toUpperCase();
      if (!sObj.datesMap[dKey]) {
        sObj.datesMap[dKey] = { date: dKey, count: 0, items: [] };
      }
      sObj.datesMap[dKey].count += qty;
      sObj.datesMap[dKey].items.push({
        name: item.item || item.itemName || item.name || 'Lunch Meal',
        size: item.size || 'Large',
        price,
        quantity: qty,
        addons: item.addons || []
      });
    });

    result.forEach(sg => {
      sg.dates = Object.values(sg.datesMap);
    });

    return result;
  })();

  const [collapsedStudents, setCollapsedStudents] = useState({});
  const [collapsedDates, setCollapsedDates] = useState({});

  const toggleStudent = (sName) => {
    setCollapsedStudents(prev => ({
      ...prev,
      [sName]: !prev[sName]
    }));
  };

  const toggleDate = (sName, dName) => {
    const key = `${sName}_${dName}`;
    setCollapsedDates(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleGoToCart = () => {
    if (onClose) onClose();
    navigate('/shoppingcart');
  };

  const totalAmount = cartItems && cartItems.length > 0 
    ? (parseFloat(cartTotal) || groups.reduce((acc, g) => acc + g.total, 0))
    : 0;

  return (
    <div 
      className="cart-hover-popup"
      onClick={e => e.stopPropagation()}
    >
      {/* ── Top Header Bar ── */}
      <div className="cart-popup-header">
        <span className="cart-popup-title">CART</span>
        <span className="cart-popup-amount">${totalAmount.toFixed(2)}</span>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="cart-popup-body">
        {groups.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>
            <i className="lni lni-cart" style={{ fontSize: 28, marginBottom: 8, display: 'inline-block', opacity: 0.5 }} />
            <div style={{ fontSize: 13, fontWeight: 500 }}>Your cart is empty</div>
          </div>
        ) : (
          groups.map((student, sIdx) => {
            const isStudentCollapsed = !!collapsedStudents[student.name];

            return (
              <div key={sIdx} className="cart-popup-student-block">
                {/* Student Header */}
                <div 
                  className="cart-popup-student-header"
                  onClick={() => toggleStudent(student.name)}
                  title="Click to expand/collapse student"
                >
                  <div className="cart-popup-student-left">
                    <i className="lni lni-user" style={{ fontSize: 14, marginRight: 8, strokeWidth: 1 }} />
                    <span>
                      {student.name} – ${student.total.toFixed(2)} ({student.count} item{student.count !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <i className={`lni ${isStudentCollapsed ? 'lni-chevron-down' : 'lni-chevron-up'} cart-popup-chevron`} />
                </div>

                {/* Dates List */}
                {!isStudentCollapsed && (
                  <div className="cart-popup-dates-wrapper">
                    {student.dates.map((dateObj, dIdx) => {
                      const dateKey = `${student.name}_${dateObj.date}`;
                      const isDateCollapsed = !!collapsedDates[dateKey];

                      return (
                        <div key={dIdx} className="cart-popup-date-block">
                          {/* Date Header */}
                          <div 
                            className="cart-popup-date-header"
                            onClick={() => toggleDate(student.name, dateObj.date)}
                            title="Click to expand/collapse date"
                          >
                            <span className="cart-popup-date-label">
                              {dateObj.date} ({dateObj.count} item{dateObj.count !== 1 ? 's' : ''})
                            </span>
                            <i className={`lni ${isDateCollapsed ? 'lni-chevron-down' : 'lni-chevron-up'} cart-popup-date-chevron`} />
                          </div>

                          {/* Items under this Date */}
                          {!isDateCollapsed && (
                            <div className="cart-popup-items-list">
                              {dateObj.items.map((it, itIdx) => (
                                <div key={itIdx} className="cart-popup-item-container">
                                  <div className="cart-popup-item-row">
                                    <div className="cart-popup-item-info">
                                      <span className="cart-popup-item-qty">{it.quantity}x</span>
                                      <span className="cart-popup-item-name">
                                        {it.name}{it.size ? ` - ${it.size}` : ''}
                                      </span>
                                    </div>
                                    <span className="cart-popup-item-price">
                                      ${(it.price * it.quantity).toFixed(2)}
                                    </span>
                                  </div>

                                  {/* Add-ons */}
                                  {Array.isArray(it.addons) && it.addons.length > 0 && (
                                    <div className="cart-popup-addons-list">
                                      {it.addons.map((ad, aIdx) => {
                                        const addonName = typeof ad === 'string' ? ad : (ad.name || 'Addon');
                                        return (
                                          <div key={aIdx} className="cart-popup-addon-row">
                                            + 1x &nbsp;{addonName}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer Button ── */}
      <button 
        className="cart-popup-footer-btn"
        onClick={handleGoToCart}
      >
        GO TO SHOPPING CART
      </button>
    </div>
  );
};

export default CartHoverPopup;
