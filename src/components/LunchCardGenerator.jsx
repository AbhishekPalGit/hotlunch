import React, { useState, useEffect } from 'react';
import { getMenusApi, getMenusForChildApi, getChildrenApi, getLunchCardApi } from '../services/api';

const LunchCardGenerator = ({ students = [] }) => {
  const [studentList, setStudentList] = useState(students || []);
  const [selectedStudent, setSelectedStudent] = useState('');
  
  // Dynamic API menus state
  const [menus, setMenus] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState('');
  const [loadingMenus, setLoadingMenus] = useState(false);

  const [intervalType, setIntervalType] = useState('Weekly');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [twoColumns, setTwoColumns] = useState(false);
  const [cardsGenerated, setCardsGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cards, setCards] = useState([]);

  // Sync or fetch students list
  useEffect(() => {
    if (students && students.length > 0) {
      setStudentList(students);
      if (!selectedStudent) {
        setSelectedStudent(students[0].name || String(students[0].id) || '');
      }
    } else {
      getChildrenApi()
        .then((res) => {
          if (res && Array.isArray(res.data) && res.data.length > 0) {
            const mapped = res.data.map((c, idx) => ({
              id: c.id || idx + 1,
              name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || `Student ${idx + 1}`,
              studentId: c.sid || c.studentId || `STU${c.id || idx + 1}`,
              campus: c.campusInfo?.name || c.campusName || c.campus || 'Valleyview Middle New',
              grade: c.gradeInfo?.name || c.gradeName || (c.grade ? String(c.grade) : '6'),
              classroom: c.classroomName || c.classroom || c.classInfo?.name || c.className || (c.class ? String(c.class) : '1')
            }));
            setStudentList(mapped);
            if (!selectedStudent && mapped.length > 0) {
              setSelectedStudent(mapped[0].name || String(mapped[0].id) || '');
            }
          }
        })
        .catch((err) => console.log('Children fetch notice in LunchCardGenerator:', err));
    }
  }, [students]);

  // Fetch menus from API (supports general menus or scoped by childId as per hotlunch_postman_collection.json)
  const fetchMenusFromApi = async (childId = null) => {
    setLoadingMenus(true);
    try {
      let res;
      if (childId) {
        res = await getMenusForChildApi(childId);
      } else {
        res = await getMenusApi();
      }

      let rawList = [];
      if (res && res.status === 'success' && res.data) {
        rawList = Array.isArray(res.data) ? res.data : (res.data.menus || []);
      } else if (Array.isArray(res?.data)) {
        rawList = res.data;
      } else if (Array.isArray(res)) {
        rawList = res;
      }

      if (rawList.length > 0) {
        const formatted = rawList.map((m, idx) => {
          const id = String(m.id ?? m.menuId ?? idx + 1);
          const name = m.title || m.name || m.menuName || m.month || m.monthName || `Menu ${id}`;
          const startDate = m.startDate || m.start_date || m.fromDate || m.from_date || '';
          const endDate = m.endDate || m.end_date || m.toDate || m.to_date || '';
          return { id, name, startDate, endDate, raw: m };
        });

        setMenus(formatted);
        // Default to first menu or keep valid selection
        if (!selectedMenu || !formatted.some(m => m.id === selectedMenu || m.name === selectedMenu)) {
          setSelectedMenu(formatted[0].id);
          if (formatted[0].startDate) setFromDate(formatted[0].startDate);
          if (formatted[0].endDate) setToDate(formatted[0].endDate);
        }
      } else {
        setMenus([]);
      }
    } catch (err) {
      console.log('Menus API fetch notice:', err);
      setMenus([]);
    } finally {
      setLoadingMenus(false);
    }
  };

  // Fetch menus on load or when selected student changes
  useEffect(() => {
    const studentObj = studentList.find(s => s.name === selectedStudent || String(s.id) === String(selectedStudent));
    fetchMenusFromApi(studentObj?.id || null);
  }, [selectedStudent]);

  // Handle Menu Selection Change
  const handleMenuChange = (e) => {
    const val = e.target.value;
    setSelectedMenu(val);
    const found = menus.find(m => m.id === val || m.name === val);
    if (found) {
      if (found.startDate) setFromDate(found.startDate);
      if (found.endDate) setToDate(found.endDate);
    }
  };

  // Find active student and menu display names
  const selectedStudentObj = studentList.find(s => s.name === selectedStudent || String(s.id) === String(selectedStudent));
  const studentDisplayName = selectedStudentObj ? selectedStudentObj.name : (selectedStudent || 'Student');
  const studentDisplayId = selectedStudentObj?.studentId || '--';
  const studentSchool = selectedStudentObj?.campus || '--';
  const studentGrade = selectedStudentObj?.grade || '--';
  const studentClassroom = selectedStudentObj?.classroom || '--';

  const selectedMenuObj = menus.find(m => m.id === selectedMenu || m.name === selectedMenu);
  const selectedMenuDisplay = selectedMenuObj ? selectedMenuObj.name : (selectedMenu || '--');

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const params = {
        intervalType: intervalType === 'Weekly' ? 2 : 1,
        twoColumns
      };
      if (selectedStudentObj?.id) params.childId = selectedStudentObj.id;
      if (fromDate) params.startDate = fromDate;
      if (toDate) params.endDate = toDate;
      if (selectedMenu) params.menuId = selectedMenu;

      const res = await getLunchCardApi(params);
      if (res && res.status === 'success') {
        const apiCards = [
          ...(res.column1 || []),
          ...(res.column2 || []),
          ...(Array.isArray(res.data) ? res.data : [])
        ];
        if (apiCards.length > 0) {
          setCards(apiCards.map((c, idx) => ({
            dayCode: c.dayCode || c.date || c.mealDate || '--',
            studentId: c.studentId || c.sid || studentDisplayId,
            name: c.studentName || c.student || c.name || studentDisplayName,
            grade: c.gradeName || c.grade || studentGrade,
            classroom: c.className || c.classroom || studentClassroom,
            item: c.mealName || c.meal || c.item || 'Meal Item',
            orderId: c.orderId ? (String(c.orderId).startsWith('#') ? c.orderId : `#${c.orderId}`) : `#${idx + 1}`
          })));
          setCardsGenerated(true);
          return;
        }
      }

      setCards([]);
      setCardsGenerated(true);
    } catch (err) {
      console.log('Error generating lunch cards:', err);
      setCards([]);
      setCardsGenerated(true);
    } finally {
      setIsGenerating(false);
    }
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
                {studentList.map(s => (
                  <option key={s.id} value={s.name}>{s.name} ({s.studentId})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Menu</span>
                {loadingMenus && (
                  <span style={{ fontSize: '11px', color: 'var(--primary, #006D77)', fontWeight: 'normal' }}>
                    Loading menus from API...
                  </span>
                )}
              </label>
              <select 
                className="form-control"
                value={selectedMenu}
                onChange={handleMenuChange}
                disabled={loadingMenus && menus.length === 0}
              >
                {menus.length === 0 ? (
                  <option value="" disabled>
                    {loadingMenus ? 'Loading menus from API...' : 'No menus available'}
                  </option>
                ) : (
                  menus.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))
                )}
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={isGenerating}>
              {isGenerating ? 'GENERATING REPORT...' : 'GENERATE REPORT'}
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
                {cards.map((card, idx) => (
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
                        <div><strong>Month:</strong> {selectedMenuDisplay}</div>
                        <div><strong>School:</strong> {studentSchool}</div>
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
