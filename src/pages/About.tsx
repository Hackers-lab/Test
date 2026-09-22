import { PageTransition } from '../App';
import { Layers, Zap, ShieldCheck, Cpu } from 'lucide-react';

export function About() {
  return (
    <PageTransition>
      <div className="p-4 md:p-8 max-w-4xl mx-auto h-full pb-24">
        
        <div className="text-center py-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
            About WB<span className="text-cyan-400">TOOLS</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
            A dedicated utility and workflow automation ecosystem designed to streamline field operations, consumer data inspection, and estimation processing.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden mb-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px]"></div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Why was WBTOOLS created?</h2>
          <p className="text-slate-400 text-base md:text-lg leading-relaxed mb-6">
            Utility and field personnel frequently encounter bottlenecks when handling vast consumer datasets, manual electrical line drafting, offline record synchronization, and notice generation. 
          </p>
          <p className="text-slate-400 text-base md:text-lg leading-relaxed mb-6">
            WBTOOLS was built to solve these real-world challenges by providing modern, ultra-responsive web applications and lightweight desktop binaries that eliminate tedious administrative tasks and accelerate day-to-day decision-making directly on site and in office.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Instant Execution</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Designed for performance with local browser processing and instantaneous query responses.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Modular Tools</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              From meter image diagnostics to line estimators and disconnection managers, all in one portal.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Secure & Reliable</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Always up-to-date with direct release distributions, transparent release notes, and active monitoring.
            </p>
          </div>
        </div>

      </div>
    </PageTransition>
  );
}
