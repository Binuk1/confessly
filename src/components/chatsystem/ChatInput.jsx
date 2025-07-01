import React, { useRef, useState } from 'react';
import { FaRegImage, FaRegSmile, FaArrowCircleUp } from 'react-icons/fa';
import { HiOutlineGif } from 'react-icons/hi2';
import EmojiPicker from 'emoji-picker-react';
import axios from 'axios';
import { IoIosArrowDroprightCircle } from 'react-icons/io';
import MediaPreviewGrid from './MediaPreviewGrid';

const isMobile = () => window.innerWidth < 700;

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_VIDEO_DURATION = 60; // 60 seconds

function getVideoDuration(url) {
  return new Promise(resolve => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve(video.duration);
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });
}

function GifPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [source, setSource] = useState('giphy');
  const [loading, setLoading] = useState(false);
  // Deterministic daily shuffle for preGifs
  const trendingGifs = [
    'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif',
    'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
    'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
    'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
    'https://media.giphy.com/media/3orieQEA4Gx5U/giphy.gif',
    'https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif',
    'https://media.giphy.com/media/3oEjHP8ELRNNlnlLGM/giphy.gif',
    'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
    'https://media.giphy.com/media/3o6Zt8zb1p2rj6hQXS/giphy.gif',
    'https://media.giphy.com/media/3o6ZtpxSZbQRRnwCKQ/giphy.gif',
    'https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif',
    'https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif',
    'https://media.giphy.com/media/3o6Zt8zb1p2rj6hQXS/giphy.gif',
    'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
    'https://media.giphy.com/media/3o6ZtpxSZbQRRnwCKQ/giphy.gif',
  ];
  function dailyShuffle(arr) {
    const today = new Date();
    const seed = today.getFullYear()*10000 + (today.getMonth()+1)*100 + today.getDate();
    let a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      let j = (seed + i*31) % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, 8);
  }
  const [preGifs] = useState(() => dailyShuffle(trendingGifs));
  const GIPHY_KEY = 'tLRGmg6oGtDwRGJSN7Fscds41a2vEhKt';
  const TENOR_KEY = 'AIzaSyCzBn0wfH1hiBhQ99wO2q-a7ZlC8oZRNFU';

  const searchGiphy = async (q) => {
    setLoading(true);
    const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=24&rating=pg`);
    const data = await res.json();
    setResults(data.data.map(g => ({ url: g.images.fixed_height.url, id: g.id })));
    setLoading(false);
  };
  const searchTenor = async (q) => {
    setLoading(true);
    const res = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=24&media_filter=gif`);
    const data = await res.json();
    setResults((data.results||[]).map(g => ({ url: g.media_formats.gif.url, id: g.id })));
    setLoading(false);
  };

  // Only search when user types
  const handleSearch = async (q) => {
    setQuery(q);
    if (!q) { setResults([]); return; }
    if (source === 'giphy') await searchGiphy(q);
    else await searchTenor(q);
  };

  // Auto-update results when switching source if query exists
  React.useEffect(() => {
    if (query) {
      if (source === 'giphy') searchGiphy(query);
      else searchTenor(query);
    }
    // eslint-disable-next-line
  }, [source]);

  // Responsive popup height/width and position
  const isMobile = window.innerWidth < 500;
  // Position popup so its left edge aligns with the GIF button on desktop
  const popupStyle = isMobile ? {
    position:'absolute',
    bottom:70,
    left:'50%',
    transform:'translateX(-50%)',
    zIndex:30,
    background:'#fff',
    boxShadow:'none', // no shadow
    borderRadius:16,
    padding:12,
    width:'98vw',
    minWidth:0,
    maxHeight:'60vh',
    overflow:'hidden',
    display:'flex',
    flexDirection:'column',
    transition:'width 0.2s, max-height 0.2s',
  } : {
    position:'absolute',
    bottom:70,
    left:56, // aligns with GIF button (assuming 3 buttons of 44px + 4px gap)
    zIndex:30,
    background:'#fff',
    boxShadow:'none', // no shadow
    borderRadius:16,
    padding:12,
    width: query ? 420 : 340,
    minWidth:220,
    maxHeight: query ? 420 : 340,
    overflow:'hidden',
    display:'flex',
    flexDirection:'column',
    transition:'width 0.2s, max-height 0.2s',
  };

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: '64px', width: '100vw', maxWidth: '100vw', background: '#fff', zIndex: 2000, borderTopLeftRadius: 18, borderTopRightRadius: 18, boxShadow: '0 -2px 24px rgba(0,0,0,0.18)', padding: '8px 0 0 0', minHeight: '220px', maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0 16px 8px 16px'}}>
        <input value={query} onChange={e=>handleSearch(e.target.value)} placeholder="Search GIFs..." style={{flex:1,padding:10,borderRadius:8,border:'2px solid #6366f1',marginRight:8,background:'#fff',color:'#222',fontWeight:500,fontSize:16,boxShadow:'0 1px 4px rgba(99,102,241,0.08)'}} />
        <button onClick={onClose} style={{background:'none',border:'none',color:'#6366f1',fontSize:22,cursor:'pointer'}}>✕</button>
      </div>
      {/* Preloaded GIFs row (hide if searching) */}
      {!query && (
        <div style={{display:'flex',overflowX:'auto',gap:8,marginBottom:8,paddingBottom:4,paddingLeft:16}}>
          {preGifs.map((url, i) => (
            <img key={i} src={url} alt="gif" style={{width:64,height:64,objectFit:'cover',borderRadius:8,cursor:'pointer',boxShadow:'0 1px 4px rgba(99,102,241,0.08)'}} onClick={()=>onSelect(url)} />
          ))}
        </div>
      )}
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',paddingRight:2}}>
        {loading ? <div style={{color:'#888',textAlign:'center'}}>Loading...</div> :
          <div style={{display:'flex',flexWrap:'wrap',gap:8,paddingLeft:16}}>
            {results.map(gif => (
              <img key={gif.id} src={gif.url} alt="gif" style={{width:88,height:88,objectFit:'cover',borderRadius:8,cursor:'pointer'}} onClick={()=>onSelect(gif.url)} />
            ))}
          </div>
        }
      </div>
      {/* Giphy/Tenor toggle as a single button */}
      <div style={{marginTop:8,display:'flex',justifyContent:'center',gap:8}}>
        <button onClick={()=>setSource('giphy')} style={{fontWeight:source==='giphy'?700:400,color:source==='giphy'?'#fff':'#6366f1',background:source==='giphy'?'#6366f1':'#e5e7eb',border:'none',borderRadius:8,padding:'6px 18px',cursor:'pointer',transition:'background 0.15s'}}>Giphy</button>
        <button onClick={()=>setSource('tenor')} style={{fontWeight:source==='tenor'?700:400,color:source==='tenor'?'#fff':'#6366f1',background:source==='tenor'?'#6366f1':'#e5e7eb',border:'none',borderRadius:8,padding:'6px 18px',cursor:'pointer',transition:'background 0.15s'}}>Tenor</button>
      </div>
    </div>
  );
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  onUpload,
  disabled,
  placeholder = 'Type here',
  typing,
  setTyping,
  style = {},
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [uploads, setUploads] = useState([]); // {file, url, type, size, duration?}
  const [emojiPickerKey, setEmojiPickerKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [toolsVisible, setToolsVisible] = useState(true);
  const textareaRef = useRef(null);
  const [emojiSearch, setEmojiSearch] = useState('');
  const fileInputRef = useRef(null);
  const isDesktop = typeof window !== 'undefined' ? window.innerWidth > 700 : true;

  // Auto-grow textarea
  const handleInput = e => {
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    onChange(e.target.value);
    setTyping && setTyping(true);
    setShowEmoji(false);
    setShowGif(false);
  };

  const handleFocus = () => setToolsVisible(false);
  const handleExpandTools = () => setToolsVisible(true);

  // File input and drag-drop
  const handleFileChange = async e => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    for (const file of files) {
      if (file.type.startsWith('image/') && file.size > MAX_IMAGE_SIZE) {
        alert('Image too large (max 2MB)');
        continue;
      }
      if (file.type.startsWith('video/')) {
        const previewUrl = URL.createObjectURL(file);
        const duration = await getVideoDuration(previewUrl);
        if (duration > MAX_VIDEO_DURATION) {
          alert('Video too long (max 60s)');
          continue;
        }
        validFiles.push({ file, previewUrl, type: file.type, size: file.size, duration });
      } else {
        validFiles.push({ file, previewUrl: URL.createObjectURL(file), type: file.type, size: file.size });
      }
    }
    setUploads(prev => [...prev, ...validFiles]);
    if (onUpload) onUpload(validFiles.map(f => f.file));
    e.target.value = null;
  };

  // Drag and drop
  const handleDrop = async e => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    await handleFileChange({ target: { files } });
  };
  const handleDragOver = e => e.preventDefault();

  // Remove file
  const handleRemove = idx => setUploads(uploads => uploads.filter((_, i) => i !== idx));

  // Send handler
  const handleSendAll = async () => {
    if ((!value.trim() && uploads.length === 0) || disabled || sending) return;
    setSending(true);
    let media = [];
    if (uploads.length > 0) {
      media = await uploadAll(uploads); // Only remote URLs
      setUploads([]);
    }
    await onSend({ text: value, media });
    onChange('');
    setSending(false);
  };

  // Insert emoji at cursor
  const handleEmojiClick = (emojiData) => {
    const cursor = textareaRef.current.selectionStart;
    const text = value.slice(0, cursor) + emojiData.emoji + value.slice(cursor);
    onChange(text);
    setShowEmoji(false);
    setTimeout(() => textareaRef.current.focus(), 0);
  };

  // Cloudinary config
  const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dqptpxh4r/upload'; // updated to your cloud name
  const CLOUDINARY_PRESET = 'ztxza7xb'; // your unsigned preset

  // Upload all files to Cloudinary, return array of {url, type}
  const uploadAll = async files => {
    const uploads = await Promise.all(files.map(async fileObj => {
      if (fileObj.url && fileObj.isGif) {
        // GIF from picker, just use URL
        return { url: fileObj.url, type: 'image/gif' };
      }
      const form = new FormData();
      form.append('file', fileObj.file); // Always use the actual File object
      form.append('upload_preset', CLOUDINARY_PRESET);
      const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
      const data = await res.json();
      let type = '';
      if (data.resource_type === 'video') {
        type = 'video/mp4';
      } else if (data.format === 'gif') {
        type = 'image/gif';
      } else if (fileObj.type && fileObj.type.startsWith('image/')) {
        type = fileObj.type;
      } else {
        type = 'image/jpeg';
      }
      return { url: data.secure_url, type };
    }));
    return uploads;
  };

  // Only one modal open at a time
  const openGifModal = () => { setShowGif(true); setShowEmoji(false); };
  const openEmojiModal = () => { setShowEmoji(true); setShowGif(false); };

  return (
    <div
      className={"messenger-input-bar chatinput-bar-root"}
      style={{
        ...style,
        ...(isDesktop
          ? {
              width: '96%',
              maxWidth: 640,
              minWidth: 0,
              margin: '0 auto 18px auto',
              borderRadius: 24,
              boxShadow: '0 4px 24px rgba(99,102,241,0.10)',
              position: 'static',
              background: 'rgba(255,255,255,0.85)',
              border: '1.5px solid #e5e7eb',
            }
          : {
              width: '100vw',
              position: 'fixed',
              left: 0,
              bottom: 'env(safe-area-inset-bottom, 0px)', // Safe area for mobile
              zIndex: 1000,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(229,231,235,0.8)',
              borderRadius: '24px 24px 0 0',
              padding: '12px 16px',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.1)',
              // Mobile-specific fixes for Chrome and other browsers
              minHeight: 'auto',
              maxHeight: 'none',
              paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            }
        ),
        display: 'flex',
        alignItems: 'flex-end',
        gap: 12,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        transition: 'all 0.2s ease',
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver }
    >
      <div className="messenger-input-inner" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        width: '100%',
        gap: 0,
        padding: '2px 2px',
        margin: 0,
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 28,
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}>
        {/* Media preview grid above textarea */}
        {uploads.length > 0 && (
          <MediaPreviewGrid files={uploads.map(f => ({ url: f.previewUrl, type: f.type }))} onRemove={handleRemove} />
        )}
        {/* If tools are hidden on mobile, show only the expand arrow and textarea */}
        {!isDesktop && !toolsVisible && (
          <button
            className="messenger-input-icon"
            type="button"
            aria-label="Show tools"
            onClick={handleExpandTools}
            style={{
              width: 44,
              minWidth: 44,
              maxWidth: 44,
              height: 44,
              minHeight: 44,
              maxHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              boxSizing: 'border-box',
              background: 'rgba(0,120,255,0.15)',
              color: '#0078ff',
              border: 'none',
            }}
          >
            <IoIosArrowDroprightCircle size={32} style={{ width: 32, height: 32 }} />
          </button>
        )}
        {/* Tool icons (hide when textarea focused on mobile only) */}
        {(isDesktop || toolsVisible) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: 1,
              pointerEvents: 'auto',
            }}
          >
            <button
              className="messenger-input-icon"
              type="button"
              tabIndex={-1}
              aria-label="GIF"
              onClick={() => openGifModal()}
              style={{
                width: 44,
                minWidth: 44,
                maxWidth: 44,
                height: 44,
                minHeight: 44,
                maxHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                boxSizing: 'border-box',
              }}
            >
              <HiOutlineGif size={32} style={{ width: 32, height: 32 }} />
            </button>
            <button
              className="messenger-input-icon"
              type="button"
              tabIndex={-1}
              aria-label="Image"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                width: 44,
                minWidth: 44,
                maxWidth: 44,
                height: 44,
                minHeight: 44,
                maxHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              <FaRegImage size={32} style={{ width: 32, height: 32 }} />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
                tabIndex={-1}
              />
            </button>
            {isDesktop && (
        <button
                className="messenger-input-icon"
          type="button"
                tabIndex={-1}
          aria-label="Emoji"
                onClick={() => openEmojiModal()}
                style={{
                  width: 44,
                  minWidth: 44,
                  maxWidth: 44,
                  height: 44,
                  minHeight: 44,
                  maxHeight: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  boxSizing: 'border-box',
                }}
              >
                <FaRegSmile size={32} style={{ width: 32, height: 32 }} />
        </button>
            )}
          </div>
        )}
        {/* Textarea and send button in a row */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', width: '100%', gap: 8 }}>
          <textarea
            ref={textareaRef}
            className="messenger-input"
            value={value}
            onChange={handleInput}
            onFocus={() => { if (!isDesktop) setToolsVisible(false); }}
            onBlur={() => { if (!isDesktop) setToolsVisible(true); }}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            aria-label="Type a message"
            rows={1}
            style={{
              flex: 1,
              minWidth: 0,
              width: '100%',
              resize: 'none',
              minHeight: 36,
              maxHeight: 80,
              overflow: 'auto',
              fontSize: '16px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontWeight: '400',
              background: 'rgba(255,255,255,0.08)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 22,
              outline: 'none',
              padding: '6px 6px',
              lineHeight: '1.4',
              transition: 'all 0.2s ease',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
              marginRight: 0,
              boxSizing: 'border-box',
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendAll(); } }}
          />
          <button
            className="messenger-send-btn"
            type="button"
            aria-label="Send"
            onClick={handleSendAll}
            disabled={disabled || sending}
            style={{
              width: 44,
              minWidth: 44,
              maxWidth: 44,
              height: 44,
              minHeight: 44,
              maxHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              marginLeft: 8,
              boxSizing: 'border-box',
            }}
          >
            <FaArrowCircleUp size={32} style={{ width: 32, height: 32 }} />
          </button>
        </div>
      </div>
      {/* Responsive GIF picker modal */}
      {showGif && !showEmoji && (
        <div style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: '64px',
          width: '100vw',
          maxWidth: '100vw',
          background: '#fff',
          zIndex: 2000,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          boxShadow: '0 -2px 24px rgba(0,0,0,0.18)',
          padding: '8px 0 0 0',
          minHeight: '220px',
          maxHeight: '50vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <GifPicker onSelect={url => {
            onSend({ text: '', media: [{ url, type: 'image/gif' }] });
            setShowGif(false);
          }} onClose={()=>setShowGif(false)} />
        </div>
      )}
      {/* Emoji picker (desktop only) */}
      {isDesktop && showEmoji && !showGif && (
        <div
          style={
            isMobile()
              ? {
                  position: 'absolute',
                  zIndex: 30,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bottom: 70,
                  width: '95vw',
                  maxWidth: 320,
                  height: 320,
                  background: '#fff',
                  borderRadius: 12,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                  border: '1px solid #e5e7eb',
                  pointerEvents: 'auto',
                  padding: 0,
                }
              : {
                  position: 'absolute',
                  zIndex: 30,
                  left: 0,
                  bottom: 60,
                  width: 280,
                  height: 320,
                  background: '#fff',
                  borderRadius: 12,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                  border: '1px solid #e5e7eb',
                  pointerEvents: 'auto',
                  padding: 0,
                }
          }
        >
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px 4px 12px'}}>
            <input
              type="text"
              placeholder="Search emojis..."
              style={{flex:1,padding:6,borderRadius:8,border:'1px solid #e5e7eb',marginRight:8}}
              onChange={e => setEmojiSearch(e.target.value)}
              value={emojiSearch}
            />
            <button onClick={()=>setShowEmoji(false)} style={{background:'none',border:'none',color:'#6366f1',fontSize:22,cursor:'pointer'}}>✕</button>
          </div>
          <EmojiPicker
            key={emojiPickerKey}
            onEmojiClick={handleEmojiClick}
            width={isMobile() ? '100%' : 280}
            height={isMobile() ? 260 : 320}
            previewConfig={{ showPreview: false }}
            searchPlaceholder="Search emojis..."
            skinTonesDisabled
            lazyLoadEmojis
            autoFocusSearch={false}
            disableAutoFocus
            search={emojiSearch}
          />
        </div>
      )}
    </div>
  );
}
