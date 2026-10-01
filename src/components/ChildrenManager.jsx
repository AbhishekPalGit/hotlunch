import React, { useState } from 'react';

const ChildrenManager = ({ students, setStudents, setActiveTab, setSelectedStudentForOrder }) => {
  const [searchName, setSearchName] = useState('');
  const [searchID, setSearchID] = useState('');
  const [searchCampus, setSearchCampus] = useState('');
  const [searchGrade, setSearchGrade] = useState('');

  // Add child state
  const [isAdding, setIsAdding] = useState(false);
  const [newChild, setNewChild] = useState({
    name: '',
    studentId: '',
    campus: 'Valleyview Middle New',
    grade: 'Grade 1',
    classroom: 'Class A'
  });

  const handleAddChild = (e) => {
    e.preventDefault();
    if (!newChild.name || !newChild.studentId) {
      alert('Please fill in Name and Student ID.');
      return;
    }
    const created = {
      id: Date.now().toString(),
      name: newChild.name,
      studentId: newChild.studentId,
      campus: newChild.campus,
      grade: newChild.grade,
      classroom: newChild.classroom,
      balance: 0.00,
      owed: 0.00
    };
    setStudents(prev => [...prev, created]);
    setIsAdding(false);
    setNewChild({
      name: '',
      studentId: '',
      campus: 'Valleyview Middle New',
      grade: 'Grade 1',
      classroom: 'Class A'
    });
  };

  const filteredStudents = students.filter(student => {
    return (
      student.name.toLowerCase().includes(searchName.toLowerCase()) &&
      student.studentId.toLowerCase().includes(searchID.toLowerCase()) &&
      student.campus.toLowerCase().includes(searchCampus.toLowerCase()) &&
      student.grade.toLowerCase().includes(searchGrade.toLowerCase())
    );
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2>Children Database</h2>
          <p className="text-muted">Manage your children profiles and classrooms</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
          <i className="lni lni-plus"></i> ADD CHILD
        </button>
      </div>

      {/* Add Child Form Popup/Modal */}
      {isAdding && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="card">
            <h3>Add New Child Profile</h3>
            <form onSubmit={handleAddChild} style={styles.form}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  placeholder="e.g. Jane Doe"
                  value={newChild.name}
                  onChange={(e) => setNewChild({...newChild, name: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Student ID</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  placeholder="e.g. VMW175"
                  value={newChild.studentId}
                  onChange={(e) => setNewChild({...newChild, studentId: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Campus</label>
                <select 
                  className="form-control"
                  value={newChild.campus}
                  onChange={(e) => setNewChild({...newChild, campus: e.target.value})}
                >
                  <option>Valleyview Middle New</option>
                  <option>Loyola Elementary</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Grade</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Grade 1 or 6 New"
                  value={newChild.grade}
                  onChange={(e) => setNewChild({...newChild, grade: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Classroom / Division</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Class A or Default 1"
                  value={newChild.classroom}
                  onChange={(e) => setNewChild({...newChild, classroom: e.target.value})}
                />
              </div>

              <div style={styles.formActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdding(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search Filters Row (Screenshot 6) */}
      <div style={styles.filtersRow} className="card">
        <div style={styles.filterField}>
          <i className="lni lni-search-alt" style={styles.searchIcon}></i>
          <input 
            type="text" 
            placeholder="Search Name" 
            style={styles.filterInput}
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>
        <div style={styles.filterField}>
          <input 
            type="text" 
            placeholder="Student ID" 
            style={styles.filterInput}
            value={searchID}
            onChange={(e) => setSearchID(e.target.value)}
          />
        </div>
        <div style={styles.filterField}>
          <input 
            type="text" 
            placeholder="Campus" 
            style={styles.filterInput}
            value={searchCampus}
            onChange={(e) => setSearchCampus(e.target.value)}
          />
        </div>
        <div style={styles.filterField}>
          <input 
            type="text" 
            placeholder="Grade" 
            style={styles.filterInput}
            value={searchGrade}
            onChange={(e) => setSearchGrade(e.target.value)}
          />
        </div>
      </div>

      {/* Database Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>STUDENT ID</th>
              <th>CAMPUS</th>
              <th>GRADE</th>
              <th>CLASSROOM/DIVISION</th>
              <th>PROGRAM</th>
              <th style={{ textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{student.name}</td>
                  <td>{student.studentId}</td>
                  <td>{student.campus}</td>
                  <td>{student.grade}</td>
                  <td>{student.classroom}</td>
                  <td><span className="text-muted">--</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={styles.actionsCell}>
                      {/* Fork & Knife Order Button */}
                      <button 
                        style={{...styles.actionBtn, backgroundColor: 'rgba(0, 109, 119, 0.1)'}}
                        onClick={() => {
                          setSelectedStudentForOrder(student);
                          setActiveTab('home');
                        }}
                        title="Order Lunch"
                      >
                        <i className="lni lni-restaurant" style={{ color: 'var(--primary)', fontSize: '14px' }}></i>
                      </button>
                      
                      {/* Edit Button */}
                      <button 
                        style={{...styles.actionBtn, backgroundColor: 'rgba(226, 149, 120, 0.1)'}}
                        onClick={() => alert(`Edit details for ${student.name}`)}
                        title="Edit Profile"
                      >
                        <i className="lni lni-pencil" style={{ color: 'var(--accent)', fontSize: '14px' }}></i>
                      </button>

                      {/* Delete Button */}
                      <button 
                        style={{...styles.actionBtn, backgroundColor: 'rgba(229, 74, 75, 0.1)'}}
                        onClick={() => setStudents(prev => prev.filter(s => s.id !== student.id))}
                        title="Delete Profile"
                      >
                        <i className="lni lni-trash-can" style={{ color: 'var(--error)', fontSize: '14px' }}></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-gray)' }}>
                  No student records found matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  filtersRow: {
    display: 'flex',
    padding: '14px 20px',
    gap: '16px',
    flexWrap: 'wrap'
  },
  filterField: {
    flex: 1,
    minWidth: '150px',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '8px 12px',
    backgroundColor: '#f8fafc'
  },
  filterInput: {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: '13px',
    width: '100%',
    fontFamily: "'Poppins', sans-serif"
  },
  searchIcon: {
    marginRight: '8px',
    color: 'var(--text-gray)',
    fontSize: '14px'
  },
  actionsCell: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px'
  },
  actionBtn: {
    border: 'none',
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100
  },
  modalContent: {
    width: '100%',
    maxWidth: '500px',
    backgroundColor: '#ffffff',
    padding: '24px'
  },
  form: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '16px'
  }
};

export default ChildrenManager;
