import { useState } from 'react';
import { Mail, MessageSquare, ExternalLink, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { PageTransition } from '../App';

export function Support() {
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('submitting');
    // Simulate sending an email/message to backend
    setTimeout(() => {
      setFormState('success');
    }, 1500);
  };

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 py-12 h-full">
        
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">Support & Resources</h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Need help configuring the tools, or have a feature request? We're here to assist.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Quick Options */}
          <div className="flex flex-col gap-6">
             <div className="glass-panel glass-panel-hover rounded-3xl p-8 transition-all group">
               <div className="w-12 h-12 bg-cyan-500/20 text-cyan-400 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                 <MessageSquare className="w-6 h-6" />
               </div>
               <h2 className="text-2xl font-bold text-white mb-2">Community Forum</h2>
               <p className="text-slate-400 mb-6">
                 Join our community of developers and users. Ask questions, share your experience, and find quick answers from the community.
               </p>
               <Link to="/forum" className="inline-flex items-center gap-2 text-cyan-400 font-bold hover:text-cyan-300 transition-colors">
                 Go to Forum <ExternalLink className="w-4 h-4" />
               </Link>
             </div>

             <div className="glass-panel glass-panel-hover rounded-3xl p-8 transition-all group">
               <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
                 <Mail className="w-6 h-6" />
               </div>
               <h2 className="text-2xl font-bold text-white mb-2">Direct Inquiry</h2>
               <p className="text-slate-400 mb-6">
                 For urgent inquiries, feature requests, or deployment feedback, send a direct message using our contact form.
               </p>
               <span className="text-sm font-semibold text-purple-400">
                 Average response time: &lt; 24 hours
               </span>
             </div>
          </div>

          {/* Contact Form */}
          <div className="glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-bl-[100px] pointer-events-none blur-[60px]"></div>
             
             <h2 className="text-2xl font-bold text-white mb-6">Send us a message</h2>
             
             {formState === 'success' ? (
               <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center h-64 text-center">
                 <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-4">
                   <Send className="w-8 h-8" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">Message Sent!</h3>
                 <p className="text-slate-400">Thanks for reaching out. We will get back to you shortly.</p>
                 <button onClick={() => setFormState('idle')} className="mt-8 text-cyan-400 hover:text-cyan-300 font-medium text-sm">Send another message</button>
               </motion.div>
             ) : (
               <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
                 <div className="flex flex-col gap-2">
                   <label className="text-sm font-bold text-slate-300">Name</label>
                   <input type="text" required className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors" placeholder="John Doe" />
                 </div>
                 <div className="flex flex-col gap-2">
                   <label className="text-sm font-bold text-slate-300">Email Address</label>
                   <input type="email" required className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors" placeholder="john@example.com" />
                 </div>
                 <div className="flex flex-col gap-2">
                   <label className="text-sm font-bold text-slate-300">Message</label>
                   <textarea required className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors min-h-[120px] resize-y" placeholder="How can we help?" />
                 </div>
                 <button 
                   type="submit" 
                   disabled={formState === 'submitting'}
                   className="mt-4 w-full bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                 >
                   {formState === 'submitting' ? (
                     <div className="w-5 h-5 border-2 border-t-white/30 border-white rounded-full animate-spin"></div>
                   ) : "Send Message"}
                 </button>
               </form>
             )}
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
