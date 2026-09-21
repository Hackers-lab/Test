import { PageTransition } from '../App';

export function About() {
  return (
    <PageTransition>
      <div className="p-4 md:p-8 max-w-4xl mx-auto h-full pb-24">
        
        <div className="text-center py-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">About WB<span className="text-cyan-400">TOOLS</span></h1>
          <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Built by Pramod Verma to provide powerful automation tools, image viewers, and estimators all tailored for specialized workflows. 
            Welcome to the ecosystem!
          </p>
        </div>

        <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden mb-12">
           <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px]"></div>
           <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
             <div className="w-32 h-32 md:w-48 md:h-48 shrink-0 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 p-1">
               <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center overflow-hidden">
                 <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-purple-500">PV</span>
               </div>
             </div>
             <div>
               <h2 className="text-3xl font-bold text-white mb-4">Pramod Verma</h2>
               <p className="text-slate-400 text-lg mb-6 leading-relaxed">
                 Developer and creator of the tools ecosystem. Specializing in highly efficient, reliable data estimators and rendering tools. Connect with me for custom solutions, new software ideas, or reporting issues.
               </p>
               <div className="flex gap-4 flex-wrap">
                 <a href="mailto:pramod.theroxtar@gmail.com" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors">
                   pramod.theroxtar@gmail.com
                 </a>
               </div>
             </div>
           </div>
        </div>

      </div>
    </PageTransition>
  );
}
