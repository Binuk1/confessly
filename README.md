import './App.css';
import { useState } from 'react';
import ConfessionForm from './components/ConfessionForm';
import ConfessionList from './components/ConfessionList';
import TrendingConfessions from './components/TrendingConfessions';

function App() {
  const [viewTrending, setViewTrending] = useState(false);

  return (
    <div className="App">
      <h1>Anonymous Confession Wall</h1>
      <ConfessionForm />

      <div className="toggle-bar">
        <button
          className={!viewTrending ? 'active' : ''}
          onClick={() => setViewTrending(false)}
        >
          🆕 Latest
        </button>
        <button
          className={viewTrending ? 'active' : ''}
          onClick={() => setViewTrending(true)}
        >
          🔥 Trending
        </button>
      </div>

      {viewTrending ? <TrendingConfessions /> : <ConfessionList />}
    </div>
  );
}

export default App;
