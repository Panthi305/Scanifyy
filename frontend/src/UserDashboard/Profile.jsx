import React, { useState, useEffect } from "react";
import "./Profile.css";

const Profile = () => {
  const [user, setUser] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to view your profile.');
        return;
      }
      const response = await fetch('http://localhost:5000/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setFormData(data);
        setAvatarPreview(data.avatar);
        if (!data.profile_completed) {
          setIsEditing(true);
        }
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          const responseText = await response.text();
          errorData = {
            message: `Unexpected response (status: ${response.status}): ${responseText.slice(0, 200)}`,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
          };
        }
        console.error('Failed to fetch user:', errorData);
        alert(`Failed to fetch profile: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      alert('Error fetching profile. Check the console for details.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (['monthly_budget', 'yearly_budget'].includes(name)) {
      setFormData({ ...formData, [name]: value ? parseFloat(value) : 0 });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // New handler to convert budgets on currency change
  const handleCurrencyChange = async (e) => {
    const newCurrency = e.target.value;
    if (newCurrency === formData.default_currency) {
      // Same currency, just update state normally
      handleChange(e);
      return;
    }

    setFormData(prev => ({ ...prev, default_currency: newCurrency }));

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication token missing. Please log in again.');
        return;
      }
      // Convert monthly budget
      const monthlyRes = await fetch('http://localhost:5000/api/users/convert-currency', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from_currency: formData.default_currency,
          to_currency: newCurrency,
          amount: formData.monthly_budget || 0
        })
      });
      const monthlyData = await monthlyRes.json();

      // Convert yearly budget
      const yearlyRes = await fetch('http://localhost:5000/api/users/convert-currency', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from_currency: formData.default_currency,
          to_currency: newCurrency,
          amount: formData.yearly_budget || 0
        })
      });
      const yearlyData = await yearlyRes.json();

      // Update form data with converted amounts and new currency
      setFormData(prev => ({
        ...prev,
        default_currency: newCurrency,
        monthly_budget: Number(monthlyData.converted.toFixed(2)),
        yearly_budget: Number(yearlyData.converted.toFixed(2))
      }));
    } catch (err) {
      alert('Currency conversion failed. Please try again.');
      console.error('Currency conversion error:', err);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        alert('Please upload a valid image (JPEG, PNG, or GIF).');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size must be less than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result;
        setFormData({ ...formData, avatar: base64Image });
        setAvatarPreview(base64Image);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      notifications: { ...formData.notifications, [name]: checked },
    });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication token missing. Please log in again.');
        return;
      }
      const dataToSend = { ...formData };
      if (dataToSend.avatar && !dataToSend.avatar.startsWith('data:image/') && dataToSend.avatar !== 'https://i.pravatar.cc/150?img=12') {
        console.warn('Invalid avatar format, excluding from update:', dataToSend.avatar);
        delete dataToSend.avatar;
      }
      const response = await fetch('http://localhost:5000/api/users/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });
      if (response.ok) {
        await fetchUser();
        setIsEditing(false);
        setAvatarPreview(null);
        alert('Profile updated successfully!');
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          const responseText = await response.text();
          errorData = {
            message: `Unexpected response (status: ${response.status}): ${responseText.slice(0, 200)}`,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
          };
        }
        console.error('Failed to update profile:', errorData);
        alert(`Failed to update profile: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Check the console for details.');
    }
  };

  return (
    <div className="profile-container">
      <h2>My Profile</h2>
      <div className="profile-card">
        <div className="avatar-wrapper">
          <img
            src={avatarPreview || user.avatar || "https://i.pravatar.cc/150?img=12"}
            alt="avatar"
            className="profile-avatar"
            onClick={() => isEditing && document.getElementById('avatar-upload').click()}
          />
          {isEditing && (
            <>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
              <button
                className="avatar-upload-btn"
                onClick={() => document.getElementById('avatar-upload').click()}
              >
                Change Avatar
              </button>
            </>
          )}
        </div>
        {!isEditing ? (
          <div className="profile-info">
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Phone:</strong> {user.phone}</p>
            <p><strong>Joined:</strong> {user.joined}</p>
            <p><strong>Date of Birth:</strong> {user.dob}</p>
            <p><strong>Gender:</strong> {user.gender}</p>
            <p><strong>Address:</strong> {user.address}</p>
            <p><strong>Default Currency:</strong> {user.default_currency}</p>
            <p><strong>Monthly Budget:</strong> {user.monthly_budget}</p>
            <p><strong>Yearly Budget:</strong> {user.yearly_budget}</p>
            <p><strong>Notifications:</strong> Email: {user.notifications?.email ? 'Enabled' : 'Disabled'}, SMS: {user.notifications?.sms ? 'Enabled' : 'Disabled'}</p>
            <button onClick={() => setIsEditing(true)}>Edit Profile</button>
          </div>
        ) : (
          <div className="profile-edit">
            <label>
              Name:
              <input type="text" name="name" value={formData.name || ''} onChange={handleChange} />
            </label>
            <label>
              Email:
              <input type="email" name="email" value={formData.email || ''} onChange={handleChange} />
            </label>
            <label>
              Phone:
              <input type="text" name="phone" value={formData.phone || ''} onChange={handleChange} />
            </label>
            <label>
              Date of Birth:
              <input type="date" name="dob" value={formData.dob || ''} onChange={handleChange} />
            </label>
            <label>
              Gender:
              <select name="gender" value={formData.gender || ''} onChange={handleChange}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </label>
            <label>
              Address:
              <textarea name="address" value={formData.address || ''} onChange={handleChange} />
            </label>
            <label>
              Default Currency:
              <select name="default_currency" value={formData.default_currency || 'USD'} onChange={handleCurrencyChange}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="INR">INR</option>
                <option value="GBP">GBP</option>
              </select>
            </label>
            <label>
              Monthly Budget:
              <input type="number" name="monthly_budget" value={formData.monthly_budget || 0} onChange={handleChange} />
            </label>
            <label>
              Yearly Budget:
              <input type="number" name="yearly_budget" value={formData.yearly_budget || 0} onChange={handleChange} />
            </label>
            <div className="notification-section">
              <strong>Notification Preferences:</strong>
              <label>
                Email Alerts:
                <input type="checkbox" name="email" checked={formData.notifications?.email || false} onChange={handleNotificationChange} />
              </label>
              <label>
                SMS Alerts:
                <input type="checkbox" name="sms" checked={formData.notifications?.sms || false} onChange={handleNotificationChange} />
              </label>
            </div>
            <div className="profile-actions">
              <button onClick={handleSave}>Save</button>
              <button className="cancel" onClick={() => { setFormData(user); setAvatarPreview(user.avatar); setIsEditing(false); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
