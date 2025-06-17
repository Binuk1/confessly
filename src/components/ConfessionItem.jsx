import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const emojis = ['❤️', '😂', '😢', '😡', '👍'];

function ConfessionItem({ confession, rank }) {
  const [selectedEmoji, setSelectedEmoji] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(`reaction-${confession.id}`);
    if (stored) {
      setSelectedEmoji(stored);
    }
  }, [confession.id]);

  const toggleReaction = async (emoji) => {
    const docRef = doc(db, 'confessions', confession.id);
    const currentReactions = confession.reactions || {};
    const newReactions = { ...currentReactions };

    const prevReactionKey = Object.keys(localStorage).find((key) =>
      key.startsWith('reaction-')
    );
    if (prevReactionKey) {
      const prevId = prevReactionKey.replace('reaction-', '');
      const prevEmoji = localStorage.getItem(prevReactionKey);
      if (prevId !== confession.id) {
        const prevDocRef = doc(db, 'confessions', prevId);
        const prevReactions = confession.reactions || {};
        const updated = { ...prevReactions };
        if (updated[prevEmoji]) {
          updated[prevEmoji] = updated[prevEmoji] - 1;
          await updateDoc(prevDocRef, { reactions: updated });
        }
        localStorage.removeItem(prevReactionKey);
      }
    }

    if (selectedEmoji === emoji) {
      newReactions[emoji] = (newReactions[emoji] || 1) - 1;
      setSelectedEmoji(null);
      localStorage.removeItem(`reaction-${confession.id}`);
    } else {
      if (selectedEmoji) {
        newReactions[selectedEmoji] = (newReactions[selectedEmoji] || 1) - 1;
      }
      newReactions[emoji] = (newReactions[emoji] || 0) + 1;
      setSelectedEmoji(emoji);
      localStorage.setItem(`reaction-${confession.id}`, emoji);
    }

    await updateDoc(docRef, { reactions: newReactions });
  };

  const getBadge = () => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      case 4:
      case 5:
        return '🏅';
      default:
        return null;
    }
  };

  return (
    <div className={`confession-item rank-${rank || ''}`}>
      {rank && <div className="rank-badge">{getBadge()}</div>}
      <p>{confession.text}</p>
      <div className="reaction-bar">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            className={selectedEmoji === emoji ? 'selected' : ''}
            onClick={() => toggleReaction(emoji)}
          >
            {emoji} {confession.reactions?.[emoji] || 0}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ConfessionItem;
