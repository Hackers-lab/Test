export const fetchGithubApi = async (path: string) => {
  const isLocalEnv = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('run.app');
  
  if (isLocalEnv) {
    try {
      const res = await fetch(`/api/github/${path}`);
      if (res.ok) {
        return res;
      }
    } catch (e) {
      // ignore
    }
  }
  
  // Directly fetch from GitHub API if not local or local failed
  return fetch(`https://api.github.com/${path}`);
};
