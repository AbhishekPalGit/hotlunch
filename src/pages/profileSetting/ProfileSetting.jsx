import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getProfileApi, updateProfileApi, changePasswordApi } from '../../services/api';
import { ShimmerProfile } from '../../components/Shimmer';


const ProfileSetting = ({ userName, setUserName }) => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [avatar, setAvatar] = useState(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await getProfileApi();
      if (data) {
        setForm(prev => ({
          ...prev,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
        }));
        if (data.profilePicture) {
          setAvatar(data.profilePicture);
        }
        if (data.firstName || data.lastName) {
          setUserName(`${data.firstName || ''} ${data.lastName || ''}`.trim());
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      return toast.error('First and Last name are required.');
    }

    try {
      // 1. Update Profile Info
      const res = await updateProfileApi({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
      });

      setUserName(`${form.firstName} ${form.lastName}`);
      toast.success('Profile updated successfully!');

      // 2. Change password if filled
      if (form.password) {
        if (form.password !== form.confirmPassword) {
          return toast.error('Passwords do not match.');
        }
        await changePasswordApi({
          newPassword: form.password,
          confirmPassword: form.confirmPassword,
        });
        toast.success('Password updated!');
        setForm(p => ({ ...p, password: '', confirmPassword: '' }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const initials = `${form.firstName[0] || 'T'}${form.lastName[0] || 'P'}`.toUpperCase();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Profile Settings</h1>
        <p className="page-subtitle">Manage your parent account configurations and contact information.</p>
      </div>

      <div className="card" style={{ maxWidth: 760 }}>
        <div className="card-body">
          {loading ? (
            <ShimmerProfile />
          ) : (
            <>
              {/* Avatar */}
              <div className="profile-avatar-area">
                {avatar ? (
                  <img src={avatar} alt="Avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div className="profile-avatar">{initials}</div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <label className="btn-primary" style={{ cursor: 'pointer', padding: '10px 20px', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, borderRadius: 8, background: '#006D77', color: 'white', display: 'inline-block' }}>
                    CHANGE PICTURE
                    <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                  </label>
                  <button
                    className="btn-outline-danger"
                    style={{ fontSize: 12, fontWeight: 600 }}
                    onClick={() => { setAvatar(null); toast.info('Picture deleted.'); }}
                  >
                    DELETE PICTURE
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="form-group">
                  <label>First Name</label>
                  <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="First name" />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Last name" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input name="email" value={form.email} disabled placeholder="email@example.com" style={{ background: '#F3F4F6', cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="(000) 000-0000" />
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>New Password (optional)</label>
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    style={{ position: 'absolute', right: 12, top: 33, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
                  >
                    <i className={`lni ${showPassword ? 'lni-eye-off' : 'lni-eye'}`} />
                  </button>
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Confirm Password</label>
                  <input
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(p => !p)}
                    style={{ position: 'absolute', right: 12, top: 33, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
                  >
                    <i className={`lni ${showConfirm ? 'lni-eye-off' : 'lni-eye'}`} />
                  </button>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', marginBottom: 20 }} />

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-primary" onClick={handleSave}>SAVE CHANGES</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ProfileSetting;
