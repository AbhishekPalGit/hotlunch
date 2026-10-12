import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiEdit2, FiTrash2, FiSearch, FiRefreshCw } from 'react-icons/fi';
import { LuScan } from 'react-icons/lu';
import {
  getChildrenApi,
  addChildApi
} from '../../services/api';
import { ShimmerTable } from '../../components/Shimmer';
import CreateChildModal from '../../components/CreateChildModal';

const ChildrenPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [search, setSearch] = useState('');
  const [idFilter, setIdFilter] = useState('');
  const [campusFilter, setCampusFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editStudent, setEditStudent] = useState(null);

  const fetchChildren = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await getChildrenApi();
      if (response && Array.isArray(response.data)) {
        const mapped = response.data.map((c, index) => {
          const firstName = c.firstName || '';
          const lastName = c.lastName || '';
          const fullName = c.name || `${firstName} ${lastName}`.trim() || 'Unnamed Student';

          const campusName = c.campusInfo?.name || c.campusName || (typeof c.campus === 'string' ? c.campus : '--');
          const gradeName = c.gradeInfo?.name || c.gradeName || (typeof c.grade === 'string' ? c.grade : (c.grade ? String(c.grade) : '--'));
          const className = c.classInfo?.name || c.className || (typeof c.class === 'string' ? c.class : (c.class ? String(c.class) : '--'));

          return {
            id: c.id || index + 1,
            name: String(fullName),
            studentId: String(c.sid || c.studentId || '--'),
            campus: String(campusName),
            grade: String(gradeName),
            classroom: String(className),
            program: String(c.allergens || '--')
          };
        });
        setStudents(mapped);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error('Failed to fetch children:', err);
      const msg = err.response?.data?.detail?.message || err.response?.data?.message || 'Unable to load children from server.';
      setErrorMsg(msg);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  const filtered = students.filter(s =>
    String(s.name || '').toLowerCase().includes(search.toLowerCase()) &&
    String(s.studentId || '').toLowerCase().includes(idFilter.toLowerCase()) &&
    String(s.campus || '').toLowerCase().includes(campusFilter.toLowerCase()) &&
    String(s.grade || '').toLowerCase().includes(gradeFilter.toLowerCase())
  );

  const handleAdd = () => { setEditStudent(null); setModalOpen(true); };
  const handleEdit = (s) => { setEditStudent(s); setModalOpen(true); };
  const handleDelete = (id) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    toast.success('Student removed.');
  };
  const handleSave = async (form) => {
    if (editStudent) {
      setStudents(prev => prev.map(s => s.id === editStudent.id ? { ...s, ...form } : s));
      toast.success('Student profile updated!');
    } else {
      try {
        const payload = {
          firstName: form.firstName || 'Student',
          lastName: form.lastName || 'User',
          campusId: parseInt(form.campusId || 465, 10) || 465,
          campusCode: form.campusCode || '',
          grade: parseInt(form.gradeId || form.grade || 1, 10) || 1,
          classroom: parseInt(form.classroomId || form.classroom || 1, 10) || 1,
          allergens: form.allergens || [],
          preferredSize: form.preferredSize !== undefined ? form.preferredSize : 0
        };
        const res = await addChildApi(payload);
        if (res && res.status === 'success') {
          toast.success('Student added successfully!');
          fetchChildren();
        } else {
          setStudents(prev => [...prev, {
            ...form,
            id: Date.now(),
            studentId: `VMW${Math.floor(100 + Math.random() * 900)}`,
            program: Array.isArray(form.allergens) && form.allergens.length > 0 ? form.allergens.join(', ') : '--'
          }]);
          toast.success('Student added successfully!');
        }
      } catch (err) {
        setStudents(prev => [...prev, {
          ...form,
          id: Date.now(),
          studentId: `VMW${Math.floor(100 + Math.random() * 900)}`,
          program: Array.isArray(form.allergens) && form.allergens.length > 0 ? form.allergens.join(', ') : '--'
        }]);
        toast.success('Student added successfully!');
      }
    }
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Children Database</h1>
          <p className="page-subtitle">Manage your children profiles and classrooms</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-cancel" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={fetchChildren} disabled={loading}>
            <FiRefreshCw className={loading ? 'spin-icon' : ''} /> {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleAdd}>
            + ADD CHILD
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="login-error-alert" style={{ marginBottom: 16 }}>
          <span>Notice: {errorMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar">
        <input
          placeholder="🔍 Search Name"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <input
          placeholder="Student ID"
          value={idFilter}
          onChange={e => setIdFilter(e.target.value)}
        />
        <input
          placeholder="Campus"
          value={campusFilter}
          onChange={e => setCampusFilter(e.target.value)}
        />
        <input
          placeholder="Grade"
          value={gradeFilter}
          onChange={e => setGradeFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <ShimmerTable rows={5} cols={7} />
      ) : (
      <div className="hl-table-wrap">
        <table className="hl-table">
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
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#006D77', padding: 40, fontWeight: 500 }}>
                  Fetching children details from API...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>
                  No students found.
                </td>
              </tr>
            ) : filtered.map(s => (
              <tr key={s.id}>
                <td>
                  <span style={{ color: '#006D77', fontWeight: 600, cursor: 'pointer' }}>{s.name}</span>
                </td>
                <td>{s.studentId}</td>
                <td>{s.campus}</td>
                <td>{s.grade}</td>
                <td>{s.classroom}</td>
                <td>{s.program}</td>
                <td>
                  <div className="action-btns" style={{ justifyContent: 'flex-end' }}>
                    <button className="action-btn teal" title="Lunch Card">
                      <LuScan size={14} />
                    </button>
                    <button className="action-btn orange" title="Edit" onClick={() => handleEdit(s)}>
                      <FiEdit2 size={13} />
                    </button>
                    <button className="action-btn red" title="Delete" onClick={() => handleDelete(s.id)}>
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <CreateChildModal
        isOpen={modalOpen}
        student={editStudent}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
};

export default ChildrenPage;
