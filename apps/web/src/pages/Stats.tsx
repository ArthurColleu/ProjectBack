import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type PlayerStats } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Spinner } from "../components/ui/Spinner";

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center bg-slate-800 rounded-xl p-4 border border-slate-700">
      <span className="text-3xl font-black text-white">{value}</span>
      <span className="text-xs text-slate-400 mt-1 text-center leading-tight">{label}</span>
    </div>
  );
}

function GuessBar({ count, total, n }: { count: number; total: number; n: number }) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-3 text-slate-400 text-right">{n}</span>
      <div className="flex-1 bg-slate-800 rounded overflow-hidden h-6">
        <div
          className="bar-fill h-full bg-indigo-500 flex items-center justify-end pr-2 text-white font-bold text-xs rounded"
          style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
          role="progressbar"
          aria-valuenow={count}
          aria-valuemin={0}
          aria-valuemax={total || 1}
          aria-label={`${count} victoire${count !== 1 ? "s" : ""} en ${n} essai${n !== 1 ? "s" : ""}`}
        >
          {count > 0 ? count : ""}
        </div>
      </div>
    </div>
  );
}

export default function Stats() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <a href="#main" className="skip-link">Aller au contenu</a>

      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <Link to="/" className="text-xl font-black tracking-tighter text-white hover:text-indigo-400 transition">
          WORDL<span className="text-indigo-400">FR</span>
        </Link>
        <nav aria-label="Navigation" className="flex items-center gap-4 text-sm">
          <Link to="/" className="text-slate-300 hover:text-white transition font-medium">Jouer</Link>
          {user?.role === "admin" && (
            <Link to="/admin" className="text-amber-400 hover:text-amber-300 transition font-medium">Admin</Link>
          )}
          <button onClick={logout} className="text-slate-400 hover:text-white transition text-xs border border-slate-700 px-3 py-1.5 rounded-lg">
            Déconnexion
          </button>
        </nav>
      </header>

      <main id="main" className="flex-1 max-w-lg mx-auto w-full px-4 py-8 fade-in">
        <h1 className="text-2xl font-black text-white mb-6">Mes statistiques</h1>

        {loading && <Spinner />}
        {error && <p className="text-red-400">Impossible de charger les statistiques.</p>}

        {stats && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <StatCard value={stats.gamesPlayed} label="Parties jouées" />
              <StatCard value={`${stats.winRate}%`} label="Victoires" />
              <StatCard value={stats.currentStreak} label="Série actuelle" />
              <StatCard value={stats.maxStreak} label="Meilleure série" />
            </div>

            <section aria-labelledby="dist-heading">
              <h2 id="dist-heading" className="text-lg font-bold text-white mb-3">Distribution des essais</h2>
              <div className="flex flex-col gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <GuessBar
                    key={n}
                    n={n}
                    count={stats.guessDistribution[String(n)] ?? 0}
                    total={stats.wins}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
