import { ExternalLink, Terminal, Code2, Cpu } from 'lucide-react';
import { PageTransition } from '../App';

export function About() {
  return (
    <PageTransition>
      <div className="p-4 md:p-8 max-w-4xl mx-auto h-full pb-24">
        
        <div className="text-center py-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">About WB<span className="text-cyan-400">TOOLS</span></h1>
          <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Built by Pramod to provide powerful automation tools, image viewers, and estimators all tailored for specialized workflows. 
            Welcome to the ecosystem!
          </p>
        </div>

        <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden mb-12">
           <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px]"></div>
           <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
             <div className="w-32 h-32 md:w-48 md:h-48 shrink-0 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 p-1">
               <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center overflow-hidden">
                 <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-purple-500">PT</span>
               </div>
             </div>
             <div>
               <h2 className="text-3xl font-bold text-white mb-4">Pramod</h2>
               <p className="text-slate-400 text-lg mb-6 leading-relaxed">
                 Developer and creator of WBTools ecosystem. Specializing in highly efficient, reliable data estimators and rendering tools. Connect with me for custom solutions, new software ideas, or reporting issues.
               </p>
               <div className="flex gap-4 flex-wrap">
                 <a href="mailto:pramod.theroxtar@gmail.com" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors">
                   pramod.theroxtar@gmail.com
                 </a>
               </div>
             </div>
           </div>
        </div>

        {/* Instructions for Author */}
        <div className="bg-[#0f172a] border border-cyan-500/20 rounded-3xl p-8 relative">
           <div className="flex items-center gap-3 mb-6 border-b border-cyan-500/20 pb-4">
             <Terminal className="w-6 h-6 text-cyan-400" />
             <h3 className="text-2xl font-bold text-white">How To Update Your Apps</h3>
           </div>
           
           <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
             <p className="bg-black/30 p-4 rounded-xl border border-white/5">
                This website is dynamically linked to your GitHub repositories (e.g. <code>Hackers-lab/spotimageviewer</code>). 
                You do not need to redeploy the website to update the content. Just make a new Release on GitHub!
             </p>
             
             <div>
               <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><Cpu className="w-4 h-4"/> 1. Linking Binaries</h4>
               <p className="pl-6 text-slate-400">
                 Whenever you finish a version, create a new <strong>Release</strong> in your repository. 
                 Attach your compiled <code>.exe</code>, <code>.zip</code>, or installers there. The website automatically shows them in the <strong>Downloads</strong> section and <strong>Tools</strong> pages.
               </p>
             </div>

             <div>
               <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><Code2 className="w-4 h-4"/> 2. Adding Video and Images</h4>
               <p className="pl-6 text-slate-400">
                 By default, the <strong>Tools</strong> page shows your repository's <code>README.md</code>. 
                 To display a custom YouTube tutorial for your tool, simply include a Markdown link with exactly this format anywhere in your README.md or Release Notes:
               </p>
               <div className="pl-6 mt-3">
                 <code className="block bg-slate-900 border border-white/10 p-4 rounded-xl text-cyan-400 font-mono text-xs">
                   [YouTubeVideo](https://www.youtube.com/watch?v=YOUR_VIDEO_ID)
                 </code>
               </div>
               <p className="pl-6 text-slate-400 mt-3">
                 The website will automatically search for links matching YouTube and embed the primary player on the Tools page! Images in your README are rendered automatically.
               </p>
             </div>
           </div>
        </div>

      </div>
    </PageTransition>
  );
}
