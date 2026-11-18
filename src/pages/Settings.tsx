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
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results: Repository[] = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() } as Repository);
        });
        setRepos(results.sort((a, b) => b.createdAt - a.createdAt));
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepo.repoName || !newRepo.title) return;
    setIsAdding(true);
    setErrorMsg('');
    try {
      if (repos.length === 0) {
        const initialApps = [
          {
            repoName: 'Hackers-lab/spotimageviewer',
            title: 'Spot Image Viewer',
            description:
              'Search meter images within a fraction of a second using consumer ID, name, meter number, or mobile number. Includes utilities like a theft bill calculator.',
            createdAt: Date.now() - 2000,
          },
          {
            repoName: 'Hackers-lab/estimator',
            title: 'Estimator',
            description:
              'Draw electrical lines on a canvas and automatically generate estimates. Features LT/HT lines, DTR structures, and allows exporting drawings and estimates to PDF and Excel.',
            createdAt: Date.now() - 1000,
          },
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
        createdAt: Date.now(),
      });
      setNewRepo({ repoName: '', title: '', description: '' });
    } catch (err: any) {
      setErrorMsg('Error adding repo: ' + err.message);
    }
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    setErrorMsg('');
    try {
      await deleteDoc(doc(db, 'repositories', id));
      setDeletingId(null);
    } catch (err: any) {
      setErrorMsg('Error deleting repo: ' + err.message);
    }
  };

  if (auth.currentUser?.email !== 'pramod.theroxtar@gmail.com') {
    return (
      <PageTransition>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="bg-white border border-red-200 rounded-xl p-8">
            <h1 className="font-display text-lg font-bold text-red-700 mb-1">Unauthorized</h1>
            <p className="text-sm text-slate-600">
              Administrator credentials are required to view this page.
            </p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        <div className="border-b border-slate-200 pb-6 mb-8">
          <p className="text-xs font-semibold text-blue-700 mb-1">Administrator Console</p>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight">
            Repository Configuration
          </h1>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-10">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-5">
            Add Utility Application
          </h2>
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}
          <form onSubmit={handleAddRepo} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  App Identifier (org/slug)
                </label>
                <input
                  required
                  value={newRepo.repoName}
                  onChange={(e) => setNewRepo({ ...newRepo, repoName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  placeholder="org/app-name"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Display Title
                </label>
                <input
                  required
                  value={newRepo.title}
                  onChange={(e) => setNewRepo({ ...newRepo, title: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  placeholder="Spot Image Viewer"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                Short Description
              </label>
              <textarea
                rows={3}
                required
                value={newRepo.description}
                onChange={(e) => setNewRepo({ ...newRepo, description: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                placeholder="Describe what this tool does..."
              />
            </div>
            <div className="pt-1">
              <button
                disabled={isAdding}
                type="submit"
                className="inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0"
              >
                {isAdding ? (
                  <Loader2 className="animate-spin w-4 h-4" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Add Repository
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <h2 className="font-display text-lg font-bold text-slate-900 mb-4">
          Active Managed Repositories
        </h2>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 text-blue-700 animate-spin" />
          </div>
        ) : repos.length === 0 ? (
          <div className="text-slate-500 p-8 text-center bg-white rounded-xl border border-slate-200 text-sm">
            No repositories added yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {repos.map((repo) => (
              <div
                key={repo.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold text-slate-900">{repo.title}</h3>
                  <code className="text-xs text-blue-700 font-mono block mt-0.5 mb-2">
                    {repo.repoName}
                  </code>
                  <p className="text-slate-600 text-sm leading-relaxed">{repo.description}</p>
                </div>
                {deletingId === repo.id ? (
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xs text-red-700 font-semibold">Delete repository?</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(repo.id)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeletingId(repo.id)}
                    className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors shrink-0"
                    title="Remove from apps"
                    aria-label={`Remove ${repo.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
