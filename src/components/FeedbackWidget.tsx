import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Send, ThumbsUp, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface Feedback {
  id: string;
  toolId: string;
  rating: number;
  comment: string;
  authorName: string;
  createdAt: number;
}

interface FeedbackWidgetProps {
  toolId: string;
  toolTitle: string;
}

export function FeedbackWidget({ toolId, toolTitle }: FeedbackWidgetProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    if (!toolId) return;

    const q = query(
      collection(db, 'feedbacks'),
      where('toolId', '==', toolId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Feedback[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as Omit<Feedback, 'id'>) });
        });
        // Sort newest first
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setFeedbacks(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Could not load feedbacks:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      const feedbackId = b__;
      const author = name.trim() || auth.currentUser?.displayName || 'Anonymous Engineer';

      await setDoc(doc(db, 'feedbacks', feedbackId), {
        toolId,
        rating,
        comment: comment.trim(),
        authorName: author,
        createdAt: Date.now(),
      });

      setSubmittedSuccess(true);
      setComment('');
      setTimeout(() => {
        setSubmittedSuccess(false);
        setShowForm(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating =
    feedbacks.length > 0
      ? (feedbacks.reduce((acc, curr) => acc + (curr.rating || 0), 0) / feedbacks.length).toFixed(1)
      : '5.0';

  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-md relative overflow-hidden shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-bold tracking-widest text-cyan-400">Community Ratings & Feedback</span>
          </div>
          <h3 className="text-2xl font-black text-white">{toolTitle} Reviews</h3>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-2xl">
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={w-4 h-4 }
                />
              ))}
            </div>
            <span className="text-white font-black text-sm">{avgRating}</span>
            <span className="text-slate-400 text-xs">({feedbacks.length})</span>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-[0_4px_20px_rgba(6,182,212,0.3)] hover:scale-105 active:scale-95"
          >
            {showForm ? 'Close Form' : 'Write Feedback'}
          </button>
        </div>
      </div>

      {/* Review Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-950/60 border border-cyan-500/20 rounded-2xl p-5 mb-8">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" /> Share your experience with {toolTitle}
          </h4>

          <div className="mb-4">
            <label className="text-xs text-slate-400 block mb-1 font-semibold">Your Rating</label>
            <div className="flex gap-1.5 cursor-pointer">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(s)}
                  className={w-6 h-6 transition-all }
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-semibold">Your Name or Section</label>
              <input
                type="text"
                placeholder="e.g. Subrata (Kharagpur Div) or Leave blank"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-semibold">Review / Suggestion *</label>
              <input
                type="text"
                required
                placeholder="How does this tool help your daily workflow?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            {submittedSuccess ? (
              <span className="text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Thank you! Feedback published.
              </span>
            ) : <span />}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-lg disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Submit Review
            </button>
          </div>
        </form>
      )}

      {/* Feedbacks Listing */}
      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-sm italic">
          No feedback yet. Be the first to share your review!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feedbacks.slice(0, 6).map((fb) => (
            <div key={fb.id} className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">{fb.authorName}</span>
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={w-3 h-3 }
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed italic">"{fb.comment}"</p>
              </div>
              <span className="text-[10px] text-slate-600 mt-3 block">
                {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : 'Recent'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
