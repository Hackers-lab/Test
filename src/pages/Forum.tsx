import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, increment, deleteDoc, writeBatch } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, signInWithGoogle, logOut } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Heart, Trash2, Send, CornerDownRight, LogIn, LogOut } from 'lucide-react';
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

export function Forum() {
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(p);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'posts'));
    return unsub;
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPostTitle.trim() || !newPostContent.trim()) return;

    try {
      // Need a random doc ID first or let addDoc create it but our rules say isValidId. addDoc generates valid ids.
      const postRef = doc(collection(db, 'posts'));
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
        likesCount: increment(1)
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

  if (loading) return <div className="p-8 text-center text-slate-400">Loading forum...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 h-full flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Community Forum</h1>
          <p className="text-slate-400">Join the discussion about WBTools and the integrated ecosystem.</p>
        </div>
        <div>
          {!user ? (
            <button onClick={signInWithGoogle} className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:opacity-90">
              <LogIn className="w-4 h-4" /> Sign In via Google
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full bg-slate-800" />
                <span className="text-sm text-slate-300 font-medium">{user.displayName}</span>
              </div>
              <button onClick={logOut} className="text-slate-500 hover:text-white p-2">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {user && (
        <form onSubmit={handleCreatePost} className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl flex flex-col gap-4">
          <input
            type="text"
            placeholder="What's on your mind? (Title)"
            value={newPostTitle}
            onChange={e => setNewPostTitle(e.target.value)}
            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            required
            maxLength={100}
          />
          <textarea
            placeholder="Describe your thoughts..."
            value={newPostContent}
            onChange={e => setNewPostContent(e.target.value)}
            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors min-h-[100px] resize-y"
            required
            maxLength={5000}
          />
          <div className="flex justify-end">
            <button type="submit" disabled={!newPostTitle.trim() || !newPostContent.trim()} className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-cyan-500 text-slate-900 font-bold px-6 py-2 rounded-xl flex items-center gap-2 transition-colors">
              <Send className="w-4 h-4" /> Post
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-4">
        <AnimatePresence>
          {posts.map(post => (
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
          <div className="text-center py-12 text-slate-500 italic">No discussions yet. Be the first to start one!</div>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, currentUser, onLike, onDelete, isExpanded, onToggleExpand }: { post: Post, currentUser: User | null, onLike: () => void, onDelete: () => void, isExpanded: boolean, onToggleExpand: () => void }) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-slate-900/60 border border-white/5 rounded-3xl p-6 shadow-xl flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={post.authorPhotoURL} alt="" className="w-10 h-10 rounded-full bg-slate-800" />
          <div className="flex flex-col">
            <span className="text-white font-bold text-sm tracking-tight">{post.authorName}</span>
            <span className="text-slate-500 text-xs">{formatDistanceToNow(post.createdAt, { addSuffix: true })}</span>
          </div>
        </div>
        {currentUser?.uid === post.authorId && (
          <button onClick={onDelete} className="text-slate-600 hover:text-red-400 p-1 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="cursor-pointer" onClick={onToggleExpand}>
        <h3 className="text-xl font-bold text-white mb-2">{post.title}</h3>
        <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
      </div>

      <div className="flex items-center gap-6 mt-2 pt-4 border-t border-white/5">
        <button onClick={onLike} className="flex items-center gap-2 text-slate-400 hover:text-pink-500 transition-colors text-sm font-medium">
          <Heart className="w-4 h-4" /> {post.likesCount}
        </button>
        <button onClick={onToggleExpand} className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors text-sm font-medium">
          <MessageSquare className="w-4 h-4" /> {post.commentsCount}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && <CommentsSection postId={post.id} currentUser={currentUser} />}
      </AnimatePresence>
    </motion.div>
  );
}

function CommentsSection({ postId, currentUser }: { postId: string, currentUser: User | null }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const q = query(collection(db, `posts/${postId}/comments`), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    }, (error) => handleFirestoreError(error, OperationType.GET, `posts/${postId}/comments`));
    return unsub;
  }, [postId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newComment.trim()) return;

    try {
      const batch = writeBatch(db);
      
      // We can't use addDoc if we want it in a batch easily without doc() reference creation
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
        commentsCount: increment(1)
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
      className="flex flex-col gap-4 mt-2 overflow-hidden"
    >
      <div className="bg-slate-900/80 rounded-2xl p-4 flex flex-col gap-3">
        {comments.map(comment => (
          <div key={comment.id} className="flex gap-3">
            <CornerDownRight className="w-4 h-4 text-slate-600 shrink-0 mt-1" />
            <div className="flex-1 bg-slate-800/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                 <span className="text-white text-xs font-bold">{comment.authorName}</span>
                 <span className="text-slate-500 text-[10px]">{formatDistanceToNow(comment.createdAt, { addSuffix: true })}</span>
              </div>
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{comment.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && <span className="text-xs text-slate-500 ml-7 italic">No comments yet.</span>}
      </div>
      
      {currentUser && (
        <form onSubmit={handleAddComment} className="flex gap-2 items-start ml-2">
          <img src={currentUser.photoURL || ''} alt="" className="w-8 h-8 rounded-full bg-slate-800 shrink-0 mt-1" />
          <div className="flex-1 bg-slate-800/50 border border-white/10 rounded-xl flex items-center pr-2 focus-within:border-cyan-500 transition-colors">
            <input 
              type="text" 
              placeholder="Write a comment..." 
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
              required
              maxLength={2000}
            />
            <button type="submit" disabled={!newComment.trim()} className="text-cyan-500 hover:text-cyan-400 disabled:opacity-50 disabled:hover:text-cyan-500 p-2">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
}
