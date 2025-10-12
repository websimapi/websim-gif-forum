const { useState, useEffect, useSyncExternalStore } = React;

// Initialize WebsimSocket
const room = new WebsimSocket();

// All available GIF assets
const GIFS = [
  '/asset_0 (1).gif',
  '/asset_1 (1).gif',
  '/asset_2 (2).gif',
  '/asset_3 (1).gif',
  '/asset_4 (1).gif',
  '/asset_5 (1).gif',
  '/asset_6 (1).gif',
  '/asset_7 (1).gif',
  '/asset_8 (1).gif',
  '/asset_9 (1).gif',
  '/asset_10 (2).gif',
  '/asset_11 (1).gif',
  '/asset_12 (1).gif',
  '/asset_13 (2).gif',
  '/asset_14 (2).gif',
  '/asset_15 (1).gif',
  '/asset_16 (2).gif',
  '/asset_17 (1).gif',
  '/asset_18 (2).gif',
  '/asset_19 (1).gif',
  '/asset_20 (2).gif',
  '/asset_21 (1).gif',
  '/asset_22 (3).gif',
  '/asset_23 (2).gif',
  '/asset_24 (3).gif',
  '/asset_25 (2).gif',
  '/asset_26 (1).gif',
  '/asset_27 (2).gif',
  '/asset_28 (1).gif',
  '/asset_29 (1).gif',
  '/asset_30 (9).gif',
  '/asset_31 (1).gif',
  '/asset_32 (2).gif',
  '/asset_33 (3).gif',
  '/asset_34 (12).gif',
  '/asset_35 (2).gif',
  '/asset_36 (1).gif',
  '/asset_37 (1).gif',
  '/asset_38 (1).gif',
  '/asset_39 (1).gif',
  '/asset_40 (1).gif',
  '/asset_41 (1).gif',
  '/asset_42 (2).gif',
  '/asset_43 (2).gif',
  '/asset_44 (2).gif',
];

// Random reaction GIFs
const REACTION_GIFS = GIFS.slice(0, 8);

function PostForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedGif, setSelectedGif] = useState(GIFS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await room.collection('post').create({
        title: title.trim(),
        content: content.trim(),
        gif: selectedGif,
      });

      setTitle('');
      setContent('');
      setSelectedGif(GIFS[0]);
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="post-form" onSubmit={handleSubmit}>
      <h2 style={{ marginBottom: '20px' }}>Create a Post</h2>
      
      <div className="form-group">
        <label>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter post title..."
          required
        />
      </div>

      <div className="form-group">
        <label>Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          required
        />
      </div>

      <div className="form-group">
        <label>Select a GIF Icon</label>
        <div className="gif-selector">
          {GIFS.map((gif) => (
            <img
              key={gif}
              src={gif}
              alt="GIF option"
              className={`gif-option ${selectedGif === gif ? 'selected' : ''}`}
              onClick={() => setSelectedGif(gif)}
            />
          ))}
        </div>
      </div>

      <button type="submit" className="submit-btn" disabled={isSubmitting}>
        {isSubmitting ? 'Posting...' : 'Create Post'}
      </button>
    </form>
  );
}

function PostCard({ post }) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    window.websim.getCurrentUser().then(setCurrentUser);
  }, []);

  const reactions = useSyncExternalStore(
    room.collection('reaction').filter({ post_id: post.id }).subscribe,
    room.collection('reaction').filter({ post_id: post.id }).getList
  );

  const handleReaction = async (gifUrl) => {
    if (!currentUser) return;

    // Check if user already reacted with this gif
    const existingReaction = reactions.find(
      (r) => r.username === currentUser.username && r.gif === gifUrl
    );

    if (existingReaction) {
      await room.collection('reaction').delete(existingReaction.id);
    } else {
      await room.collection('reaction').create({
        post_id: post.id,
        gif: gifUrl,
      });
    }
  };

  const getReactionCount = (gifUrl) => {
    return reactions.filter((r) => r.gif === gifUrl).length;
  };

  const hasUserReacted = (gifUrl) => {
    return currentUser && reactions.some(
      (r) => r.username === currentUser.username && r.gif === gifUrl
    );
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <img src={post.gif} alt="Post icon" className="post-icon" />
        <div className="post-meta">
          <div className="post-author">
            <img
              src={`https://images.websim.com/avatar/${post.username}`}
              alt={post.username}
              className="author-avatar"
            />
            <span className="author-name">{post.username}</span>
          </div>
          <div className="post-time">{formatTime(post.created_at)}</div>
        </div>
      </div>

      <h3 className="post-title">{post.title}</h3>
      <p className="post-content">{post.content}</p>

      <div className="post-actions">
        {REACTION_GIFS.map((gif) => {
          const count = getReactionCount(gif);
          const active = hasUserReacted(gif);
          
          return (
            <button
              key={gif}
              className={`reaction-btn ${active ? 'active' : ''}`}
              onClick={() => handleReaction(gif)}
            >
              <img src={gif} alt="Reaction" className="reaction-gif" />
              {count > 0 && <span className="reaction-count">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function App() {
  const posts = useSyncExternalStore(
    room.collection('post').subscribe,
    room.collection('post').getList
  );

  const sortedPosts = [...posts].reverse();

  return (
    <div className="container">
      <div className="header">
        <h1>GIF Forum</h1>
        <p>Share your thoughts with animated flair</p>
      </div>

      <PostForm />

      <div className="posts-list">
        {sortedPosts.length === 0 ? (
          <div className="empty-state">
            <img src={GIFS[15]} alt="Empty" className="empty-state-icon" />
            <h3>No posts yet</h3>
            <p>Be the first to create a post!</p>
          </div>
        ) : (
          sortedPosts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));

