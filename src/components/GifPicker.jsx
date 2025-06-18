import { useState, useEffect } from 'react';
import './GifPicker.css';

function GifPicker({ onSelect }) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchGifs = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=tLRGmg6oGtDwRGJSN7Fscds41a2vEhKt&q=${query}&limit=12`
      );
      const { data } = await response.json();
      setGifs(data);
    } catch (err) {
      console.error("GIF search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gif-picker">
      <div className="gif-search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs..."
        />
        <button onClick={searchGifs} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      <div className="gif-grid">
        {gifs.map((gif) => (
          <img
            key={gif.id}
            src={gif.images.fixed_height_small.url}
            alt={gif.title}
            onClick={() => onSelect(gif.images.original.url)}
            className="gif-item"
          />
        ))}
      </div>
    </div>
  );
}

export default GifPicker;