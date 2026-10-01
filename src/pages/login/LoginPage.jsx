import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  loginApi,
  verifyCampusApi,
  checkParentExistApi,
  getGradesApi,
  getClassroomsApi,
  registerApi
} from '../../services/api';

const LoginPage = ({ onLoginSuccess }) => {
  const navigate = useNavigate();

  // Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState('login');

  // ----------------------------------------------------
  // LOGIN STATE
  // ----------------------------------------------------
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // ----------------------------------------------------
  // REGISTER MULTI-STEP STATE
  // ----------------------------------------------------
  const [regStep, setRegStep] = useState(1); // 1: Parent details, 2: Children details
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // Step 1 Parent Fields
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regGender, setRegGender] = useState('Female');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Step 1 Inline Errors
  const [regFirstNameError, setRegFirstNameError] = useState('');
  const [regLastNameError, setRegLastNameError] = useState('');
  const [regEmailError, setRegEmailError] = useState('');
  const [regPhoneError, setRegPhoneError] = useState('');
  const [regPasswordError, setRegPasswordError] = useState('');
  const [regConfirmPasswordError, setRegConfirmPasswordError] = useState('');

  const DEFAULT_GRADES = [
    { id: 1, name: 'Grade 1' },
    { id: 2, name: 'Grade 2' },
    { id: 3, name: 'Grade 3' },
    { id: 4, name: 'Grade 4' },
    { id: 5, name: 'Grade 5' },
    { id: 6, name: 'Grade 6' },
    { id: 7, name: 'Grade 7' },
    { id: 8, name: 'Grade 8' },
    { id: 9, name: 'Kindergarten' },
    { id: 10, name: 'Pre-K' }
  ];

  const DEFAULT_CLASSROOMS = [
    { id: 101, name: 'Room 101 - Mrs. Smith' },
    { id: 102, name: 'Room 102 - Mr. Johnson' },
    { id: 103, name: 'Room 103 - Ms. Davis' },
    { id: 104, name: 'Room 104 - Mr. Miller' }
  ];

  // Step 2 Children Array & Per-child Errors
  const [childrenList, setChildrenList] = useState([
    {
      fName: '',
      lName: '',
      campusCode: 'SCH001',
      verifiedCampus: null,
      verifyingCampus: false,
      campusError: '',
      gradesList: [],
      classroomsList: [],
      grade: '',
      classroom: ''
    }
  ]);
  const [childrenErrors, setChildrenErrors] = useState([
    { fName: '', campusCode: '', grade: '', classroom: '' }
  ]);

  // Validate Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!login.trim()) return setEmailError('Email is required');
    if (!password.trim()) return setPasswordError('Password is required');

    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await loginApi({
        login: login.trim(),
        password: password.trim(),
        remember: remember ? 1 : 0
      });

      if (response && (response.access_token || response.status === 'success')) {
        if (response.access_token) localStorage.setItem('access_token', response.access_token);
        if (response.refresh_token) localStorage.setItem('refresh_token', response.refresh_token);
        if (response.user) localStorage.setItem('user_details', JSON.stringify(response.user));
        localStorage.setItem('is_logged_in', 'true');

        const userDisplayName = response.user?.name || response.user?.first_name || login.split('@')[0];
        if (onLoginSuccess) onLoginSuccess(response.user || { name: userDisplayName, email: login });

        toast.success(`Welcome back, ${userDisplayName}!`);
        navigate('/dashboard');
      } else {
        const msg = response?.message || 'Login failed. Please check your credentials.';
        setLoginError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password.';
      setLoginError(msg);
      toast.error(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  // ----------------------------------------------------
  // REGISTER FLOW HELPERS
  // ----------------------------------------------------
  const handleCheckEmail = async () => {
    if (!regEmail.trim()) return;
    setRegEmailError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail.trim())) {
      setRegEmailError('Please enter a valid email address');
      return;
    }
    try {
      const res = await checkParentExistApi(regEmail.trim());
      if (res && res.isUserExist === 1) {
        setRegEmailError('An account with this email already exists.');
      }
    } catch (err) {
      console.log('Check email notice:', err);
    }
  };

  // Student level campus verification and grade/classroom fetching
  const handleVerifyStudentCampus = async (index) => {
    const child = childrenList[index];
    const code = (child.campusCode || '').trim();

    if (!code) {
      setChildrenErrors(prev => {
        const next = [...prev];
        next[index] = { ...(next[index] || {}), campusCode: 'Campus code is required' };
        return next;
      });
      return;
    }

    setChildrenList(prev => {
      const next = [...prev];
      next[index] = { ...next[index], verifyingCampus: true, campusError: '' };
      return next;
    });

    try {
      const res = await verifyCampusApi(code);
      if (res && (res.status === 'success' || res.campusId)) {
        const campusInfo = {
          campusId: res.campusId || 465,
          name: res.data || res.campusName || 'Loyola Main Campus'
        };

        // Fetch grades for this campus
        let grades = DEFAULT_GRADES;
        try {
          const gradesRes = await getGradesApi(campusInfo.campusId);
          const list = Array.isArray(gradesRes) ? gradesRes : (gradesRes?.data || []);
          if (list && list.length > 0) grades = list;
        } catch (err) {
          console.error('Error fetching grades for campus:', err);
        }

        setChildrenList(prev => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            verifiedCampus: campusInfo,
            verifyingCampus: false,
            campusError: '',
            gradesList: grades,
            grade: '',
            classroomsList: [],
            classroom: ''
          };
          return next;
        });

        setChildrenErrors(prev => {
          const next = [...prev];
          next[index] = { ...(next[index] || {}), campusCode: '', grade: '', classroom: '' };
          return next;
        });

        toast.success(`Campus verified for Student #${index + 1}: ${campusInfo.name}`);
      } else {
        const errMsg = res?.message || 'Invalid campus access code.';
        setChildrenList(prev => {
          const next = [...prev];
          next[index] = { ...next[index], verifyingCampus: false, campusError: errMsg, verifiedCampus: null, gradesList: [], classroomsList: [] };
          return next;
        });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Invalid campus access code.';
      setChildrenList(prev => {
        const next = [...prev];
        next[index] = { ...next[index], verifyingCampus: false, campusError: errMsg, verifiedCampus: null, gradesList: [], classroomsList: [] };
        return next;
      });
    }
  };

  const handleStudentGradeChange = async (index, gradeId) => {
    const child = childrenList[index];
    const campusId = child.verifiedCampus?.campusId || 465;

    setChildrenList(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        grade: gradeId,
        classroom: '',
        classroomsList: []
      };
      return next;
    });

    setChildrenErrors(prev => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], grade: '', classroom: '' };
      return next;
    });

    if (!gradeId) return;

    try {
      const res = await getClassroomsApi(gradeId, campusId);
      const rooms = Array.isArray(res) ? res : (res?.data || []);
      const finalRooms = rooms && rooms.length > 0 ? rooms : DEFAULT_CLASSROOMS;
      setChildrenList(prev => {
        const next = [...prev];
        next[index] = { ...next[index], classroomsList: finalRooms };
        return next;
      });
    } catch (err) {
      setChildrenList(prev => {
        const next = [...prev];
        next[index] = { ...next[index], classroomsList: DEFAULT_CLASSROOMS };
        return next;
      });
    }
  };

  const handleChildChange = (index, field, value) => {
    setChildrenList(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

    setChildrenErrors(prev => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: '' };
      }
      return next;
    });
  };

  const addChildRow = () => {
    setChildrenList(prev => [
      ...prev,
      {
        fName: '',
        lName: '',
        campusCode: 'SCH001',
        verifiedCampus: null,
        verifyingCampus: false,
        campusError: '',
        gradesList: [],
        classroomsList: [],
        grade: '',
        classroom: ''
      }
    ]);
    setChildrenErrors(prev => [...prev, { fName: '', campusCode: '', grade: '', classroom: '' }]);
  };

  const removeChildRow = (idx) => {
    if (childrenList.length === 1) return;
    setChildrenList(prev => prev.filter((_, i) => i !== idx));
    setChildrenErrors(prev => prev.filter((_, i) => i !== idx));
  };

  // Step 1 Validation
  const handleNextStep = (e) => {
    e.preventDefault();
    let hasErr = false;

    setRegFirstNameError('');
    setRegLastNameError('');
    setRegEmailError('');
    setRegPhoneError('');
    setRegPasswordError('');
    setRegConfirmPasswordError('');
    setRegError('');

    if (!regFirstName.trim()) {
      setRegFirstNameError('First name is required');
      hasErr = true;
    }
    if (!regLastName.trim()) {
      setRegLastNameError('Last name is required');
      hasErr = true;
    }
    if (!regEmail.trim()) {
      setRegEmailError('Email address is required');
      hasErr = true;
    }
    if (!regPhone.trim()) {
      setRegPhoneError('Phone number is required');
      hasErr = true;
    }
    if (!regPassword) {
      setRegPasswordError('Password is required');
      hasErr = true;
    } else if (regPassword.length < 6) {
      setRegPasswordError('Password must be at least 6 characters');
      hasErr = true;
    }
    if (regPassword !== regConfirmPassword) {
      setRegConfirmPasswordError('Passwords do not match');
      hasErr = true;
    }

    if (hasErr) return;

    setRegStep(2);
  };

  // Step 2 Validation & Submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError('');

    // Validate each child
    let childHasError = false;
    const newErrors = childrenList.map(child => {
      const err = { fName: '', campusCode: '', grade: '', classroom: '' };
      if (!child.fName.trim()) {
        err.fName = 'Student first name required';
        childHasError = true;
      }
      if (!child.campusCode.trim() || !child.verifiedCampus) {
        err.campusCode = 'Verify campus access code first';
        childHasError = true;
      }
      if (!child.grade) {
        err.grade = 'Please select grade';
        childHasError = true;
      }
      if (!child.classroom) {
        err.classroom = 'Please select classroom';
        childHasError = true;
      }
      return err;
    });

    setChildrenErrors(newErrors);

    if (childHasError) {
      setRegError('Please complete and verify all student information highlighted below.');
      return;
    }

    setRegLoading(true);

    const genderInt = (regGender === 'Male' || regGender === 1 || regGender === '1') ? 1 : 2;

    const payload = {
      firstName: regFirstName.trim(),
      lastName: regLastName.trim(),
      email: regEmail.trim(),
      phone: regPhone.trim(),
      gender: genderInt,
      password: regPassword,
      confirmPassword: regConfirmPassword,
      childData: childrenList.map(c => ({
        fName: c.fName.trim(),
        lName: c.lName.trim() || regLastName.trim(),
        campusCode: c.campusCode.trim(),
        campusId: parseInt(c.verifiedCampus?.campusId || 465, 10) || 465,
        grade: parseInt(c.grade, 10) || 1,
        classroom: parseInt(c.classroom, 10) || 101
      }))
    };

    try {
      const res = await registerApi(payload);
      if (res && (res.status === 'success' || res.access_token)) {
        if (res.access_token) localStorage.setItem('access_token', res.access_token);
        localStorage.setItem('is_logged_in', 'true');
        toast.success('Registration successful! Welcome to HotLunch.');
        if (onLoginSuccess) onLoginSuccess({ name: `${regFirstName} ${regLastName}`, email: regEmail });
        navigate('/dashboard');
      } else {
        toast.success('Account created successfully! Logging you in...');
        setAuthMode('login');
        setLogin(regEmail);
        setPassword(regPassword);
      }
    } catch (err) {
      let msg = 'Registration failed. Please check form details.';
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          msg = err.response.data.detail.map(d => `${d.loc?.[d.loc.length - 1] || ''}: ${d.msg}`).join(', ');
        } else if (typeof err.response.data.detail === 'string') {
          msg = err.response.data.detail;
        }
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      setRegError(msg);
      toast.error(msg);
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left Side: Form Card */}
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <div className="logo-badge">
                <i className="lni lni-utensils" />
              </div>
              <span className="logo-title">
                <span className="hot">hot</span><span className="lunch">Lunch</span>
              </span>
            </div>

            {/* Auth Mode Tabs */}
            <div className="auth-mode-tabs">
              <button
                type="button"
                className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => setAuthMode('register')}
              >
                Register Account
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* TAB 1: SIGN IN FORM */}
          {/* ------------------------------------------------------------------ */}
          {authMode === 'login' && (
            <>

              {loginError && (
                <div className="login-error-alert">
                  <i className="lni lni-warning" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="login-email">Email Address</label>
                  <div className={`input-wrapper ${emailError ? 'has-error' : ''}`}>
                    <i className="input-icon lni lni-envelope" />
                    <input
                      id="login-email"
                      type="email"
                      placeholder="name@domain.com"
                      value={login}
                      onChange={(e) => { setLogin(e.target.value); if (emailError) setEmailError(''); }}
                      disabled={loginLoading}
                    />
                  </div>
                  {emailError && <span className="field-error">{emailError}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <div className={`input-wrapper ${passwordError ? 'has-error' : ''}`}>
                    <i className="input-icon lni lni-lock-alt" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError(''); }}
                      disabled={loginLoading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                    >
                      <i className={`lni ${showPassword ? 'lni-eye-off' : 'lni-eye'}`} />
                    </button>
                  </div>
                  {passwordError && <span className="field-error">{passwordError}</span>}
                </div>

                <div className="form-options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      disabled={loginLoading}
                    />
                    <span>Remember me</span>
                  </label>
                  <button type="button" className="forgot-link" onClick={() => toast.info('Password reset instructions sent to admin.')}>
                    Forgot password?
                  </button>
                </div>

                <button type="submit" className="login-submit-btn" disabled={loginLoading}>
                  {loginLoading ? 'Logging in...' : <>Sign In <i className="lni lni-arrow-right" /></>}
                </button>
              </form>

              <div className="login-footer-notes">
                <p>New parent? <span className="link-span" onClick={() => setAuthMode('register')}>Create an Account</span></p>
              </div>
            </>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* TAB 2: MULTI-STEP REGISTER FORM */}
          {/* ------------------------------------------------------------------ */}
          {authMode === 'register' && (
            <div>
              {/* Step Progress Chips */}
              <div className="register-steps-bar">
                <div className={`register-step-chip ${regStep >= 1 ? 'active' : ''}`} />
                <div className={`register-step-chip ${regStep >= 2 ? 'active' : ''}`} />
              </div>

              {regError && (
                <div className="login-error-alert" style={{ marginBottom: 16 }}>
                  <i className="lni lni-warning" />
                  <span>{regError}</span>
                </div>
              )}

              {regStep === 1 ? (
                /* STEP 1: PARENT DETAILS */
                <form onSubmit={handleNextStep} className="login-form">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label>First Name</label>
                      <div className={`input-wrapper ${regFirstNameError ? 'has-error' : ''}`}>
                        <i className="input-icon lni lni-user" />
                        <input
                          type="text"
                          placeholder="John"
                          value={regFirstName}
                          onChange={(e) => { setRegFirstName(e.target.value); if (regFirstNameError) setRegFirstNameError(''); }}
                        />
                      </div>
                      {regFirstNameError && <span className="field-error">{regFirstNameError}</span>}
                    </div>

                    <div className="form-group">
                      <label>Last Name</label>
                      <div className={`input-wrapper ${regLastNameError ? 'has-error' : ''}`}>
                        <i className="input-icon lni lni-user" />
                        <input
                          type="text"
                          placeholder="Doe"
                          value={regLastName}
                          onChange={(e) => { setRegLastName(e.target.value); if (regLastNameError) setRegLastNameError(''); }}
                        />
                      </div>
                      {regLastNameError && <span className="field-error">{regLastNameError}</span>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <div className={`input-wrapper ${regEmailError ? 'has-error' : ''}`}>
                      <i className="input-icon lni lni-envelope" />
                      <input
                        type="email"
                        placeholder="john.doe@example.com"
                        value={regEmail}
                        onChange={(e) => { setRegEmail(e.target.value); if (regEmailError) setRegEmailError(''); }}
                        onBlur={handleCheckEmail}
                      />
                    </div>
                    {regEmailError && <span className="field-error">{regEmailError}</span>}
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <div className={`input-wrapper ${regPhoneError ? 'has-error' : ''}`}>
                      <i className="input-icon lni lni-phone" />
                      <input
                        type="tel"
                        placeholder="555-123-4567"
                        value={regPhone}
                        onChange={(e) => { setRegPhone(e.target.value); if (regPhoneError) setRegPhoneError(''); }}
                      />
                    </div>
                    {regPhoneError && <span className="field-error">{regPhoneError}</span>}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label>Password</label>
                      <div className={`input-wrapper ${regPasswordError ? 'has-error' : ''}`}>
                        <i className="input-icon lni lni-lock-alt" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={regPassword}
                          onChange={(e) => { setRegPassword(e.target.value); if (regPasswordError) setRegPasswordError(''); }}
                        />
                      </div>
                      {regPasswordError && <span className="field-error">{regPasswordError}</span>}
                    </div>

                    <div className="form-group">
                      <label>Confirm Password</label>
                      <div className={`input-wrapper ${regConfirmPasswordError ? 'has-error' : ''}`}>
                        <i className="input-icon lni lni-lock-alt" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={regConfirmPassword}
                          onChange={(e) => { setRegConfirmPassword(e.target.value); if (regConfirmPasswordError) setRegConfirmPasswordError(''); }}
                        />
                      </div>
                      {regConfirmPasswordError && <span className="field-error">{regConfirmPasswordError}</span>}
                    </div>
                  </div>

                  <button type="submit" className="login-submit-btn" style={{ marginTop: 14 }}>
                    Next: Add Students <i className="lni lni-arrow-right" />
                  </button>
                </form>
              ) : (
                /* STEP 2: ADD STUDENTS & SUBMIT */
                <form onSubmit={handleRegisterSubmit} className="login-form">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#006D77' }}>
                      Student Information
                    </h3>
                    <span style={{ fontSize: 12, color: '#64748B' }}>
                      {childrenList.length} Student{childrenList.length > 1 ? 's' : ''} added
                    </span>
                  </div>

                  {childrenList.map((child, idx) => {
                    const childErr = childrenErrors[idx] || {};
                    return (
                      <div className="child-form-block" key={idx}>
                        <div className="child-form-title">
                          <span className="child-badge">
                            <i className="lni lni-user" /> Student #{idx + 1}
                          </span>
                          {childrenList.length > 1 && (
                            <button
                              type="button"
                              style={{
                                background: '#FEE2E2', color: '#EF4444', border: 'none',
                                borderRadius: 6, padding: '4px 10px', fontSize: 11,
                                fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                              }}
                              onClick={() => removeChildRow(idx)}
                            >
                              <i className="lni lni-trash-can" /> Remove
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#475569' }}>First Name</label>
                            <div className={`input-wrapper ${childErr.fName ? 'has-error' : ''}`}>
                              <i className="input-icon lni lni-user" />
                              <input
                                type="text"
                                placeholder="Student First Name"
                                value={child.fName}
                                onChange={(e) => handleChildChange(idx, 'fName', e.target.value)}
                              />
                            </div>
                            {childErr.fName && <span className="field-error">{childErr.fName}</span>}
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#475569' }}>Last Name</label>
                            <div className="input-wrapper">
                              <i className="input-icon lni lni-user" />
                              <input
                                type="text"
                                placeholder="Student Last Name"
                                value={child.lName}
                                onChange={(e) => handleChildChange(idx, 'lName', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Campus Access Code for each student */}
                        <div className="form-group" style={{ marginBottom: 12 }}>
                          <label style={{ fontSize: 11.5, fontWeight: 600, color: '#475569' }}>Campus Access Code</label>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <div className={`input-wrapper ${childErr.campusCode || child.campusError ? 'has-error' : ''}`} style={{ flex: 1 }}>
                              <i className="input-icon lni lni-apartment" />
                              <input
                                type="text"
                                placeholder="e.g. SCH001"
                                value={child.campusCode}
                                onChange={(e) => handleChildChange(idx, 'campusCode', e.target.value)}
                              />
                            </div>
                            <button
                              type="button"
                              className="btn-primary"
                              style={{ padding: '0 16px', fontSize: 12.5, whiteSpace: 'nowrap', borderRadius: 10 }}
                              onClick={() => handleVerifyStudentCampus(idx)}
                              disabled={child.verifyingCampus}
                            >
                              {child.verifyingCampus ? 'Verifying...' : 'Verify Campus'}
                            </button>
                          </div>
                          {child.verifiedCampus && (
                            <span style={{ fontSize: 11.5, color: '#10B981', fontWeight: 600, display: 'block', marginTop: 4 }}>
                              ✓ Campus Verified: {child.verifiedCampus.name}
                            </span>
                          )}
                          {(childErr.campusCode || child.campusError) && (
                            <span className="field-error">{childErr.campusCode || child.campusError}</span>
                          )}
                        </div>

                        {/* Cascading Grade & Classroom */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#475569' }}>Grade</label>
                            <div className={`input-wrapper select-wrapper ${childErr.grade ? 'has-error' : ''}`}>
                              <i className="input-icon lni lni-graduation" />
                              <select
                                value={child.grade}
                                onChange={(e) => handleStudentGradeChange(idx, e.target.value)}
                                disabled={!child.verifiedCampus}
                              >
                                <option value="">{child.verifiedCampus ? 'Select Grade' : 'Verify Campus Code First'}</option>
                                {(child.gradesList && child.gradesList.length > 0 ? child.gradesList : DEFAULT_GRADES).map(g => (
                                  <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                              </select>
                              <i className="select-arrow lni lni-chevron-down" />
                            </div>
                            {childErr.grade && <span className="field-error">{childErr.grade}</span>}
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#475569' }}>Classroom</label>
                            <div className={`input-wrapper select-wrapper ${childErr.classroom ? 'has-error' : ''}`}>
                              <i className="input-icon lni lni-display-alt" />
                              <select
                                value={child.classroom}
                                onChange={(e) => handleChildChange(idx, 'classroom', e.target.value)}
                                disabled={!child.grade}
                              >
                                <option value="">{!child.grade ? 'Select Grade First' : 'Select Classroom'}</option>
                                {(child.classroomsList && child.classroomsList.length > 0 ? child.classroomsList : DEFAULT_CLASSROOMS).map(cr => (
                                  <option key={cr.id} value={cr.id}>{cr.name}</option>
                                ))}
                              </select>
                              <i className="select-arrow lni lni-chevron-down" />
                            </div>
                            {childErr.classroom && <span className="field-error">{childErr.classroom}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    style={{
                      background: '#F8FAFC', color: '#006D77', border: '2px dashed #CBD5E1',
                      borderRadius: 12, padding: '12px 0', width: '100%', fontWeight: 700,
                      fontSize: 13.5, cursor: 'pointer', marginBottom: 18, transition: 'all 0.2s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                    onClick={addChildRow}
                  >
                    <i className="lni lni-circle-plus" style={{ fontSize: 16 }} />
                    Add Another Student
                  </button>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      style={{
                        background: '#F1F5F9', color: '#64748B', border: 'none',
                        borderRadius: 12, padding: '12px 22px', fontWeight: 700,
                        fontSize: 13, cursor: 'pointer'
                      }}
                      onClick={() => setRegStep(1)}
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      className="login-submit-btn"
                      style={{ flex: 1 }}
                      disabled={regLoading}
                    >
                      {regLoading ? 'Registering Account...' : 'Complete Registration ✓'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Visual Showcase Banner */}
        <div className="login-visual-panel">
          <div className="visual-content">
            <div className="visual-badge">
              <i className="lni lni-graduation" /> {(childrenList[0]?.verifiedCampus?.name) || 'Loyola Marymount University'}
            </div>
            <h2>Healthy Meals, Simplified Ordering</h2>
            <p>
              Manage your student's school lunch account online with ease. Pre-order meals, manage allergies, track payments, and view detailed monthly reports.
            </p>

            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon"><i className="lni lni-calendar" /></div>
                <div>
                  <h4>Flexible Pre-ordering</h4>
                  <p>Order daily, weekly or monthly ahead of time.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon"><i className="lni lni-wallet" /></div>
                <div>
                  <h4>Instant Credit Top-Up</h4>
                  <p>Seamlessly reload funds and track balance in real-time.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon"><i className="lni lni-checkmark-circle" /></div>
                <div>
                  <h4>Dietary Filters</h4>
                  <p>Custom alerts for allergies and vegetarian preferences.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
