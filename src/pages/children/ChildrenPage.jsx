import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiEdit2, FiTrash2, FiSearch, FiRefreshCw } from 'react-icons/fi';
import { LuScan } from 'react-icons/lu';
import {
  getChildrenApi,
  verifyCampusApi,
  getGradesApi,
  getClassroomsApi,
  addChildApi
} from '../../services/api';
import { ShimmerTable } from '../../components/Shimmer';

const DEFAULT_STUDENTS = [
  { id: 1, name: 'John Doe', studentId: 'VMW174', campus: 'Valleyview Middle New', grade: 'Grade 1', classroom: 'Class A', program: '--' },
  { id: 2, name: 'Jane Doe', studentId: 'VMW175', campus: 'Valleyview Middle New', grade: '6 New 1', classroom: 'Default 1', program: '--' },
];

const DEFAULT_GRADES = [
  { id: 1, name: 'Grade 1' },
  { id: 2, name: 'Grade 2' },
  { id: 3, name: 'Grade 3' },
  { id: 4, name: 'Grade 4' },
  { id: 5, name: 'Grade 5' },
  { id: 6, name: 'Grade 6' },
  { id: 7, name: 'Grade 7' },
  { id: 8, name: 'Grade 8' }
];

const DEFAULT_CLASSROOMS = [
  { id: 101, name: 'Room 101 - Mrs. Smith' },
  { id: 102, name: 'Room 102 - Mr. Johnson' },
  { id: 103, name: 'Room 103 - Ms. Davis' }
];

function ChildModal({ student, onClose, onSave }) {
  const [name, setName] = useState(student?.name || '');
  const [studentId, setStudentId] = useState(student?.studentId || '');
  const [campusCode, setCampusCode] = useState(student?.campusCode || 'SCH001');
  const [verifiedCampus, setVerifiedCampus] = useState(student?.campus ? { name: student.campus, campusId: 465 } : null);
  const [verifyingCampus, setVerifyingCampus] = useState(false);
  const [campusError, setCampusError] = useState('');

  const [gradesList, setGradesList] = useState(DEFAULT_GRADES);
  const [classroomsList, setClassroomsList] = useState(DEFAULT_CLASSROOMS);

  const [grade, setGrade] = useState(student?.grade || '');
  const [classroom, setClassroom] = useState(student?.classroom || '');
  const [program, setProgram] = useState(student?.program || '--');

  const handleVerifyCampus = async () => {
    if (!campusCode.trim()) {
      setCampusError('Campus code is required');
      return;
    }
    setVerifyingCampus(true);
    setCampusError('');
    try {
      const res = await verifyCampusApi(campusCode.trim());
      if (res && (res.status === 'success' || res.campusId)) {
        const campusInfo = {
          campusId: res.campusId || 465,
          name: res.data || res.campusName || 'Loyola Main Campus'
        };
        setVerifiedCampus(campusInfo);
        toast.success(`Campus verified: ${campusInfo.name}`);

        try {
          const gRes = await getGradesApi(campusInfo.campusId);
          const list = Array.isArray(gRes) ? gRes : (gRes?.data || []);
          if (list.length > 0) setGradesList(list);
        } catch (e) {
          console.error('Error fetching grades:', e);
        }
      } else {
        setCampusError(res?.message || 'Invalid campus code');
        setVerifiedCampus(null);
      }
    } catch (err) {
      setCampusError(err.response?.data?.message || 'Invalid campus code');
      setVerifiedCampus(null);
    } finally {
      setVerifyingCampus(false);
    }
  };

  const handleGradeChange = async (selectedGradeId) => {
    setGrade(selectedGradeId);
    setClassroom('');
    if (!selectedGradeId) return;

    const cid = verifiedCampus?.campusId || 465;
    try {
      const cRes = await getClassroomsApi(selectedGradeId, cid);
      const list = Array.isArray(cRes) ? cRes : (cRes?.data || []);
      if (list.length > 0) setClassroomsList(list);
    } catch (e) {
      console.error('Error fetching classrooms:', e);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return toast.error('Full Name is required');
    if (!campusCode.trim() || !verifiedCampus) return toast.error('Please enter and verify Campus Access Code');
    if (!grade) return toast.error('Please select a Grade');
    if (!classroom) return toast.error('Please select a Classroom');

    const selectedGradeObj = gradesList.find(g => String(g.id) === String(grade)) || { name: grade };
    const selectedRoomObj = classroomsList.find(c => String(c.id) === String(classroom)) || { name: classroom };

    onSave({
      name,
      studentId,
      campusCode,
      campus: verifiedCampus?.name || campusCode,
      campusId: verifiedCampus?.campusId || 465,
      grade: selectedGradeObj.name || grade,
      gradeId: grade,
      classroom: selectedRoomObj.name || classroom,
      classroomId: classroom,
      program
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <h2 style={{ marginBottom: 16, fontSize: 18, color: '#006D77' }}>{student ? 'Edit Student' : 'Add New Student'}</h2>
        <div className="form-grid" style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" />
          </div>

          <div className="form-group">
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Student ID</label>
            <input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="e.g. VMW174" />
          </div>

          <div className="form-group">
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Program / Allergens</label>
            <input value={program} onChange={e => setProgram(e.target.value)} placeholder="e.g. Peanut Allergy" />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Campus Access Code</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={campusCode}
                onChange={e => { setCampusCode(e.target.value); if (campusError) setCampusError(''); }}
                placeholder="e.g. SCH001"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '0 16px', fontSize: 13, borderRadius: 8, whiteSpace: 'nowrap' }}
                onClick={handleVerifyCampus}
                disabled={verifyingCampus}
              >
                {verifyingCampus ? 'Verifying...' : 'Verify'}
              </button>
            </div>
            {verifiedCampus && (
              <span style={{ fontSize: 11.5, color: '#10B981', fontWeight: 600, display: 'block', marginTop: 4 }}>
                ✓ Verified: {verifiedCampus.name}
              </span>
            )}
            {campusError && <span className="field-error" style={{ color: '#EF4444', fontSize: 11.5, marginTop: 4, display: 'block' }}>{campusError}</span>}
          </div>

          <div className="form-group">
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Grade</label>
            <select
              value={grade}
              onChange={e => handleGradeChange(e.target.value)}
              disabled={!verifiedCampus}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1' }}
            >
              <option value="">{verifiedCampus ? 'Select Grade' : 'Verify Code First'}</option>
              {gradesList.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Classroom / Division</label>
            <select
              value={classroom}
              onChange={e => setClassroom(e.target.value)}
              disabled={!grade}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1' }}
            >
              <option value="">{!grade ? 'Select Grade First' : 'Select Classroom'}</option>
              {classroomsList.map(cr => (
                <option key={cr.id} value={cr.id}>{cr.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>{student ? 'Save Changes' : 'Add Student'}</button>
        </div>
      </div>
    </div>
  );
}

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
        setStudents(DEFAULT_STUDENTS);
      }
    } catch (err) {
      console.error('Failed to fetch children:', err);
      const msg = err.response?.data?.detail?.message || err.response?.data?.message || 'Unable to load children from server.';
      setErrorMsg(msg);
      setStudents(DEFAULT_STUDENTS);
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
        const parts = (form.name || '').trim().split(' ');
        const payload = {
          firstName: parts[0] || 'Student',
          lastName: parts.slice(1).join(' ') || 'User',
          campusId: parseInt(form.campusId || 465, 10) || 465,
          grade: parseInt(form.gradeId || 1, 10) || 1,
          classroom: parseInt(form.classroomId || 101, 10) || 101,
          allergens: [],
          preferredSize: 0
        };
        const res = await addChildApi(payload);
        if (res && res.status === 'success') {
          toast.success('Student added successfully!');
          fetchChildren();
        } else {
          setStudents(prev => [...prev, { ...form, id: Date.now() }]);
          toast.success('Student added!');
        }
      } catch (err) {
        setStudents(prev => [...prev, { ...form, id: Date.now() }]);
        toast.success('Student added!');
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

      {modalOpen && (
        <ChildModal
          student={editStudent}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
};

export default ChildrenPage;
