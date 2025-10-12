const { useState, useEffect, useSyncExternalStore, useCallback } = React;

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
const REACTION_GIFS = GIFS.slice(0, 5);

const useCurrentUser = () => {
    const [currentUser, setCurrentUser] = useState(null);
    useEffect(() => {
        window.websim.getCurrentUser().then(setCurrentUser);
    }, []);
    return currentUser;
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

function GifSelector({ selectedGif, onSelect }) {
    return (
        <div className="gif-selector">
            {GIFS.map((gif) => (
                <img
                    key={gif}
                    src={gif}
                    alt="GIF option"
                    className={`gif-option ${selectedGif === gif ? 'selected' : ''}`}
                    onClick={() => onSelect(gif)}
                />
            ))}
        </div>
    );
}

function PostForm({ categoryId, parentId = null, onPostCreated, replyingTo }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedGif, setSelectedGif] = useState(GIFS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
      // Pre-fill reply content if replying to someone
      if (replyingTo) {
          setContent(`@${replyingTo.username} `);
      }
  }, [replyingTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!parentId && !title.trim()) || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await room.collection('post_v2').create({
        title: parentId ? null : title.trim(),
        content: content.trim(),
        gif: selectedGif,
        categoryId: categoryId,
        parentId: parentId,
      });

      setTitle('');
      setContent('');
      setSelectedGif(GIFS[0]);
      if (onPostCreated) onPostCreated();
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <h2>
        {parentId ? "Post a Reply" : "Create a New Thread"}
      </h2>
      
      {!parentId && (
        <div className="form-group">
            <label>Thread Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter thread title..."
              required
            />
        </div>
      )}

      <div className="form-group">
        <label>{parentId ? "Your Reply" : "First Post Content"}</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          required
        />
      </div>

      <div className="form-group">
        <label>Select a GIF Icon</label>
        <GifSelector selectedGif={selectedGif} onSelect={setSelectedGif} />
      </div>

      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Posting...' : (parentId ? 'Post Reply' : 'Create Thread')}
      </button>
    </form>
  );
}

function PostCard({ post, onReplyClick, isOp = false }) {
    const currentUser = useCurrentUser();
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post.content);

    const reactionsSub = useCallback(room.collection('reaction_v2').filter({ post_id: post.id }).subscribe, [post.id]);
    const reactionsGet = useCallback(() => room.collection('reaction_v2').filter({ post_id: post.id }).getList(), [post.id]);
    const reactions = useSyncExternalStore(reactionsSub, reactionsGet);

    const handleReaction = async (gifUrl) => {
        if (!currentUser) return;

        const existingReaction = reactions.find(
            (r) => r.username === currentUser.username && r.gif === gifUrl
        );

        if (existingReaction) {
            await room.collection('reaction_v2').delete(existingReaction.id);
        } else {
            await room.collection('reaction_v2').create({
                post_id: post.id,
                gif: gifUrl,
            });
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            const postReactions = room.collection('reaction_v2').filter({ post_id: post.id }).getList();
            for (const reaction of postReactions) {
                 await room.collection('reaction_v2').delete(reaction.id);
            }
            await room.collection('post_v2').delete(post.id);
        }
    };
    
    const handleUpdate = async () => {
        if (editedContent.trim() === post.content) {
            setIsEditing(false);
            return;
        }
        await room.collection('post_v2').update(post.id, { content: editedContent.trim() });
        setIsEditing(false);
    };

    const getReactionCount = (gifUrl) => reactions.filter((r) => r.gif === gifUrl).length;

    const hasUserReacted = (gifUrl) => {
        return currentUser && reactions.some(
            (r) => r.username === currentUser.username && r.gif === gifUrl
        );
    };

    const isAuthor = currentUser && currentUser.username === post.username;

    return (
        <div className={`post-card ${isOp ? 'op-post' : ''}`} id={`post-${post.id}`}>
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
                {isAuthor && !isEditing && (
                    <div className="post-card-actions">
                        <button className="btn btn-subtle" onClick={() => setIsEditing(true)}>Edit</button>
                        <button className="btn btn-subtle" onClick={handleDelete}>Delete</button>
                    </div>
                )}
            </div>

            { isOp && <h3 className="post-title">{post.title}</h3> }
            
            {isEditing ? (
                <div className="edit-area">
                    <textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} />
                    <div className="edit-area-actions">
                        <button className="btn btn-primary" onClick={handleUpdate}>Save</button>
                        <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                    </div>
                </div>
            ) : (
                 <p className="post-content">{post.content}</p>
            )}

            <div className="post-actions">
                {REACTION_GIFS.map((gif) => {
                    const count = getReactionCount(gif);
                    const active = hasUserReacted(gif);
                    if (count === 0 && !active) return null;
                    return (
                        <button key={gif} className={`reaction-btn ${active ? 'active' : ''}`} onClick={() => handleReaction(gif)}>
                            <img src={gif} alt="Reaction" className="reaction-gif" />
                            {count > 0 && <span className="reaction-count">{count}</span>}
                        </button>
                    );
                })}
                <div style={{ borderLeft: '1px solid #444', height: '24px', margin: '0 4px' }}></div>
                {REACTION_GIFS.map(gif => {
                     const active = hasUserReacted(gif);
                     if (active) return null;
                     return <button key={`add-${gif}`} className="reaction-btn" onClick={() => handleReaction(gif)}>
                                <img src={gif} alt="Reaction" className="reaction-gif" />
                            </button>
                })}

                {onReplyClick && (
                    <button className="btn btn-secondary" style={{marginLeft: 'auto'}} onClick={() => onReplyClick(post)}>
                        Reply
                    </button>
                )}
            </div>
        </div>
    );
}

function CategoryForm({ category, onFormSubmit }) {
    const [title, setTitle] = useState(category ? category.title : '');
    const [selectedGif, setSelectedGif] = useState(category ? category.gif : GIFS[10]);

    useEffect(() => {
        if(category) {
            setTitle(category.title);
            setSelectedGif(category.gif);
        }
    }, [category]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        const data = { title: title.trim(), gif: selectedGif };
        if (category) {
            await room.collection('category_v1').update(category.id, data);
        } else {
            await room.collection('category_v1').create(data);
            setTitle('');
            setSelectedGif(GIFS[10]);
        }
        onFormSubmit();
    };

    return (
        <form onSubmit={handleSubmit} className="form-container">
            <h2>{category ? 'Edit' : 'Create'} Category</h2>
            <div className="form-group">
                <label>Category Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Category Title" required />
            </div>
            <div className="form-group">
                <label>Select an Icon</label>
                <GifSelector selectedGif={selectedGif} onSelect={setSelectedGif} />
            </div>
            <button type="submit" className="btn btn-primary">{category ? 'Update' : 'Create'} Category</button>
        </form>
    );
}

function CategoryList({ onSelectCategory }) {
    const categories = useSyncExternalStore(
        room.collection('category_v1').subscribe,
        room.collection('category_v1').getList
    );
    const [showForm, setShowForm] = useState(false);

    const handleDelete = async (e, categoryId) => {
        e.stopPropagation();
        if (window.confirm('Are you sure? This will delete the category.')) {
            // Note: Does not delete posts within, per API limitations.
            await room.collection('category_v1').delete(categoryId);
        }
    };
    
    return (
        <div className="category-list-container">
            <div className="page-header">
                <h2>Categories</h2>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : 'New Category'}
                </button>
            </div>

            {showForm && <CategoryForm onFormSubmit={() => setShowForm(false)} />}
            
            <div className="category-list">
                {categories.map(cat => (
                    <div key={cat.id} className="category-item" onClick={() => onSelectCategory(cat)}>
                        <div className="item-info">
                            <img src={cat.gif} alt={cat.title} />
                            <div className="item-info-text">
                                <span className="title">{cat.title}</span>
                            </div>
                        </div>
                        <div className="item-actions">
                            <button className="btn btn-danger" onClick={(e) => handleDelete(e, cat.id)}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ThreadList({ category, onSelectThread, onBack }) {
    const threadSubscribe = useCallback(room.collection('post_v2').filter({ categoryId: category.id, parentId: null }).subscribe, [category.id]);
    const threadGet = useCallback(() => room.collection('post_v2').filter({ categoryId: category.id, parentId: null }).getList(), [category.id]);
    const threads = useSyncExternalStore(threadSubscribe, threadGet);
    const [showForm, setShowForm] = useState(false);

    const sortedThreads = [...threads].reverse();

    return (
        <div className="thread-list-container">
            <div className="page-header">
                 <button onClick={onBack} className="btn btn-secondary">‹ Back</button>
                <h2>{category.title}</h2>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : 'New Thread'}
                </button>
            </div>
            
            {showForm && <PostForm categoryId={category.id} onPostCreated={() => setShowForm(false)} />}
            
            <div className="thread-list">
                {sortedThreads.length > 0 ? (
                    sortedThreads.map(thread => (
                        <div key={thread.id} className="thread-item" onClick={() => onSelectThread(thread)}>
                            <div className="item-info">
                                <img src={thread.gif} />
                                <div className="item-info-text">
                                    <div className="title">{thread.title}</div>
                                    <div className="meta">by {thread.username} - {formatTime(thread.created_at)}</div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : <p>No threads here yet. Be the first to create one!</p>}
            </div>
        </div>
    );
}

function ThreadView({ thread, onBack }) {
    const postSubscribe = useCallback(room.collection('post_v2').subscribe, []);
    const postGet = useCallback(room.collection('post_v2').getList, []);
    const allPosts = useSyncExternalStore(postSubscribe, postGet);
    
    const [replyingTo, setReplyingTo] = useState(null);

    const threadPosts = allPosts.filter(p => p.id === thread.id || p.parentId === thread.id);
    const op = threadPosts.find(p => p.id === thread.id);
    const replies = threadPosts.filter(p => p.parentId === thread.id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    const handleReplyClick = (post) => {
        setReplyingTo(post);
        document.getElementById('reply-form').scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="thread-view-container">
             <div className="page-header">
                <button onClick={onBack} className="btn btn-secondary">‹ Back to Threads</button>
            </div>
            {op && <PostCard post={op} isOp={true} />}
            
            {replies.length > 0 && (
                <div className="replies-list">
                    <h3>Replies ({replies.length})</h3>
                    {replies.map(reply => (
                        <PostCard key={reply.id} post={reply} onReplyClick={handleReplyClick} />
                    ))}
                </div>
            )}
            
            <div id="reply-form" style={{marginTop: '30px'}}>
                 {replyingTo && (
                    <div className="reply-indicator">
                        <span>Replying to <strong>{replyingTo.username}</strong></span>
                        <button onClick={() => setReplyingTo(null)}>&times;</button>
                    </div>
                )}
                <PostForm 
                    categoryId={thread.categoryId} 
                    parentId={thread.id} 
                    onPostCreated={() => setReplyingTo(null)}
                    replyingTo={replyingTo}
                />
            </div>
        </div>
    );
}

function App() {
    const [view, setView] = useState('categories'); // categories, threads, thread
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedThread, setSelectedThread] = useState(null);

    const handleSelectCategory = (category) => {
        setSelectedCategory(category);
        setView('threads');
    };

    const handleSelectThread = (thread) => {
        setSelectedThread(thread);
        setView('thread');
    };

    const backToCategories = () => {
        setView('categories');
        setSelectedCategory(null);
    };

    const backToThreads = () => {
        setView('threads');
        setSelectedThread(null);
    };

    const renderView = () => {
        switch (view) {
            case 'thread':
                return <ThreadView thread={selectedThread} onBack={backToThreads} />;
            case 'threads':
                return <ThreadList category={selectedCategory} onSelectThread={handleSelectThread} onBack={backToCategories} />;
            case 'categories':
            default:
                return <CategoryList onSelectCategory={handleSelectCategory} />;
        }
    };
    
    return (
        <div className="container">
            <header className="header">
                 <img src="/asset_28 (1).gif" alt="Forum Logo" className="header-logo"/>
                 <div className="header-text">
                    <h1>GIF Forum</h1>
                    <p>Where every conversation is animated</p>
                 </div>
            </header>
            <main className="main-content">
                {renderView()}
            </main>
        </div>
    );
}


ReactDOM.render(<App />, document.getElementById('root'));