import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './GifPicker.css';

const GIPHY_API_KEY = 'tLRGmg6oGtDwRGJSN7Fscds41a2vEhKt';
const TENOR_API_KEY = 'AIzaSyCzBn0wfH1hiBhQ99wO2q-a7ZlC8oZRNFU';

const PROVIDERS = [
  { name: 'Giphy', value: 'giphy' },
  { name: 'Tenor', value: 'tenor' },
];

// Global cache for GIF data across component instances
const gifCache = new Map();
const imageCacheGlobal = new Map();

function GifPicker({ onSelect, onClose }) {
  const [provider, setProvider] = useState('giphy');
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [imageCache] = useState(imageCacheGlobal);
  
  const debounceRef = useRef();
  const abortControllerRef = useRef();
  const observerRef = useRef();
  const loadMoreTriggerRef = useRef();

  // Ultra-fast image preloader with cache
  const preloadImage = useCallback((src, gifId) => {
    if (imageCache.has(gifId)) return Promise.resolve();
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        imageCache.set(gifId, true);
        resolve();
      };
      img.onerror = resolve; // Don't fail on image errors
      img.src = src;
    });
  }, [imageCache]);

  // Batch preload with immediate execution - using originalId for consistency
  const batchPreloadImages = useCallback((gifList) => {
    // Preload all visible images immediately
    const promises = gifList.slice(0, 50).map(gif => 
      preloadImage(gif.thumb, gif.originalId)
    );
    
    // Background preload for the rest
    Promise.allSettled(promises).then(() => {
      gifList.slice(50).forEach((gif, index) => {
        setTimeout(() => preloadImage(gif.thumb, gif.originalId), index * 10);
      });
    });
  }, [preloadImage]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreTriggerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMoreGifs();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observerRef.current.observe(loadMoreTriggerRef.current);

    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, loadingMore, provider, query]);

  // Reset and fetch on provider/query change with caching
  useEffect(() => {
    const cacheKey = `${provider}-${query.trim() || 'trending'}`;
    
    // Check if we have cached data
    if (gifCache.has(cacheKey)) {
      const cachedData = gifCache.get(cacheKey);
      setGifs(cachedData.gifs);
      setOffset(cachedData.offset);
      setHasMore(cachedData.hasMore);
      setLoading(false);
      return;
    }
    
    // No cache, fetch fresh data
    setGifs([]);
    setOffset(0);
    setHasMore(true);
    
    if (!query.trim()) {
      fetchTrending(true);
    } else {
      // Instant search - no debounce!
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        searchGifs(query, true);
      }, 50); // Super fast response
    }
    
    return () => abortControllerRef.current?.abort();
  }, [provider, query]);

  const processGiphyData = useCallback((data, currentOffset) => {
    return data.map((gif, index) => ({
      id: `${gif.id}-${currentOffset}-${index}`,
      originalId: gif.id,
      url: gif.images.original.url,
      // Use smaller, faster loading images
      thumb: gif.images.preview_gif?.url || gif.images.fixed_height_small.url,
      title: gif.title || 'GIF',
    }));
  }, []);

  const processTenorData = useCallback((results, currentOffset) => {
    return results.map((gif, index) => {
      const gifMedia = gif.media_formats?.gif || Object.values(gif.media_formats)[0];
      const thumbMedia = gif.media_formats?.preview || gif.media_formats?.tinygif || gifMedia;
      return {
        id: `${gif.id}-${currentOffset}-${index}`,
        originalId: gif.id,
        url: gifMedia.url,
        thumb: thumbMedia.url,
        title: gif.content_description || 'GIF',
      };
    });
  }, []);

  const fetchTrending = async (isNewSearch = false) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    const currentOffset = isNewSearch ? 0 : offset;
    
    if (isNewSearch) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const limit = 50; // Increased for better performance
      let url, processedGifs, hasMoreResults, nextOffset;
      
      if (provider === 'giphy') {
        url = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&offset=${currentOffset}`;
        const res = await fetch(url, { signal: abortControllerRef.current.signal });
        const { data, pagination } = await res.json();
        
        processedGifs = processGiphyData(data, currentOffset);
        hasMoreResults = pagination.total_count > currentOffset + limit;
        nextOffset = currentOffset + limit;
      } else {
        const pos = isNewSearch ? '' : `&pos=${currentOffset}`;
        url = `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=${limit}&media_filter=gif${pos}`;
        const res = await fetch(url, { signal: abortControllerRef.current.signal });
        const { results, next } = await res.json();
        
        processedGifs = processTenorData(results, currentOffset);
        hasMoreResults = !!next;
        nextOffset = next || 0;
      }
      
      const newGifs = isNewSearch ? processedGifs : [...gifs, ...processedGifs];
      
      if (isNewSearch) {
        setGifs(processedGifs);
      } else {
        setGifs(prev => [...prev, ...processedGifs]);
      }
      
      setHasMore(hasMoreResults);
      setOffset(nextOffset);
      batchPreloadImages(processedGifs);
      
      // Cache the trending results
      if (isNewSearch) {
        const cacheKey = `${provider}-trending`;
        gifCache.set(cacheKey, {
          gifs: newGifs,
          offset: nextOffset,
          hasMore: hasMoreResults
        });
      }
      
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Fetch error:', err);
        if (isNewSearch) setGifs([]);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const searchGifs = async (searchTerm, isNewSearch = false) => {
    if (!searchTerm.trim()) return;
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    const currentOffset = isNewSearch ? 0 : offset;
    
    if (isNewSearch) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const limit = 50;
      let url, processedGifs, hasMoreResults, nextOffset;
      
      if (provider === 'giphy') {
        url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=${limit}&offset=${currentOffset}`;
        const res = await fetch(url, { signal: abortControllerRef.current.signal });
        const { data, pagination } = await res.json();
        
        processedGifs = processGiphyData(data, currentOffset);
        hasMoreResults = pagination.total_count > currentOffset + limit;
        nextOffset = currentOffset + limit;
      } else {
        const pos = isNewSearch ? '' : `&pos=${currentOffset}`;
        url = `https://tenor.googleapis.com/v2/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=${limit}&media_filter=gif${pos}`;
        const res = await fetch(url, { signal: abortControllerRef.current.signal });
        const { results, next } = await res.json();
        
        processedGifs = processTenorData(results, currentOffset);
        hasMoreResults = !!next;
        nextOffset = next || 0;
      }
      
      const newGifs = isNewSearch ? processedGifs : [...gifs, ...processedGifs];
      
      if (isNewSearch) {
        setGifs(processedGifs);
      } else {
        setGifs(prev => [...prev, ...processedGifs]);
      }
      
      setHasMore(hasMoreResults);
      setOffset(nextOffset);
      batchPreloadImages(processedGifs);
      
      // Cache the search results
      if (isNewSearch) {
        const cacheKey = `${provider}-${searchTerm}`;
        gifCache.set(cacheKey, {
          gifs: newGifs,
          offset: nextOffset,
          hasMore: hasMoreResults
        });
      }
      
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Search error:', err);
        if (isNewSearch) setGifs([]);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreGifs = useCallback(() => {
    if (!query.trim()) {
      fetchTrending(false);
    } else {
      searchGifs(query, false);
    }
  }, [query]);

  const handleProviderChange = useCallback((e, newProvider) => {
    e.preventDefault();
    e.stopPropagation();
    setProvider(newProvider);
  }, []);

  const handleTrendingClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setQuery('');
  }, []);

  const handleClose = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onClose();
  }, [onClose]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      handleClose(e);
    }
  }, [handleClose]);

  const handleGifSelect = useCallback((e, gifUrl) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(gifUrl);
  }, [onSelect]);

  // Memoized skeleton loading
  const skeletonItems = useMemo(() => 
    Array.from({ length: 21 }, (_, i) => (
      <div key={`skeleton-${i}`} className="gif-skeleton" />
    )), []
  );

  return (
    <div className="gif-picker-overlay" onClick={handleOverlayClick}>
      <div className="gif-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="gif-picker-header">
          <div className="gif-provider-toggle">
            {PROVIDERS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={provider === opt.value ? 'active' : ''}
                onClick={(e) => handleProviderChange(e, opt.value)}
              >
                {opt.name}
              </button>
            ))}
          </div>
          <button 
            type="button"
            onClick={handleClose} 
            className="done-gif-picker-modal"
          >
            Done
          </button>
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
          <button 
            type="button"
            onClick={handleTrendingClick} 
            disabled={loading} 
            className="gif-trending-btn"
            title="Show trending GIFs"
          >
            🔥
          </button>
        </div>
        
        <div className="gif-grid-container">
          <div className="gif-flex-grid">
            {gifs.map((gif) => (
              <div
                key={gif.id}
                className="gif-item-container loaded"
                onClick={(e) => handleGifSelect(e, gif.url)}
              >
                <img
                  src={gif.thumb}
                  alt={gif.title}
                  className="gif-item-image"
                  loading="eager"
                  decoding="async"
                />
              </div>
            ))}
            
            {/* Always show skeletons when loading */}
            {loading && skeletonItems}
            
            {/* Load more trigger */}
            {hasMore && gifs.length > 0 && (
              <div ref={loadMoreTriggerRef} className="load-more-trigger">
                {loadingMore && (
                  <div className="loading-more-indicator">
                    <div className="loading-more-spinner"></div>
                    <span>Loading...</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Show skeleton instead of "No GIFs found" */}
            {!loading && !loadingMore && gifs.length === 0 && skeletonItems}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GifPicker;