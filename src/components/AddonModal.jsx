import React, { useState, useEffect } from 'react';

export const DEFAULT_ADDONS = [
  { id: 'fries', name: 'Fries', price: 2.00 },
  { id: 'potatoes', name: 'Baked Potatoes', price: 3.00 },
  { id: 'ranch', name: 'Ranch dressing', price: 1.00 },
  { id: 'bbq', name: 'BBQ Sauce', price: 1.50 },
  { id: 'pepsi', name: 'Pepsi', price: 0.50 },
  { id: 'salad', name: 'Tomato salad', price: 2.50 },
];

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
      setSelectedMap(initialSelections ? JSON.parse(JSON.stringify(initialSelections)) : {});
    }
  }, [isOpen, initialSelections]);

  if (!isOpen || !item) return null;

  const count = Math.max(1, parseInt(qty, 10) || 1);

  // Parse available addons
  let availableAddons = DEFAULT_ADDONS;
  if (Array.isArray(item.addons) && item.addons.length > 0) {
    availableAddons = item.addons.map((a, idx) => {
      if (typeof a === 'string') {
        return { id: `addon_${idx}`, name: a, price: 1.50 };
      }
      return {
        id: a.id || `addon_${idx}`,
        name: a.name || a.title || 'Addon',
        price: parseFloat(a.price || 0)
      };
    });
  }

  const toggleAddon = (instIdx, addonId) => {
    setSelectedMap(prev => {
      const currentList = prev[instIdx] || [];
      const exists = currentList.includes(addonId);
      const nextList = exists
        ? currentList.filter(id => id !== addonId)
        : [...currentList, addonId];
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
                    <span style={{ color: '#006D77', fontWeight: 700, marginLeft: 2 }}>+</span>
                  </div>

                  <div className="addon-grid">
                    {availableAddons.map(addon => {
                      const isChecked = currentSelected.includes(addon.id);
                      return (
                        <label className="addon-checkbox-label" key={addon.id}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleAddon(instIdx, addon.id)}
                          />
                          <span>{addon.name} ${Number(addon.price).toFixed(2)}</span>
                        </label>
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
