import React, { useState } from 'react';

const ProfileSettings = ({ userName, setUserName }) => {
  const [firstName, setFirstName] = useState('Test Parent');
  const [lastName, setLastName] = useState('Account');
  const [email, setEmail] = useState('testparentaccount2023@gmail.com');
  const [phone, setPhone] = useState('(023) 456-7890');
  const [password, setPassword] = useState('••••••••');
  const [confirmPassword, setConfirmPassword] = useState('••••••••');

  const handleSave = (e) => {
    e.preventDefault();
    setUserName(`${firstName} ${lastName}`);
    alert('Profile settings saved successfully!');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Profile Settings</h2>
        <p className="text-muted">Manage your parent account configurations and contact information.</p>
      </div>

      <div className="card" style={styles.formCard}>
        {/* Profile Pic Section */}
        <div style={styles.avatarSection}>
          <div style={styles.avatarCircle}>TP</div>
          <div style={styles.avatarActions}>
            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => alert('Choose photo upload')}>
              CHANGE PICTURE
            </button>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--error)' }} onClick={() => alert('Remove photo')}>
              DELETE PICTURE
            </button>
          </div>
        </div>

        {/* Info Edit Form */}
        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.formGrid}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input 
                type="text" 
                className="form-control" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input 
                type="text" 
                className="form-control" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input 
                type="email" 
                className="form-control" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <input 
                type="text" 
                className="form-control" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-control" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input 
                type="password" 
                className="form-control" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div style={styles.actionRow}>
            <button type="submit" className="btn btn-primary" style={styles.saveBtn}>
              SAVE CHANGES
            </button>
          </div>
        </form>
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
  formCard: {
    backgroundColor: '#ffffff',
    maxWidth: '750px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  avatarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '20px'
  },
  avatarCircle: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '22px'
  },
  avatarActions: {
    display: 'flex',
    gap: '10px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    flexWrap: 'wrap'
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    borderTop: '1px solid var(--border)',
    paddingTop: '20px'
  },
  saveBtn: {
    padding: '10px 24px'
  }
};

export default ProfileSettings;
