import { useState, useRef } from 'react';

import { db } from '../firebase';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import GifPicker from './GifPicker';

import EmojiPicker from 'emoji-picker-react';

import SkeletonItem from './SkeletonItem'; // ADDED



function ConfessionForm() {

  const [text, setText] = useState('');

  const [gifUrl, setGifUrl] = useState('');

  const [mediaUrl, setMediaUrl] = useState('');

  const [mediaType, setMediaType] = useState('');

  const [isUploading, setIsUploading] = useState(false);

  const [uploadError, setUploadError] = useState('');

  const [showGifPicker, setShowGifPicker] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [loading, setLoading] = useState(false);

  const [dragOver, setDragOver] = useState(false);

  const emojiButtonRef = useRef(null);



  const handleFileChange = async (event) => {

    const file = event.target.files[0];

    if (!file) return;



    if (file.type.startsWith('image') && file.size > 2 * 1024 * 1024) {

      setUploadError('Image must be smaller than 2MB');

      return;

    }



    if (file.type.startsWith('video')) {

      const video = document.createElement('video');

      video.preload = 'metadata';

      video.onloadedmetadata = function () {

        window.URL.revokeObjectURL(video.src);

        if (video.duration > 60) {

          setUploadError('Video must be shorter than 60 seconds');

          return;

        }

        proceedWithUpload(file);

      };

      video.src = URL.createObjectURL(file);

    } else {

      proceedWithUpload(file);

    }

  };



  const proceedWithUpload = async (file) => {

    setGifUrl('');

    setMediaUrl('');

    setUploadError('');

    setIsUploading(true);



    const formData = new FormData();

    formData.append('file', file);

    formData.append('upload_preset', 'ml_default'); // replace

    const CLOUD_NAME = 'dqptpxh4r'; // replace



    try {

      const resourceType = file.type.startsWith('image') ? 'image' : 'video';

      const api = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;



      const response = await fetch(api, { method: 'POST', body: formData });

      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

      const data = await response.json();



      setMediaUrl(data.secure_url);

      setMediaType(resourceType);

    } catch (error) {

      setUploadError(error.message || 'Upload failed.');

    } finally {

      setIsUploading(false);

    }

  };



  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!text.trim() && !gifUrl && !mediaUrl) return;



    setLoading(true);

    try {

      await addDoc(collection(db, 'confessions'), {

        text: text.trim(),

        gifUrl: gifUrl || null,

        mediaUrl: mediaUrl || null,

        mediaType: mediaType || null,

        createdAt: serverTimestamp(),

        reactions: {},

      });

      setText('');

      setGifUrl('');

      setMediaUrl('');

      setMediaType('');

      setUploadError('');

    } catch (err) {

      console.error("Error:", err);

    } finally {

      setLoading(false);

    }

  };



  const removeMedia = () => {

    setMediaUrl('');

    setMediaType('');

    setUploadError('');

  };



  return (

    <form className="confession-form" onSubmit={handleSubmit}>

      <div

        className={`textarea-wrapper ${dragOver ? 'drag-over' : ''}`}

        onDragOver={(e) => {

          e.preventDefault();

          setDragOver(true);

        }}

        onDragLeave={() => setDragOver(false)}

        onDrop={(e) => {

          e.preventDefault();

          setDragOver(false);

          const file = e.dataTransfer.files[0];

          if (file) handleFileChange({ target: { files: [file] } });

        }}

      >

        <textarea

          value={text}

          onChange={(e) => setText(e.target.value)}

          placeholder="Share your confession, photo, or video..."

          rows={4}

        />

        <div className="form-actions">

          <label className="file-input-label">

            📷

            <input

              type="file"

              accept="image/*,video/*"

              onChange={handleFileChange}

              disabled={isUploading}

              style={{ display: 'none' }}

            />

          </label>



          <button

            type="button"

            onClick={() => {

              setShowGifPicker(!showGifPicker);

              setUploadError('');

            }}

            className="action-button"

          >

            GIF

          </button>



          <button

            type="button"

            ref={emojiButtonRef}

            onClick={() => setShowEmojiPicker(!showEmojiPicker)}

            className="action-button"

          >

            😊

          </button>



          <button

            type="button"

            className="action-button"

            title="Max image: 2MB, Max video: 60s"

            onClick={() => alert('Max image size: 2MB\nMax video length: 60 seconds')}

          >

            ℹ️

          </button>



          <button

            type="submit"

            className="submit-button"

            disabled={loading || isUploading || (!text.trim() && !gifUrl && !mediaUrl)}

          >

            {loading ? 'Posting...' : 'Confess'}

          </button>



          {showEmojiPicker && (

            <div className="emoji-picker-container">

              <EmojiPicker

                onEmojiClick={(emojiData) => {

                  setText(prev => prev + emojiData.emoji);

                  setShowEmojiPicker(false);

                }}

                width={300}

                height={400}

                previewConfig={{ showPreview: false }}

                searchPlaceholder="Search emojis..."

              />

            </div>

          )}

        </div>

      </div>



      {mediaUrl && (

        <div className="gif-preview-container">

          {mediaType === 'image' ? (

            <img src={mediaUrl} alt="Preview" className="gif-preview" />

          ) : (

            <video src={mediaUrl} controls className="gif-preview" />

          )}

          <button type="button" onClick={removeMedia} className="remove-gif">×</button>

        </div>

      )}



      {gifUrl && !mediaUrl && (

        <div className="gif-preview-container">

          <img src={gifUrl} alt="GIF Preview" className="gif-preview" />

          <button type="button" onClick={() => setGifUrl('')} className="remove-gif">×</button>

        </div>

      )}



      {/* UPDATED: Universal loading indicator */}

      {(isUploading || loading) && <SkeletonItem />}

     

      {uploadError && <div className="error-message">{uploadError}</div>}

     

      {showGifPicker && (

        <GifPicker

          onSelect={(url) => {

            setGifUrl(url);

            removeMedia();

            setShowGifPicker(false);

          }}

          onClose={() => setShowGifPicker(false)}

        />

      )}

    </form>

  );

}



export default ConfessionForm;