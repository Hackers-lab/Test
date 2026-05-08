import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { PageTransition } from '../App';
import { Trash2, Plus, Loader2 } from 'lucide-react';

export interface Repository {
  id: string;
  repoName: string; // e.g. "Hackers-lab/spotimageviewer"
  title: string;
  description: string;
  createdAt: number;
}

export function Settings() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRepo, setNewRepo] = useState({ repoName: '', title: '', description: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'repositories'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: Repository[] = [];
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() } as Repository);
      });
      setRepos(results.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepo.repoName || !newRepo.title) return;
    setIsAdding(true);
    setErrorMsg('');
    try {
      // If DB is empty, seed the two defaults before adding the new one
      if (repos.length === 0) {
        const initialApps = [
          {
            repoName: "Hackers-lab/spotimageviewer",
            title: "Spot Image Viewer",
            description: "Search meter images within a fraction of a second using consumer ID, name, meter number, or mobile number. Includes utilities like a theft bill calculator.",
            createdAt: Date.now() - 2000
          },
          {
            repoName: "Hackers-lab/estimator",
            title: "Estimator",
            description: "Draw electrical lines on a canvas and automatically generate estimates. Features LT/HT lines, DTR structures, and allows exporting drawings and estimates to PDF and Excel.",
            createdAt: Date.now() - 1000
          }
        ];
        for (const app of initialApps) {
          const id = app.repoName.replace('/', '_').toLowerCase();
          await setDoc(doc(db, 'repositories', id), app);
        }
      }

      const repoId = newRepo.repoName.replace('/', '_').toLowerCase();
      await setDoc(doc(db, 'repositories', repoId), {
        repoName: newRepo.repoName,
        title: newRepo.title,
        description: newRepo.description,
        createdAt: Date.now()
      });
      setNewRepo({ repoName: '', title: '', description: '' });
    } catch (err: any) {
      setErrorMsg("Error adding repo: " + err.message);
    }
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    setErrorMsg('');
    try {
      await deleteDoc(doc(db, 'repositories', id));
      setDeletingId(null);
    } catch (err: any) {
      setErrorMsg("Error deleting repo: " + err.message);
    }
  }

  if (auth.currentUser?.email !== 'pramod.theroxtar@gmail.com') {
    return (
      <PageTransition>
        <div className="p-8 text-center text-red-400">Unauthorized</div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-black text-white mb-8 flex items-center gap-3">
          Configuration <span className="text-sm font-normal text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">Admin Only</span>
        </h1>

        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl mb-10">
          <h2 className="text-xl font-bold text-white mb-6">Add GitHub Repository</h2>
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}
          <form onSubmit={handleAddRepo} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Repo Slug (e.g. Hackers-lab/spotimageviewer)</label>
              <input 
                required
                value={newRepo.repoName}
                onChange={e => setNewRepo({...newRepo, repoName: e.target.value})}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500" 
                placeholder="Owner/Repo"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Display Title</label>
              <input 
                required
                value={newRepo.title}
                onChange={e => setNewRepo({...newRepo, title: e.target.value})}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500" 
                placeholder="E.g. Spot Image Viewer"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Short Description</label>
              <textarea 
                rows={3}
                required
                value={newRepo.description}
                onChange={e => setNewRepo({...newRepo, description: e.target.value})}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500" 
                placeholder="A tool to..."
              />
            </div>
            <button 
              disabled={isAdding}
              type="submit" 
              className="mt-2 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold p-3 rounded-lg transition-colors"
            >
              {isAdding ? <Loader2 className="animate-spin w-5 h-5" /> : <><Plus className="w-5 h-5" /> Add Repository</>}
            </button>
          </form>
        </div>

        <h2 className="text-xl font-bold text-white mb-4">Active Managed Repositories</h2>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div>
        ) : repos.length === 0 ? (
          <div className="text-slate-500 p-8 text-center bg-slate-900/50 rounded-2xl border border-white/5">No repositories added yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {repos.map(repo => (
              <div key={repo.id} className="bg-slate-900 border border-white/10 rounded-xl p-5 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{repo.title}</h3>
                  <code className="text-xs text-cyan-400 block mt-1 mb-2">{repo.repoName}</code>
                  <p className="text-slate-400 text-sm leading-relaxed">{repo.description}</p>
                </div>
                {deletingId === repo.id ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-red-400 font-bold">Delete this?</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDelete(repo.id)}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-500 text-xs font-bold rounded"
                      >
                        Yes
                      </button>
                      <button 
                        onClick={() => setDeletingId(null)}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setDeletingId(repo.id)}
                    className="p-2 text-red-500/50 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
                    title="Remove from apps"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}

