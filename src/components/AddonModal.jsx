import React, { useState, useEffect } from 'react';

export const DEFAULT_ADDONS = [];

export default function AddonModal({
  isOpen,
  onClose,
  item,
  qty = 1,
  initialSelections = {},
  onSave,
}) {
  const [selectedMap, setSelectedMap] = useState({});

  useEffect(() => {
    if (isOpen) {
      setSelectedMap(initialSelections && typeof initialSelections === 'object' ? JSON.parse(JSON.stringify(initialSelections)) : {});
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const count = Math.max(1, parseInt(qty, 10) || 1);

  // Parse available addons (supports both item.addons and item.addon from backend)
  const rawList = Array.isArray(item.addons) && item.addons.length > 0
    ? item.addons
    : (Array.isArray(item.addon) && item.addon.length > 0 ? item.addon : []);

  const availableAddons = rawList.map((a, idx) => {
    if (typeof a === 'string') {
      return { id: `addon_${idx}`, name: a, price: 1.50 };
    }
    return {
      id: a.id !== undefined ? a.id : `addon_${idx}`,
      name: a.name || a.title || 'Addon',
      price: parseFloat(a.price ?? a.sp ?? 0)
    };
  });

  const toggleAddon = (instIdx, addonId) => {
    setSelectedMap(prev => {
      const currentList = prev[instIdx] ? [...prev[instIdx]] : [];
      const strId = String(addonId);
      const existsIndex = currentList.findIndex(id => String(id) === strId);
      let nextList;
      if (existsIndex >= 0) {
        nextList = currentList.filter((_, idx) => idx !== existsIndex);
      } else {
        nextList = [...currentList, addonId];
      }
      return { ...prev, [instIdx]: nextList };
    });
  };

  const handleSave = () => {
    if (onSave) {
      onSave(selectedMap);
    }
    onClose();
  };

  return (
    <div className="addon-modal-overlay" onClick={onClose}>
      <div className="addon-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="addon-modal-header">
          <h3 className="addon-modal-title">
            Addons – {availableAddons.length} available
          </h3>
          <button className="addon-modal-close-btn" onClick={onClose} title="Close">
            &times;
          </button>
        </div>

        <div className="addon-modal-body">
          {Array.from({ length: count }).map((_, instIdx) => {
            const currentSelected = selectedMap[instIdx] || [];
            return (
              <div className="addon-item-row" key={instIdx}>
                <img
                  src={item.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=120&q=80'}
                  alt={item.name}
                  className="addon-item-avatar"
                />
                <div className="addon-item-content">
                  <div className="addon-item-heading">
                    <span>{item.name}</span>
                    {item.sizeName && (
                      <span style={{ fontSize: 11, background: '#E6F4F5', color: '#006D77', padding: '1px 6px', borderRadius: 4, fontWeight: 700, marginLeft: 6 }}>
                        {item.sizeName}
                      </span>
                    )}
                    <span style={{ color: '#006D77', fontWeight: 700, marginLeft: 2 }}>+</span>
                  </div>

                  <div className="addon-grid">
                    {availableAddons.map(addon => {
                      const isChecked = currentSelected.some(id => String(id) === String(addon.id));
                      return (
                        <div
                          className="addon-checkbox-label"
                          key={addon.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleAddon(instIdx, addon.id);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            style={{ pointerEvents: 'none' }}
                          />
                          <span>{addon.name} ${Number(addon.price).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="addon-modal-footer">
          <button className="btn-addon-cancel" onClick={onClose}>
            CANCEL
          </button>
          <button className="btn-addon-add" onClick={handleSave}>
            ADD
          </button>
        </div>
      </div>
    </div>
  );
}
