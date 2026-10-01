import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { getLunchCardApi } from '../../services/api';
import { ShimmerLunchCards } from '../../components/Shimmer';


const LunchCard = () => {
  const [intervalType, setIntervalType] = useState(1); // 1=daily, 2=weekly
  const [twoColumns, setTwoColumns]     = useState(true);
  const [reportData, setReportData]     = useState(null);
  const [isLoading, setIsLoading]       = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setReportData(null);
    try {
      const res = await getLunchCardApi(intervalType, twoColumns);
      if (res && res.status === 'success') {
        setReportData(res);
      } else {
        toast.error(res?.message || 'Failed to generate lunch cards.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load lunch card report.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => window.print();

  // Merge column1 and column2 into a single displayable list
  const allCards = reportData
    ? [
        ...(reportData.column1 || []),
        ...(reportData.column2 || []),
        // If API returns a flat `data` array instead
        ...(Array.isArray(reportData.data) ? reportData.data : []),
      ]
    : [];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          <i className="lni lni-postcard" style={{ fontSize: 22 }} /> Lunch Card
        </h1>
        <p className="page-subtitle">Generate and print meal ticket cards for your children.</p>
      </div>

      <div className="lunch-card-layout">
        {/* ── Options Panel ── */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: '#1F2937' }}>Report Options</h3>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Interval Type</label>
              <select value={intervalType} onChange={e => setIntervalType(Number(e.target.value))}>
                <option value={1}>Daily (1 card per meal per date)</option>
                <option value={2}>Weekly (grouped by student)</option>
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 20, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={twoColumns}
                onChange={e => setTwoColumns(e.target.checked)}
                style={{ accentColor: '#006D77' }}
              />
              Print two columns of cards
            </label>

            <button className="btn-primary" style={{ width: '100%' }} onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? 'GENERATING…' : 'GENERATE LUNCH CARDS'}
            </button>

            {reportData && (
              <button
                className="btn-cancel"
                style={{ width: '100%', marginTop: 10 }}
                onClick={handlePrint}
              >
                <i className="lni lni-printer" style={{ marginRight: 6 }} />
                PRINT CARDS
              </button>
            )}
          </div>
        </div>

        {/* ── Preview Panel ── */}
        {isLoading ? (
          <ShimmerLunchCards count={6} twoCol={twoColumns} />
        ) : !reportData ? (
          <div className="lunch-preview-empty">
            <div className="preview-icon">
              <i className="lni lni-postcard" />
            </div>
            <h3>Preview Area</h3>
            <p>Select options and click Generate Lunch Cards to render print-ready vouchers.</p>
          </div>
        ) : allCards.length === 0 ? (
          <div className="lunch-preview-empty">
            <div className="preview-icon"><i className="lni lni-empty-file" /></div>
            <h3>No Cards Found</h3>
            <p>No meal orders found for the selected period.</p>
          </div>
        ) : (
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, color: '#006D77' }}>
                  {allCards.length} Lunch Card{allCards.length !== 1 ? 's' : ''} Generated
                </h3>
                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }} onClick={handlePrint}>
                  <i className="lni lni-printer" style={{ marginRight: 4 }} /> PRINT
                </button>
              </div>

              <div style={{
                display: twoColumns ? 'grid' : 'block',
                gridTemplateColumns: '1fr 1fr',
                gap: 12
              }}>
                {allCards.map((card, i) => {
                  const studentName = card.studentName || card.student || card.name || '--';
                  const date        = card.date || card.mealDate || '--';
                  const mealName    = card.mealName || card.meal || card.item || '--';
                  const campus      = card.campusName || card.campus || '';
                  const grade       = card.gradeName || card.grade || '';
                  const className   = card.className || card.class || '';
                  const price       = parseFloat(card.price || card.amount || 0);

                  return (
                    <div key={i} style={{
                      border: '2px solid #006D77',
                      borderRadius: 10,
                      padding: '14px 16px',
                      marginBottom: twoColumns ? 0 : 12,
                      background: 'linear-gradient(135deg, #F0F9F9 0%, #E6F4F5 100%)',
                      pageBreakInside: 'avoid',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: 700, color: '#006D77', fontSize: 14 }}>{studentName}</div>
                        {price > 0 && (
                          <div style={{ fontWeight: 700, color: '#006D77', fontSize: 14 }}>
                            ${price.toFixed(2)}
                          </div>
                        )}
                      </div>

                      {(campus || grade || className) && (
                        <div style={{ fontSize: 11, color: '#636363', marginTop: 2 }}>
                          {[campus, grade, className].filter(Boolean).join(' · ')}
                        </div>
                      )}

                      <div style={{ fontSize: 12, color: '#636363', margin: '6px 0 4px', fontWeight: 500 }}>
                        📅 {date}
                      </div>

                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1F2937' }}>🍱 {mealName}</div>

                      {card.addons && card.addons.length > 0 && (
                        <div style={{ fontSize: 11, color: '#636363', marginTop: 4 }}>
                          + {card.addons.map(a => a.name || a).join(', ')}
                        </div>
                      )}

                      {card.allergens && card.allergens.length > 0 && (
                        <div style={{
                          fontSize: 11, color: '#E54A4A', marginTop: 6,
                          background: '#FEF2F2', borderRadius: 4, padding: '2px 6px', display: 'inline-block'
                        }}>
                          ⚠ {card.allergens.map(a => a.name || a).join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default LunchCard;
