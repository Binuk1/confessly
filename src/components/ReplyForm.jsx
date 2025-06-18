import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

function ReplyForm({ confessionId }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    
    await addDoc(collection(db, 'confessions', confessionId, 'replies'), {
      text: text.trim(),
      createdAt: serverTimestamp()
    });
    
    setText('');
    setLoading(false);
  };

  return (
    <form className="reply-form" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your reply..."
        rows={2}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Posting...' : 'Reply'}
      </button>
    </form>
  );
}

export default ReplyForm;