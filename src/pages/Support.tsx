import { useState } from 'react';
import { Mail, MessageSquare, ArrowRight, Send, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { PageTransition } from '../App';

export function Support() {
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('submitting');
    setTimeout(() => {
      setFormState('success');
    }, 1000);
  };

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        <div className="border-b border-slate-200 pb-8 mb-10">
          <p className="text-xs font-semibold text-blue-700 mb-2">Help &amp; Assistance</p>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            Support &amp; Resources
          </h1>
          <p className="text-base text-slate-600 max-w-2xl">
            Need help configuring desktop utilities, troubleshooting releases, or requesting a new
            workflow feature? Reach out below.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Quick Options */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="w-10 h-10 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 mb-2">
                Community Forum
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-5">
                Join other field engineers and operators to ask questions, share setups, and browse
                existing answers.
              </p>
              <Link
                to="/forum"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors"
              >
                Open Community Forum
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="w-10 h-10 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg flex items-center justify-center mb-4">
                <Mail className="w-5 h-5" />
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 mb-2">Direct Inquiry</h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                For deployment assistance, bug reports, or custom tool requests, submit a message
                using the form.
              </p>
              <p className="text-xs font-medium text-slate-500">
                Typical response time: under 24 hours
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 md:p-8">
            <h2 className="font-display text-xl font-bold text-slate-900 mb-6">
              Send us a message
            </h2>

            {formState === 'success' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900 mb-1.5">
                  Message Received
                </h3>
                <p className="text-sm text-slate-600 max-w-sm mb-6">
                  Thanks for reaching out. We will review your note and respond shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setFormState('idle')}
                  className="text-blue-700 hover:text-blue-800 font-semibold text-sm"
                >
                  Send another message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="support-name" className="text-xs font-semibold text-slate-700">
                      Name
                    </label>
                    <input
                      id="support-name"
                      type="text"
                      required
                      className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                      placeholder="Your name"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="support-email" className="text-xs font-semibold text-slate-700">
                      Email Address
                    </label>
                    <input
                      id="support-email"
                      type="email"
                      required
                      className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="support-message" className="text-xs font-semibold text-slate-700">
                    Message
                  </label>
                  <textarea
                    id="support-message"
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 min-h-[140px] resize-y"
                    placeholder="Describe your issue or request..."
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={formState === 'submitting'}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors duration-150 disabled:opacity-60 whitespace-nowrap shrink-0"
                  >
                    {formState === 'submitting' ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Message
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
