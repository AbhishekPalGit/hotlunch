import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { verifyCampusApi, getGradesApi, getClassroomsApi } from '../services/api';

export const ALLERGENS_LIST = [
  // Column 1
  'Milk',
  'Wheat',
  'Soy',
  'Egg',
  // Column 2
  'Peanut',
  'Treenut',
  'Fish',
  'Shellfish',
  // Column 3
  'Gluten',
  'Sesame',
  'Mustard',
  'Other'
];

export default function CreateChildModal({
  isOpen,
  onClose,
  student = null,
  onSave
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [campusCode, setCampusCode] = useState('');
  const [verifiedCampus, setVerifiedCampus] = useState(null);
  const [verifyingCampus, setVerifyingCampus] = useState(false);
  const [campusError, setCampusError] = useState('');

  const [gradesList, setGradesList] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  const [classroomsList, setClassroomsList] = useState([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);

  const [grade, setGrade] = useState('');
  const [classroom, setClassroom] = useState('');
  const [preferredSize, setPreferredSize] = useState('Regular'); // 'Regular' | 'Small' | 'Large'
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debounceTimerRef = useRef(null);

  // Initialize or reset form state when opened
  useEffect(() => {
    if (isOpen) {
      if (student) {
        const parts = (student.name || '').trim().split(' ');
        setFirstName(student.firstName || parts[0] || '');
        setLastName(student.lastName || parts.slice(1).join(' ') || '');
        setCampusCode(student.campusCode || student.campus || '');
        setPreferredSize(student.preferredSize || student.size || 'Regular');
        
        let initialAllergens = [];
        if (Array.isArray(student.allergens)) {
          initialAllergens = student.allergens;
        } else if (typeof student.allergens === 'string' && student.allergens && student.allergens !== '--') {
          initialAllergens = student.allergens.split(',').map(s => s.trim()).filter(Boolean);
        }
        setSelectedAllergens(initialAllergens);

        const cId = student.campusId || 465;
        const cName = student.campus || 'Verified Campus';
        setVerifiedCampus({ name: cName, campusId: cId });

        // Load grades and classrooms in sequence
        loadCascadeForCampus(cId, student.gradeId || student.grade, student.classroomId || student.classroom);
      } else {
        // Reset form for new child
        setFirstName('');
        setLastName('');
        setCampusCode('');
        setVerifiedCampus(null);
        setCampusError('');
        setGradesList([]);
        setClassroomsList([]);
        setGrade('');
        setClassroom('');
        setPreferredSize('Regular');
        setSelectedAllergens([]);
      }
    }
  }, [isOpen, student]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Cascading loader: verify campus -> fetch grades -> fetch classrooms
  const loadCascadeForCampus = async (campusId, preferredGradeId = null, preferredClassroomId = null) => {
    setLoadingGrades(true);
    setLoadingClassrooms(true);
    try {
      // Step 2: Call Grades API on the basis of verified campusId
      const gRes = await getGradesApi(campusId);
      let glist = [];
      if (gRes && gRes.status === 'success' && Array.isArray(gRes.data)) {
        glist = gRes.data;
      } else if (Array.isArray(gRes?.data)) {
        glist = gRes.data;
      } else if (Array.isArray(gRes)) {
        glist = gRes;
      }
      setGradesList(glist);

      let targetGradeId = preferredGradeId;
      if (!targetGradeId && glist.length > 0) {
        targetGradeId = glist[0].id;
      }
      if (targetGradeId) {
        setGrade(String(targetGradeId));
      }

      // Step 3: Call Classroom API on the basis of selected grade and campusId
      let clist = [];
      if (targetGradeId) {
        try {
          const cRes = await getClassroomsApi(targetGradeId, campusId);
          if (cRes && cRes.status === 'success' && Array.isArray(cRes.data)) {
            clist = cRes.data;
          } else if (Array.isArray(cRes?.data)) {
            clist = cRes.data;
          } else if (Array.isArray(cRes)) {
            clist = cRes;
          }
        } catch (cErr) {
          console.log('Grade classrooms error, falling back:', cErr);
        }
      }

      // Fallback: If no classrooms found for grade, fetch all classrooms for campus
      if (clist.length === 0) {
        try {
          const cResAll = await getClassroomsApi('', campusId);
          if (cResAll && cResAll.status === 'success' && Array.isArray(cResAll.data)) {
            clist = cResAll.data;
          } else if (Array.isArray(cResAll?.data)) {
            clist = cResAll.data;
          }
        } catch (e) {
          // ignore
        }
      }

      setClassroomsList(clist);
      let targetRoomId = preferredClassroomId;
      if (!targetRoomId && clist.length > 0) {
        targetRoomId = clist[0].id;
      }
      if (targetRoomId) {
        setClassroom(String(targetRoomId));
      }
    } catch (err) {
      console.error('Cascade loading error:', err);
    } finally {
      setLoadingGrades(false);
      setLoadingClassrooms(false);
    }
  };

  // Step 1: Call verify-campus API
  const handleVerifyCampus = async (overrideCode = null) => {
    const codeToVerify = (overrideCode !== null ? overrideCode : campusCode).trim();
    if (!codeToVerify) {
      setCampusError('Campus code is required');
      return;
    }

    setVerifyingCampus(true);
    setCampusError('');
    try {
      const res = await verifyCampusApi(codeToVerify);
      if (res && (res.status === 'success' || res.campusId || res.data)) {
        const cid = parseInt(
          res.campusId ??
          res.campus_id ??
          res.data?.campusId ??
          res.data?.campus_id ??
          res.data?.id ??
          res.id ??
          (!isNaN(parseInt(codeToVerify, 10)) ? codeToVerify : 465),
          10
        ) || 465;

        const cName = (typeof res.data === 'string' ? res.data : (res.data?.name || res.data?.campusName))
          || res.campusName
          || 'Verified Campus';

        const campusInfo = { campusId: cid, name: cName };
        setVerifiedCampus(campusInfo);
        toast.success(`Campus verified: ${campusInfo.name}`);

        // Automatically trigger Step 2 & 3: grades and classrooms
        await loadCascadeForCampus(cid);
      } else {
        setCampusError(res?.message || 'Invalid campus code');
        setVerifiedCampus(null);
        setGradesList([]);
        setClassroomsList([]);
        setGrade('');
        setClassroom('');
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail?.message || err.response?.data?.message || 'Invalid campus code';
      setCampusError(errMsg);
      setVerifiedCampus(null);
      setGradesList([]);
      setClassroomsList([]);
      setGrade('');
      setClassroom('');
    } finally {
      setVerifyingCampus(false);
    }
  };

  // Handle typing in campus code with debounced auto-verify
  const handleCampusCodeChange = (e) => {
    const val = e.target.value;
    setCampusCode(val);
    if (campusError) setCampusError('');
    if (verifiedCampus) {
      setVerifiedCampus(null);
      setGradesList([]);
      setClassroomsList([]);
      setGrade('');
      setClassroom('');
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (val.trim().length >= 3) {
      debounceTimerRef.current = setTimeout(() => {
        handleVerifyCampus(val);
      }, 700);
    }
  };

  // Step 2 & 3 when parent manually changes Grade: fetch corresponding classrooms
  const handleGradeChange = async (selectedGradeId) => {
    setGrade(selectedGradeId);
    setClassroom('');
    if (!selectedGradeId) {
      setClassroomsList([]);
      return;
    }

    const cid = verifiedCampus?.campusId || 465;
    setLoadingClassrooms(true);
    try {
      const cRes = await getClassroomsApi(selectedGradeId, cid);
      let clist = [];
      if (cRes && cRes.status === 'success' && Array.isArray(cRes.data)) {
        clist = cRes.data;
      } else if (Array.isArray(cRes?.data)) {
        clist = cRes.data;
      } else if (Array.isArray(cRes)) {
        clist = cRes;
      }

      // If empty for this grade, fetch all classrooms for campus as fallback
      if (clist.length === 0) {
        const cResAll = await getClassroomsApi('', cid);
        if (cResAll && cResAll.status === 'success' && Array.isArray(cResAll.data)) {
          clist = cResAll.data;
        } else if (Array.isArray(cResAll?.data)) {
          clist = cResAll.data;
        }
      }

      setClassroomsList(clist);
      if (clist.length > 0) {
        setClassroom(String(clist[0].id));
      }
    } catch (e) {
      console.error('Error fetching classrooms for grade:', e);
    } finally {
      setLoadingClassrooms(false);
    }
  };

  const toggleAllergen = (name) => {
    setSelectedAllergens(prev => {
      const exists = prev.includes(name);
      return exists ? prev.filter(a => a !== name) : [...prev, name];
    });
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!firstName.trim()) return toast.error('First Name is required');
    if (!lastName.trim()) return toast.error('Last Name is required');
    if (!campusCode.trim() && !verifiedCampus) return toast.error('Campus Code is required');

    setIsSubmitting(true);
    try {
      const selectedGradeObj = gradesList.find(g => String(g.id) === String(grade)) || { name: grade || '1' };
      const selectedRoomObj = classroomsList.find(c => String(c.id) === String(classroom)) || { name: classroom || '1' };
      
      const sizeValue = preferredSize === 'Small' ? 1 : (preferredSize === 'Large' ? 2 : 0);

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`,
        campusCode: campusCode.trim(),
        campus: verifiedCampus?.name || campusCode.trim(),
        campusId: verifiedCampus?.campusId || 465,
        grade: selectedGradeObj.name || grade || '1',
        gradeId: grade || 1,
        classroom: selectedRoomObj.name || classroom || '1',
        classroomId: classroom || 1,
        preferredSize: sizeValue,
        size: preferredSize,
        allergens: selectedAllergens
      };

      if (onSave) {
        await onSave(payload);
      }
      onClose();
    } catch (err) {
      console.error('Save child error:', err);
      toast.error('Failed to save child.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Split allergens into 3 equal columns of 4
  const col1 = ALLERGENS_LIST.slice(0, 4);
  const col2 = ALLERGENS_LIST.slice(4, 8);
  const col3 = ALLERGENS_LIST.slice(8, 12);

  return (
    <div className="create-child-modal-overlay" onClick={onClose}>
      <div className="create-child-modal-card" onClick={e => e.stopPropagation()}>
        <h2 className="create-child-title">
          {student ? 'Edit Child' : 'Create Child'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Row 1: First Name & Last Name */}
          <div className="create-child-row-2col">
            <div className="create-child-field">
              <label className="create-child-label">First Name</label>
              <input
                type="text"
                className="create-child-input"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder=""
                autoFocus
              />
            </div>

            <div className="create-child-field">
              <label className="create-child-label">Last Name</label>
              <input
                type="text"
                className="create-child-input"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder=""
              />
            </div>
          </div>

          {/* Row 2: Campus Code, Grade, Classroom/Division */}
          <div className="create-child-row-3col">
            {/* Campus Code with inline verify button */}
            <div className="create-child-field campus-field">
              <label className="create-child-label">Campus Code</label>
              <div className="campus-input-wrapper">
                <input
                  type="text"
                  className={`create-child-input ${verifiedCampus ? 'is-verified' : ''}`}
                  value={campusCode}
                  onChange={handleCampusCodeChange}
                  onBlur={() => {
                    if (campusCode.trim() && !verifiedCampus && !verifyingCampus) {
                      handleVerifyCampus();
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleVerifyCampus();
                    }
                  }}
                  placeholder=""
                />
                <button
                  type="button"
                  className={`campus-verify-circle-btn ${verifiedCampus ? 'verified' : ''}`}
                  onClick={() => handleVerifyCampus()}
                  disabled={verifyingCampus}
                  title={verifiedCampus ? `Verified: ${verifiedCampus.name}` : 'Verify Campus Code'}
                >
                  {verifyingCampus ? (
                    <span className="verify-spin">↻</span>
                  ) : (
                    <i className="lni lni-checkmark" />
                  )}
                </button>
              </div>
              {campusError && (
                <span className="create-child-error">{campusError}</span>
              )}
              {verifiedCampus && (
                <span className="create-child-success">✓ {verifiedCampus.name}</span>
              )}
            </div>

            {/* Grade */}
            <div className="create-child-field">
              <label className="create-child-label">Grade</label>
              <select
                className="create-child-select"
                value={grade}
                onChange={e => handleGradeChange(e.target.value)}
                disabled={!verifiedCampus || loadingGrades}
              >
                {!verifiedCampus ? (
                  <option value="">Verify campus first</option>
                ) : loadingGrades ? (
                  <option value="">Loading grades...</option>
                ) : gradesList.length === 0 ? (
                  <option value="">No grades found</option>
                ) : (
                  <>
                    <option value="" disabled>Select Grade</option>
                    {gradesList.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Classroom/Division */}
            <div className="create-child-field">
              <label className="create-child-label">Classroom/Division</label>
              <select
                className="create-child-select"
                value={classroom}
                onChange={e => setClassroom(e.target.value)}
                disabled={!grade || loadingClassrooms}
              >
                {!verifiedCampus ? (
                  <option value="">Verify campus first</option>
                ) : !grade ? (
                  <option value="">Select grade first</option>
                ) : loadingClassrooms ? (
                  <option value="">Loading classrooms...</option>
                ) : classroomsList.length === 0 ? (
                  <option value="">Default Classroom</option>
                ) : (
                  <>
                    <option value="" disabled>Select Classroom</option>
                    {classroomsList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Row 3: Preferred Size */}
          <div className="create-child-size-row">
            <span className="create-child-size-label">Preferred Size</span>
            <div className="create-child-radio-group">
              {['Regular', 'Small', 'Large'].map(size => (
                <label className="create-child-radio-label" key={size}>
                  <input
                    type="radio"
                    name="preferredSize"
                    value={size}
                    checked={preferredSize === size}
                    onChange={() => setPreferredSize(size)}
                  />
                  <span>{size}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Row 4: Alergens (3 Columns of Checkboxes) */}
          <div className="create-child-allergens-section">
            <div className="create-child-allergens-title">Alergens</div>
            <div className="create-child-allergens-grid">
              {/* Column 1 */}
              <div className="create-child-allergens-col">
                {col1.map(allergen => {
                  const isChecked = selectedAllergens.includes(allergen);
                  return (
                    <div
                      className="create-child-checkbox-item"
                      key={allergen}
                      onClick={() => toggleAllergen(allergen)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                      />
                      <span>{allergen}</span>
                    </div>
                  );
                })}
              </div>

              {/* Column 2 */}
              <div className="create-child-allergens-col">
                {col2.map(allergen => {
                  const isChecked = selectedAllergens.includes(allergen);
                  return (
                    <div
                      className="create-child-checkbox-item"
                      key={allergen}
                      onClick={() => toggleAllergen(allergen)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                      />
                      <span>{allergen}</span>
                    </div>
                  );
                })}
              </div>

              {/* Column 3 */}
              <div className="create-child-allergens-col">
                {col3.map(allergen => {
                  const isChecked = selectedAllergens.includes(allergen);
                  return (
                    <div
                      className="create-child-checkbox-item"
                      key={allergen}
                      onClick={() => toggleAllergen(allergen)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                      />
                      <span>{allergen}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Warning Message in red */}
          <div className="create-child-warning-text">
            IF YOUR CHILD HAS A FOOD ALLERGY PLEASE MAKE YOUR FOOD SERVICE PROVIDER AWARE
          </div>

          {/* Modal Footer Actions */}
          <div className="create-child-modal-footer">
            <button
              type="button"
              className="btn-create-child-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="btn-create-child-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'SAVING...' : (student ? 'SAVE' : 'CREATE')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
