import { useState, useEffect, useRef, useCallback } from 'react';
import './GifPicker.css';

const GIPHY_API_KEY = 'tLRGmg6oGtDwRGJSN7Fscds41a2vEhKt';
const TENOR_API_KEY = 'AIzaSyCzBn0wfH1hiBhQ99wO2q-a7ZlC8oZRNFU';

const PROVIDERS = [
  { name: 'Giphy', value: 'giphy' },
  { name: 'Tenor', value: 'tenor' },
];

function GifPicker({ onSelect, onClose }) {
  const [provider, setProvider] = useState('giphy');
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadedImages, setLoadedImages] = useState(new Set());
  const debounceRef = useRef();
  const abortControllerRef = useRef();

  // Preload images for better UX
  const preloadImage = useCallback((src, gifId) => {
    if (loadedImages.has(gifId)) return;
    
    const img = new Image();
    img.onload = () => {
      setLoadedImages(prev => new Set([...prev, gifId]));
    };
    img.src = src;
  }, [loadedImages]);

  // Batch preload images
  const batchPreloadImages = useCallback((gifList) => {
    gifList.forEach((gif, index) => {
      // Stagger the preloading to avoid overwhelming the browser
      setTimeout(() => {
        preloadImage(gif.thumb, gif.id);
      }, index * 50); // 50ms delay between each preload
    });
  }, [preloadImage]);

  useEffect(() => {
    if (!query.trim()) {
      fetchTrending();
    } else {
      // Debounced search
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        searchGifs(query);
      }, 400);
    }
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [provider, query]);

  const fetchTrending = async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setLoading(true);
    setLoadedImages(new Set()); // Reset loaded images
    
    try {
      let url;
      if (provider === 'giphy') {
        url = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=50`;
        const res = await fetch(url, { signal: abortControllerRef.current.signal });
        const { data } = await res.json();
        const processedGifs = data.map(gif => ({
          id: gif.id,
          url: gif.images.original.url,
          thumb: gif.images.fixed_height_small.url,
          title: gif.title,
          width: gif.images.fixed_height_small.width,
          height: gif.images.fixed_height_small.height
        }));
        setGifs(processedGifs);
        batchPreloadImages(processedGifs);
      } else {
        url = `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=50&media_filter=gif`;
        const res = await fetch(url, { signal: abortControllerRef.current.signal });
        const { results } = await res.json();
        const processedGifs = results.map(gif => {
          const gifMedia = gif.media_formats?.gif || Object.values(gif.media_formats)[0];
          const thumbMedia = gif.media_formats?.tinygif || gifMedia;
          return {
            id: gif.id,
            url: gifMedia.url,
            thumb: thumbMedia.url,
            title: gif.content_description,
            width: thumbMedia.dims?.[0] || 200,
            height: thumbMedia.dims?.[1] || 200
          };
        });
        setGifs(processedGifs);
        batchPreloadImages(processedGifs);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setGifs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async (searchTerm) => {
    if (!searchTerm.trim()) return;
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setLoading(true);
    setLoadedImages(new Set()); // Reset loaded images
    
    try {
      let url;
      if (provider === 'giphy') {
        url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=50`;
        const res = await fetch(url, { signal: abortControllerRef.current.signal });
        const { data } = await res.json();
        const processedGifs = data.map(gif => ({
          id: gif.id,
          url: gif.images.original.url,
          thumb: gif.images.fixed_height_small.url,
          title: gif.title,
          width: gif.images.fixed_height_small.width,
          height: gif.images.fixed_height_small.height
        }));
        setGifs(processedGifs);
        batchPreloadImages(processedGifs);
      } else {
        url = `https://tenor.googleapis.com/v2/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=50&media_filter=gif`;
        const res = await fetch(url, { signal: abortControllerRef.current.signal });
        const { results } = await res.json();
        const processedGifs = results.map(gif => {
          const gifMedia = gif.media_formats?.gif || Object.values(gif.media_formats)[0];
          const thumbMedia = gif.media_formats?.tinygif || gifMedia;
          return {
            id: gif.id,
            url: gifMedia.url,
            thumb: thumbMedia.url,
            title: gif.content_description,
            width: thumbMedia.dims?.[0] || 200,
            height: thumbMedia.dims?.[1] || 200
          };
        });
        setGifs(processedGifs);
        batchPreloadImages(processedGifs);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setGifs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gif-picker-overlay">
      <div className="gif-picker-modal gif-picker-modern">
        <div className="gif-picker-header">
          <div className="gif-provider-toggle">
            {PROVIDERS.map(opt => (
              <button
                key={opt.value}
                className={provider === opt.value ? 'active' : ''}
                onClick={() => setProvider(opt.value)}
              >
                {opt.name}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="done-gif-picker-modal">Done</button>
        </div>
        <div className="gif-search-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${provider === 'giphy' ? 'Giphy' : 'Tenor'} GIFs...`}
            className="gif-search-input"
            autoFocus
          />
          <button onClick={fetchTrending} disabled={loading} className="gif-trending-btn" title="Show trending GIFs">
            🔥
          </button>
        </div>
        <div className="gif-masonry-grid">
          {loading
            ? Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="gif-skeleton-masonry" />
              ))
            : gifs.map((gif) => (
                <div
                  key={gif.id}
                  className={`gif-item-container ${loadedImages.has(gif.id) ? 'loaded' : 'loading'}`}
                  onClick={() => onSelect(gif.url)}
                >
                  <img
                    src={gif.thumb}
                    alt={gif.title}
                    className="gif-item-masonry"
                    loading="lazy"
                    style={{
                      aspectRatio: `${gif.width}/${gif.height}`,
                      width: '100%',
                      height: 'auto'
                    }}
                  />
                  {!loadedImages.has(gif.id) && (
                    <div className="gif-loading-overlay">
                      <div className="gif-spinner"></div>
                    </div>
                  )}
                </div>
              ))}
          {!loading && gifs.length === 0 && (
            <div className="no-gifs">No GIFs found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GifPicker;