// src/components/FileUploadButton.jsx
import React, { useState } from 'react';

function FileUploadButton({ onUploadSuccess, buttonText = "Upload File" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ensure these are correctly set in your .env file
  const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET; // Use your unsigned upload preset name

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryUploadPreset);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'Failed to upload file to Cloudinary.');
      }

      const data = await response.json();
      onUploadSuccess(data.secure_url); // Pass the secure URL back to the parent
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-upload-container">
      <label className="file-upload-button" htmlFor="file-upload-input-cloudinary">
        {loading ? 'Uploading...' : buttonText}
        <input
          id="file-upload-input-cloudinary" // Unique ID to prevent conflicts
          type="file"
          accept="image/*,video/*" // Accept images and videos
          onChange={handleFileChange}
          style={{ display: 'none' }} // Hide the default input
          disabled={loading}
        />
      </label>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default FileUploadButton;