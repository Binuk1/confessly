import{ useState } from 'react';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

function ConfessionForm() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    await addDoc(collection(db, 'confessions'), {
      text: text.trim(),
      createdAt: serverTimestamp(),
      reactions: {},
    });
    setText('');
    setLoading(false);
  };

  return (
    <form className="confession-form" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your confession..."
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Posting...' : 'Confess'}
      </button>
    </form>
  );
}

export default ConfessionForm;