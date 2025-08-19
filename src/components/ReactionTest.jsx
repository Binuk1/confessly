import { useState, useEffect } from 'react';
import { subscribeToReactions, toggleReaction, getReactionCounts } from '../services/reactionService';

function ReactionTest({ confessionId }) {
  const [reactions, setReactions] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!confessionId) return;

    const unsubscribe = subscribeToReactions(confessionId, (reactionData) => {
      console.log('Real-time reaction update:', reactionData);
      setReactions(reactionData);
    });

    return unsubscribe;
  }, [confessionId]);

  const handleTestReaction = async (emoji) => {
    setLoading(true);
    try {
      await toggleReaction(confessionId, emoji);
      console.log(`Toggled ${emoji} reaction`);
    } catch (error) {
      console.error('Error toggling reaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const testEmojis = ['❤️', '😂', '😢', '😡', '👍'];

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #3498db', 
      borderRadius: '8px', 
      margin: '20px 0',
      backgroundColor: '#f8f9fa'
    }}>
      <h3>Reaction Test for Confession: {confessionId}</h3>
      <p>Current reactions: {JSON.stringify(reactions)}</p>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        {testEmojis.map(emoji => (
          <button
            key={emoji}
            onClick={() => handleTestReaction(emoji)}
            disabled={loading}
            style={{
              fontSize: '20px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              backgroundColor: loading ? '#f0f0f0' : 'white'
            }}
          >
            {emoji} {reactions[emoji] || 0}
          </button>
        ))}
      </div>
      
      {loading && <p style={{ color: '#666', marginTop: '10px' }}>Processing...</p>}
    </div>
  );
}

export default ReactionTest;
