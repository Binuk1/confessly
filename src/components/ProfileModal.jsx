import { useState, useEffect } from 'react';
import { FaTimes, FaEdit, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaSave, FaCamera } from 'react-icons/fa';
import './ProfileModal.css';

function ProfileModal({ user, onClose, onUpdateProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    birthday: '',
    avatar: null
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: user.displayName || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
        bio: user.bio || '',
        birthday: user.birthday || '',
        avatar: user.avatar || null
      });
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileData(prev => ({
          ...prev,
          avatar: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onUpdateProfile(profileData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h2>{isEditing ? 'Edit Profile' : 'Profile'}</h2>
          <div className="profile-modal-actions">
            {!isEditing && (
              <button
                className="profile-edit-btn"
                onClick={() => setIsEditing(true)}
                title="Edit Profile"
              >
                <FaEdit />
              </button>
            )}
            <button
              className="profile-close-btn"
              onClick={onClose}
              title="Close"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="profile-modal-content">
          {/* Avatar Section */}
          <div className="profile-avatar-section">
            <div className="profile-avatar-container">
              {profileData.avatar ? (
                <img src={profileData.avatar} alt="Profile" className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar-placeholder">
                  {profileData.displayName ? getInitials(profileData.displayName) : <FaUser />}
                </div>
              )}
              {isEditing && (
                <label className="profile-avatar-upload">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    hidden
                  />
                  <FaCamera />
                </label>
              )}
            </div>
          </div>

          {/* Profile Information */}
          <div className="profile-info-section">
            <div className="profile-field">
              <label>
                <FaUser className="profile-field-icon" />
                Display Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="Enter your display name"
                />
              ) : (
                <span className="profile-field-value">
                  {profileData.displayName || 'Not specified'}
                </span>
              )}
            </div>

            <div className="profile-field">
              <label>
                <FaEnvelope className="profile-field-icon" />
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email"
                />
              ) : (
                <span className="profile-field-value">
                  {profileData.email || 'Not specified'}
                </span>
              )}
            </div>

            <div className="profile-field">
              <label>
                <FaPhone className="profile-field-icon" />
                Phone
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter your phone number"
                />
              ) : (
                <span className="profile-field-value">
                  {profileData.phone || 'Not specified'}
                </span>
              )}
            </div>

            <div className="profile-field">
              <label>
                <FaMapMarkerAlt className="profile-field-icon" />
                Location
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Enter your location"
                />
              ) : (
                <span className="profile-field-value">
                  {profileData.location || 'Not specified'}
                </span>
              )}
            </div>

            <div className="profile-field">
              <label>
                <FaCalendarAlt className="profile-field-icon" />
                Birthday
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={profileData.birthday}
                  onChange={(e) => handleInputChange('birthday', e.target.value)}
                />
              ) : (
                <span className="profile-field-value">
                  {profileData.birthday ? new Date(profileData.birthday).toLocaleDateString() : 'Not specified'}
                </span>
              )}
            </div>

            <div className="profile-field profile-bio-field">
              <label>
                About Me
              </label>
              {isEditing ? (
                <textarea
                  value={profileData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              ) : (
                <span className="profile-field-value profile-bio-value">
                  {profileData.bio || 'No bio added yet'}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="profile-actions">
              <button
                className="profile-cancel-btn"
                onClick={() => {
                  setIsEditing(false);
                  setProfileData({
                    displayName: user?.displayName || '',
                    email: user?.email || '',
                    phone: user?.phone || '',
                    location: user?.location || '',
                    bio: user?.bio || '',
                    birthday: user?.birthday || '',
                    avatar: user?.avatar || null
                  });
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="profile-save-btn"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <div className="profile-spinner"></div>
                ) : (
                  <>
                    <FaSave />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;