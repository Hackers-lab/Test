import React, { useState, useEffect } from 'react';
import { Star, Send, CheckCircle, Loader2, MessageSquarePlus } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
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
      const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
    <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-6">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">
            User Ratings · Feedback
          </p>
          <h3 className="font-display text-xl font-bold text-slate-900">{toolTitle} Reviews</h3>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex text-amber-500" aria-label={`Average rating ${avgRating} out of 5`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${star <= Math.round(Number(avgRating)) ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`}
                />
              ))}
            </div>
            <span className="font-mono tabular-nums font-semibold text-slate-900">{avgRating}</span>
            <span className="font-mono tabular-nums text-xs text-slate-500">({feedbacks.length})</span>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            {showForm ? 'Close Form' : 'Write Feedback'}
          </button>
        </div>
      </div>

      {/* Review Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-6">
          <h4 className="font-display text-sm font-bold text-slate-900 mb-4">
            Share your experience with {toolTitle}
          </h4>

          <div className="mb-4">
            <label className="text-xs text-slate-600 block mb-1.5 font-medium">Your Rating</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(s)}
                  aria-label={`Rate ${s} star${s > 1 ? 's' : ''}`}
                  className="p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                >
                  <Star
                    className={`w-5 h-5 transition-colors duration-150 ${
                      s <= (hoverRating || rating) ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-600 block mb-1.5 font-medium">Your Name or Section</label>
              <input
                type="text"
                placeholder="e.g. Subrata (Kharagpur Div)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1.5 font-medium">Review or Suggestion *</label>
              <input
                type="text"
                required
                placeholder="How does this tool help your daily workflow?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            {submittedSuccess ? (
              <span className="text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Thank you. Feedback published.
              </span>
            ) : (
              <span />
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors duration-150 disabled:opacity-50 whitespace-nowrap shrink-0"
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
          <Loader2 className="w-5 h-5 text-blue-700 animate-spin" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          No feedback yet. Be the first to share a review.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feedbacks.slice(0, 6).map((fb) => (
            <div key={fb.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-900">{fb.authorName}</span>
                  <div className="flex text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${s <= fb.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">&ldquo;{fb.comment}&rdquo;</p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : 'Recent'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
