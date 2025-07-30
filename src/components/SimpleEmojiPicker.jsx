import { useState, useEffect } from 'react';
import './SimpleEmojiPicker.css';

// Expanded emoji categories with more emojis
const EMOJI_CATEGORIES = {
  recent: ['😂', '❤️', '😍', '🤣', '😊', '🙏', '💕', '😘', '👍', '😅'],
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌', '💒', '💐', '🌹', '🌺', '🌻', '🌷', '🌸'],
  hands: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋'],
  activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️‍♀️', '🏋️', '🏋️‍♂️', '🤼‍♀️', '🤼', '🤼‍♂️', '🤸‍♀️', '🤸', '🤸‍♂️', '⛹️‍♀️', '⛹️', '⛹️‍♂️', '🤺', '🤾‍♀️', '🤾', '🤾‍♂️', '🏌️‍♀️', '🏌️', '🏌️‍♂️', '🏇', '🧘‍♀️', '🧘', '🧘‍♂️', '🏄‍♀️', '🏄', '🏄‍♂️', '🏊‍♀️', '🏊', '🏊‍♂️', '🤽‍♀️', '🤽', '🤽‍♂️', '🚣‍♀️', '🚣', '🚣‍♂️', '🧗‍♀️', '🧗', '🧗‍♂️', '🚵‍♀️', '🚵', '🚵‍♂️', '🚴‍♀️', '🚴', '🚴‍♂️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️'],
  food: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🎂', '🍰', '🍪', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🫖', '🍵', '🧃', '🥤', '🧋', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🫗', '🧊'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'],
  objects: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🪫', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪓', '🪚', '🔩', '⚙️', '🪤', '🧲', '🔫', '💣', '🧨', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩻', '💊', '💉', '🩹', '🩺', '🌡️'],
  symbols: ['❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '⚡', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', '➿', '🌀', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄']
};

const CATEGORY_NAMES = {
  recent: 'Recent',
  smileys: 'Smileys',
  hearts: 'Hearts',
  hands: 'Hands',
  activities: 'Sports',
  food: 'Food',
  animals: 'Animals',
  objects: 'Objects',
  symbols: 'Symbols'
};

const CATEGORY_ICONS = {
  recent: '🕒',
  smileys: '😊',
  hearts: '❤️',
  hands: '👋',
  activities: '⚽',
  food: '🍎',
  animals: '🐶',
  objects: '💡',
  symbols: '💯'
};

function SimpleEmojiPicker({ onEmojiClick, onClose }) {
  const [activeCategory, setActiveCategory] = useState('recent');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEmojis, setFilteredEmojis] = useState(EMOJI_CATEGORIES.recent);

  useEffect(() => {
    if (searchTerm.trim()) {
      // Enhanced search across all categories
      const allEmojis = Object.values(EMOJI_CATEGORIES).flat();
      const filtered = allEmojis.filter(emoji => 
        emoji.includes(searchTerm) || 
        getEmojiName(emoji).toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmojis([...new Set(filtered)].slice(0, 80)); // Remove duplicates and limit results
    } else {
      setFilteredEmojis(EMOJI_CATEGORIES[activeCategory]);
    }
  }, [searchTerm, activeCategory]);

  // Enhanced emoji name mapping for better search
  function getEmojiName(emoji) {
    const names = {
      '😂': 'laugh crying joy funny lol',
      '❤️': 'heart love red romance',
      '😍': 'heart eyes love crush adore',
      '🤣': 'rolling laugh funny hilarious',
      '😊': 'happy smile blush pleased',
      '🙏': 'pray thanks please hope',
      '💕': 'hearts love pink romance',
      '😘': 'kiss love blow kiss',
      '👍': 'thumbs up good yes ok',
      '😅': 'sweat smile nervous laugh',
      '🔥': 'fire hot lit trending',
      '😢': 'cry sad tear upset',
      '😭': 'crying loud sob bawl',
      '🥰': 'love cute smiling hearts',
      '😴': 'sleep tired sleepy zzz',
      '🎉': 'party celebration confetti',
      '💯': 'hundred perfect score',
      '🌟': 'star glitter sparkle',
      '💪': 'strong muscle flex power',
      '🤔': 'thinking hmm wonder',
      '😎': 'cool sunglasses awesome',
      '🤗': 'hug embrace warm',
      '😋': 'yummy delicious tasty',
      '🥳': 'party celebrate birthday',
      '💖': 'sparkling heart love',
      '🌈': 'rainbow colorful pride',
      '✨': 'sparkles magic glitter',
      '🎈': 'balloon party celebration',
      '🍕': 'pizza food italian',
      '🍔': 'burger food fast food',
      '☕': 'coffee drink morning',
      '🍰': 'cake dessert birthday',
      '🎵': 'music note song',
      '📱': 'phone mobile device',
      '💻': 'laptop computer work',
      '🚗': 'car vehicle drive',
      '✈️': 'airplane travel flight',
      '🏠': 'house home building',
      '🌞': 'sun sunny bright',
      '🌙': 'moon night crescent',
      '⭐': 'star favorite rating',
      '❄️': 'snow cold winter',
      '🌸': 'cherry blossom spring',
      '🌺': 'flower hibiscus tropical',
      '🐶': 'dog puppy pet animal',
      '🐱': 'cat kitten pet animal',
      '🎯': 'target goal aim bullseye',
      '🎨': 'art palette creative',
      '📚': 'books study education',
      '🎮': 'game controller gaming',
      '🏆': 'trophy winner champion',
      '💰': 'money rich wealth',
      '🎭': 'theater drama masks',
      '🌍': 'earth world globe',
      '🔑': 'key unlock access',
      '💡': 'idea light bulb bright',
      '⚡': 'lightning bolt energy',
      '🌊': 'wave ocean water',
      '🔮': 'crystal ball fortune',
      '🎪': 'circus carnival fun tent'
    };
    return names[emoji] || '';
  }

  const handleEmojiClick = (emoji) => {
    onEmojiClick({ emoji });
    // Update recent emojis (storing in memory instead of localStorage)
    try {
      const recent = EMOJI_CATEGORIES.recent;
      const updated = [emoji, ...recent.filter(e => e !== emoji)].slice(0, 12);
      EMOJI_CATEGORIES.recent = updated.length > 0 ? updated : ['😂', '❤️', '😍', '🤣', '😊', '🙏', '💕', '😘', '👍', '😅'];
      
      // Update filtered emojis if on recent category
      if (activeCategory === 'recent' && !searchTerm) {
        setFilteredEmojis(EMOJI_CATEGORIES.recent);
      }
    } catch (error) {
      console.warn('Could not save recent emoji:', error);
    }
  };

  const handleCategoryChange = (e, category) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveCategory(category);
    setSearchTerm(''); // Clear search when switching categories
  };

  const handleClose = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose(e);
    }
  };

  return (
    <div className="simple-emoji-picker-overlay" onClick={handleOverlayClick}>
      <div className="simple-emoji-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="simple-emoji-picker-header">
          <div>
            <div className="simple-emoji-picker-title">Choose Emoji</div>
            <div className="simple-emoji-picker-count">{filteredEmojis.length} emojis</div>
          </div>
          <button 
            type="button"
            className="simple-emoji-picker-done"
            onClick={handleClose}
          >
            Done
          </button>
        </div>
        
        <div className="simple-emoji-picker-search-row">
          <div className="simple-emoji-picker-search-icon">🔍</div>
          <input
            type="text"
            className="simple-emoji-picker-search-input"
            placeholder="Search emojis... (try 'happy', 'food', 'heart')"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              type="button"
              className="simple-emoji-picker-clear-btn"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>

        {!searchTerm && (
          <div className="simple-emoji-picker-categories">
            {Object.keys(EMOJI_CATEGORIES).map(category => (
              <button
                key={category}
                type="button"
                className={`simple-emoji-picker-category-btn ${activeCategory === category ? 'active' : ''}`}
                onClick={(e) => handleCategoryChange(e, category)}
                title={CATEGORY_NAMES[category]}
              >
                <span className="category-icon">{CATEGORY_ICONS[category]}</span>
                <span className="category-name">{CATEGORY_NAMES[category]}</span>
              </button>
            ))}
          </div>
        )}

        {searchTerm && (
          <div className="simple-emoji-picker-search-info">
            Search results for "{searchTerm}"
          </div>
        )}

        <div className="simple-emoji-picker-grid">
          {filteredEmojis.map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              type="button"
              className="simple-emoji-picker-emoji-btn"
              onClick={() => handleEmojiClick(emoji)}
              title={getEmojiName(emoji) || emoji}
            >
              {emoji}
            </button>
          ))}
        </div>

        {filteredEmojis.length === 0 && (
          <div className="simple-emoji-picker-empty">
            <div className="icon">🔍</div>
            <div>No emojis found</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Try searching for "smile", "heart", or "food"</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SimpleEmojiPicker;