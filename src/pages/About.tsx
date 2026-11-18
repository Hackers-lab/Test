import { PageTransition } from '../App';
import { Layers, Zap, ShieldCheck } from 'lucide-react';

export function About() {
  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        <div className="border-b border-slate-200 pb-8 mb-10">
          <p className="text-xs font-semibold text-blue-700 mb-2">Platform Overview</p>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            About WBTools
          </h1>
          <p className="text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl">
            A dedicated utility and workflow automation suite built to streamline field operations,
            consumer data inspection, and electrical line estimation.
          </p>
        </div>

        <section className="bg-white border border-slate-200 rounded-xl p-8 md:p-10 mb-8">
          <h2 className="font-display text-2xl font-bold text-slate-900 mb-4">
            Why WBTools was built
          </h2>
          <p className="text-slate-700 text-base leading-relaxed mb-4">
            Utility and field personnel frequently encounter bottlenecks when handling large consumer
            datasets, manual electrical line drafting, offline record synchronization, and notice
            generation.
          </p>
          <p className="text-slate-600 text-base leading-relaxed">
            WBTools addresses these challenges with responsive browser applications and lightweight
            desktop binaries that reduce repetitive manual work and support faster decision-making
            both in the office and on site.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          <div className="p-6">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-display text-base font-bold text-slate-900 mb-2">
              Instant Execution
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Engineered for local browser processing and fast query responses across large consumer
              datasets.
            </p>
          </div>

          <div className="p-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-display text-base font-bold text-slate-900 mb-2">Modular Tools</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Meter image inspection, LT/HT line estimation, and disconnection tracking unified in
              one portal.
            </p>
          </div>

          <div className="p-6">
            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-display text-base font-bold text-slate-900 mb-2">
              Verified Releases
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Centralized release distributions, transparent changelogs, and verified installers in
              one unified portal.
            </p>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
