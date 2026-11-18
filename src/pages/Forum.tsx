import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  increment,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, signInWithGoogle, logOut } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Heart,
  Trash2,
  Send,
  CornerDownRight,
  LogIn,
  LogOut,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  content: string;
  createdAt: number;
}

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  title: string;
  content: string;
  createdAt: number;
  likesCount: number;
  commentsCount: number;
}

function Avatar({ src, name, size = 'md' }: { src?: string; name?: string; size?: 'sm' | 'md' }) {
  const [failed, setFailed] = useState(false);
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  const initials = (name || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (!src || failed) {
    return (
      <div
        className={`${dim} rounded-full bg-slate-200 text-slate-700 font-semibold flex items-center justify-center shrink-0`}
        aria-hidden="true"
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || 'User avatar'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${dim} rounded-full bg-slate-200 object-cover shrink-0 border border-slate-200`}
    />
  );
}

export function Forum() {
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch {
      setAuthError('Authentication failed. Please check if popups are blocked.');
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const p = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Post));
        setPosts(p);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'posts')
    );
    return unsub;
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPostTitle.trim() || !newPostContent.trim()) return;

    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhotoURL: user.photoURL || '',
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        likesCount: 0,
        commentsCount: 0,
      });
      setNewPostTitle('');
      setNewPostContent('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likesCount: increment(1),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="w-6 h-6 text-blue-700 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-semibold text-blue-700 mb-1.5">Discussions</p>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            Community Forum
          </h1>
          <p className="text-slate-600 text-sm md:text-base">
            Share workflows, ask configuration questions, and discuss WBTools utilities.
          </p>
        </div>
        <div className="shrink-0">
          {!user ? (
            <div className="flex flex-col items-start sm:items-end gap-1.5">
              <button
                type="button"
                onClick={handleSignIn}
                className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0"
              >
                <LogIn className="w-4 h-4" /> Sign in with Google
              </button>
              {authError && <span className="text-xs text-red-600 font-medium">{authError}</span>}
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
              <Avatar src={user.photoURL || ''} name={user.displayName || 'User'} size="sm" />
              <span className="text-xs text-slate-800 font-semibold max-w-[160px] truncate">
                {user.displayName}
              </span>
              <button
                type="button"
                onClick={logOut}
                title="Sign out"
                aria-label="Sign out"
                className="text-slate-500 hover:text-slate-900 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {user && (
        <form
          onSubmit={handleCreatePost}
          className="bg-white border border-slate-200 p-6 rounded-xl flex flex-col gap-4"
        >
          <h2 className="font-display text-sm font-bold text-slate-900">Start a new thread</h2>
          <input
            type="text"
            placeholder="Thread title"
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            required
            maxLength={100}
          />
          <textarea
            placeholder="Write your question, tip, or feedback..."
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 min-h-[100px] resize-y"
            required
            maxLength={5000}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newPostTitle.trim() || !newPostContent.trim()}
              className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2.5 rounded-lg inline-flex items-center gap-2 transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" /> Publish Post
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-4">
        <AnimatePresence>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={user}
              onLike={() => handleLike(post.id)}
              onDelete={() => handleDeletePost(post.id)}
              isExpanded={expandedPost === post.id}
              onToggleExpand={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
            />
          ))}
        </AnimatePresence>
        {posts.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl text-center py-12 text-slate-500 text-sm">
            No discussions yet. Sign in to start the first thread.
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({
  post,
  currentUser,
  onLike,
  onDelete,
  isExpanded,
  onToggleExpand,
}: {
  post: Post;
  currentUser: User | null;
  onLike: () => void;
  onDelete: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar src={post.authorPhotoURL} name={post.authorName} />
          <div className="flex flex-col">
            <span className="text-slate-900 font-semibold text-sm">{post.authorName}</span>
            <span className="text-slate-500 text-xs">
              {formatDistanceToNow(post.createdAt, { addSuffix: true })}
            </span>
          </div>
        </div>
        {currentUser?.uid === post.authorId && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete post"
            className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="cursor-pointer" onClick={onToggleExpand}>
        <h3 className="font-display text-lg font-bold text-slate-900 mb-1.5 hover:text-blue-700 transition-colors">
          {post.title}
        </h3>
        <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
      </div>

      <div className="flex items-center gap-6 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onLike}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-rose-600 transition-colors text-xs font-semibold tabular-nums"
        >
          <Heart className="w-4 h-4" /> {post.likesCount}
        </button>
        <button
          type="button"
          onClick={onToggleExpand}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-700 transition-colors text-xs font-semibold tabular-nums"
        >
          <MessageSquare className="w-4 h-4" /> {post.commentsCount}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && <CommentsSection postId={post.id} currentUser={currentUser} />}
      </AnimatePresence>
    </motion.article>
  );
}

function CommentsSection({ postId, currentUser }: { postId: string; currentUser: User | null }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const q = query(collection(db, `posts/${postId}/comments`), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setComments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Comment)));
      },
      (error) => handleFirestoreError(error, OperationType.GET, `posts/${postId}/comments`)
    );
    return unsub;
  }, [postId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newComment.trim()) return;

    try {
      const batch = writeBatch(db);
      const commentRef = doc(collection(db, `posts/${postId}/comments`));
      batch.set(commentRef, {
        postId,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Anonymous',
        authorPhotoURL: currentUser.photoURL || '',
        content: newComment.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const postRef = doc(db, 'posts', postId);
      batch.update(postRef, {
        commentsCount: increment(1),
      });

      await batch.commit();
      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `posts/${postId}/comments`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex flex-col gap-3 pt-2 overflow-hidden"
    >
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2.5">
            <CornerDownRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
            <div className="flex-1 bg-white border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-slate-900 text-xs font-semibold">{comment.authorName}</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-slate-500 text-xs">
                  {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                </span>
              </div>
              <p className="text-slate-700 text-sm whitespace-pre-wrap">{comment.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <span className="text-xs text-slate-500 ml-6">No comments yet.</span>
        )}
      </div>

      {currentUser && (
        <form onSubmit={handleAddComment} className="flex gap-2.5 items-center">
          <Avatar
            src={currentUser.photoURL || ''}
            name={currentUser.displayName || 'User'}
            size="sm"
          />
          <div className="flex-1 bg-white border border-slate-300 rounded-lg flex items-center pr-1.5 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/15">
            <input
              type="text"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              required
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              aria-label="Submit comment"
              className="text-blue-700 hover:text-blue-800 disabled:opacity-40 p-2 rounded-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
}
