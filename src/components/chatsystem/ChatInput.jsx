import React, { useRef, useState } from 'react';
import { FaSmile, FaPaperclip, FaPaperPlane } from 'react-icons/fa';
import { HiOutlineGif } from 'react-icons/hi2';
import EmojiPicker from 'emoji-picker-react';
import axios from 'axios';

const isMobile = () => window.innerWidth < 700;

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

  const handleSearch = async (q) => {
    setQuery(q);
    if (!q) { setResults([]); return; }
    if (source === 'giphy') await searchGiphy(q);
    else await searchTenor(q);
  };

  // Real-time search on source toggle if query exists
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
    <div style={popupStyle}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <span style={{fontWeight:700,color:'#6366f1'}}>
          GIFs <span style={{fontSize:13,marginLeft:8,padding:'2px 8px',borderRadius:8,background:source==='giphy'?'#6366f1':'#e5e7eb',color:source==='giphy'?'#fff':'#6366f1'}}>{source==='giphy'?'Giphy':'Tenor'}</span>
        </span>
        <button onClick={onClose} style={{background:'none',border:'none',color:'#6366f1',fontSize:22,cursor:'pointer'}}>✕</button>
      </div>
      <input value={query} onChange={e=>handleSearch(e.target.value)} placeholder="Search GIFs..." style={{width:'100%',padding:8,borderRadius:8,border:'1px solid #e5e7eb',marginBottom:8}} />
      {/* Preloaded GIFs row (hide if searching) */}
      {!query && (
        <div style={{display:'flex',overflowX:'auto',gap:8,marginBottom:8,paddingBottom:4}}>
          {preGifs.map((url, i) => (
            <img key={i} src={url} alt="gif" style={{width:64,height:64,objectFit:'cover',borderRadius:8,cursor:'pointer',boxShadow:'0 1px 4px rgba(99,102,241,0.08)'}} onClick={()=>onSelect(url)} />
          ))}
        </div>
      )}
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',paddingRight:2}}>
        {loading ? <div style={{color:'#888',textAlign:'center'}}>Loading...</div> :
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
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
  placeholder = 'Type a message...',
  typing,
  setTyping,
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [emojiPickerKey, setEmojiPickerKey] = useState(0);
  const textareaRef = useRef(null);
  const emojiBtnRef = useRef(null);

  // Auto-grow textarea
  const handleInput = e => {
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    onChange(e.target.value);
    setTyping && setTyping(true);
    setShowEmoji(false);
    setShowGif(false);
  };

  // File upload logic
  const handleFileChange = e => {
    const files = Array.from(e.target.files);
    setUploads([...uploads, ...files]);
    onUpload && onUpload(files);
  };

  // Send on Enter, newline on Shift+Enter
  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() || uploads.length) onSend();
    }
  };

  // Close popups on input focus/click
  const handleInputFocus = (e) => {
    // Only close popups if the focus/click is on the textarea, not on toolbar buttons
    if (e && e.target && e.target.tagName === 'TEXTAREA') {
      setShowEmoji(false);
      setShowGif(false);
    }
  };

  // Insert emoji at cursor
  const handleEmojiClick = (emojiData) => {
    const cursor = textareaRef.current.selectionStart;
    const text = value.slice(0, cursor) + emojiData.emoji + value.slice(cursor);
    onChange(text);
    setShowEmoji(false);
    setTimeout(() => textareaRef.current.focus(), 0);
  };

  return (
    <div style={{
      position: 'sticky',
      bottom: 0,
      background: '#fff',
      borderTop: '1px solid #e5e7eb',
      padding: isMobile() ? '0.5em 0.5em 0.7em 0.5em' : '0.7em 1em',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10,
      boxShadow: isMobile() ? 'none' : 'none', // no shadow
      minHeight: 60,
    }}>
      {/* Upload preview */}
      {uploads.length > 0 && (
        <div style={{display:'flex',overflowX:'auto',marginBottom:8}}>
          {uploads.map((file, i) => (
            <div key={i} style={{marginRight:8}}>
              <img src={file.url ? file.url : URL.createObjectURL(file)} alt="upload" style={{width:48,height:48,objectFit:'cover',borderRadius:8,border:'1px solid #e5e7eb'}} />
            </div>
          ))}
        </div>
      )}
      <div style={{display:'flex',alignItems:'flex-end',gap:8}}>
        <button
          type="button"
          aria-label="Emoji"
          ref={emojiBtnRef}
          onMouseDown={e => e.preventDefault()}
          onClick={() => {
            setShowEmoji(v => !v);
            setShowGif(false);
            setEmojiPickerKey(k => k + 1); // force re-render
          }}
          style={{background:'none',border:'none',fontSize:22,color:'#6366f1',padding:6,cursor:'pointer',outline:'none',boxShadow:'none'}}
        >
          <FaSmile />
        </button>
        <button type="button" aria-label="GIF" onClick={()=>{setShowGif(v=>!v); setShowEmoji(false);}} style={{background:'none',border:'none',fontSize:22,color:'#6366f1',padding:6,cursor:'pointer',outline:'none',boxShadow:'none'}}>
          <HiOutlineGif />
        </button>
        <label style={{background:'none',border:'none',fontSize:22,color:'#6366f1',padding:6,cursor:'pointer',outline:'none',boxShadow:'none'}}>
          <FaPaperclip />
          <input type="file" multiple accept="image/*,video/*" style={{display:'none'}} onChange={handleFileChange} />
        </label>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onClick={handleInputFocus}
          placeholder={placeholder}
          rows={1}
          style={{
            flex:1,
            resize:'none',
            border:'1px solid #e5e7eb',
            borderRadius:16,
            padding:'0.7em 1em',
            fontSize:'1em',
            minHeight:44,
            maxHeight:120,
            outline:'none',
            background:'#f8fafc',
            marginRight:8,
            overflow:'auto',
            transition:'box-shadow 0.2s',
          }}
          autoComplete="off"
          aria-label="Type a message"
          disabled={disabled}
        />
        <button type="button" aria-label="Send" onClick={onSend} disabled={(!value.trim() && uploads.length === 0) || disabled} style={{background:'#6366f1',color:'#fff',border:'none',borderRadius:16,padding:'0.7em 1.1em',fontWeight:700,fontSize:'1.2em',cursor:'pointer',minWidth:44,minHeight:44,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 1px 4px rgba(99,102,241,0.08)'}}>
          <FaPaperPlane style={{fontSize:22}} />
        </button>
      </div>
      {/* Emoji picker */}
      {showEmoji && !showGif && (
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
                  height: 260,
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
          />
        </div>
      )}
      {/* GIF picker */}
      {showGif && !showEmoji && (
        <GifPicker onSelect={url => {
          setUploads([...uploads, { url, isGif: true }]);
          setShowGif(false);
        }} onClose={()=>setShowGif(false)} />
      )}
    </div>
  );
}
