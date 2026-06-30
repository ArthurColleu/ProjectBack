import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, type DailyWord } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Spinner } from "../components/ui/Spinner";
import { Toast } from "../components/ui/Toast";

interface Editing { id: number; date: string; word: string }

export default function Admin() {
  const { logout } = useAuth();
  const [words, setWords] = useState<DailyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState("");
  const [newWord, setNewWord] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "info" | "error" | "success" } | null>(null);

  const notify = (message: string, type: "info" | "error" | "success" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const load = async () => {
    try {
      const data = await api.listWords();
      setWords(data.words);
    } catch { notify("Erreur de chargement.", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createWord(newDate, newWord.toLowerCase());
      setNewDate(""); setNewWord("");
      notify("Mot ajouté.", "success");
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) notify("Cette date a déjà un mot.", "error");
      else if (err instanceof ApiError && err.status === 400) notify("Données invalides.", "error");
      else notify("Erreur.", "error");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await api.updateWord(editing.id, { date: editing.date, word: editing.word.toLowerCase() });
      setEditing(null);
      notify("Mot modifié.", "success");
      await load();
    } catch { notify("Erreur lors de la modification.", "error"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce mot du jour ?")) return;
    try {
      await api.deleteWord(id);
      notify("Mot supprimé.", "success");
      await load();
    } catch { notify("Erreur lors de la suppression.", "error"); }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <a href="#main" className="skip-link">Aller au contenu</a>

      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <Link to="/" className="text-xl font-black tracking-tighter text-white hover:text-indigo-400 transition">
          WORDL<span className="text-indigo-400">FR</span>
          <span className="ml-2 text-xs text-amber-400 font-semibold">ADMIN</span>
        </Link>
        <nav aria-label="Navigation" className="flex items-center gap-4 text-sm">
          <Link to="/" className="text-slate-300 hover:text-white transition font-medium">Jouer</Link>
          <Link to="/statistiques" className="text-slate-300 hover:text-white transition font-medium">Stats</Link>
          <button onClick={logout} className="text-slate-400 hover:text-white transition text-xs border border-slate-700 px-3 py-1.5 rounded-lg">
            Déconnexion
          </button>
        </nav>
      </header>

      <main id="main" className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 fade-in">
        <h1 className="text-2xl font-black text-white mb-6">Gestion des mots du jour</h1>

        {/* Add word form */}
        <section aria-labelledby="add-heading" className="mb-8 bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 id="add-heading" className="text-lg font-bold text-white mb-4">Ajouter un mot</h2>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
            <div>
              <label htmlFor="new-date" className="sr-only">Date</label>
              <input
                id="new-date"
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:border-indigo-400 focus:outline-none"
                aria-label="Date du mot"
              />
            </div>
            <div>
              <label htmlFor="new-word" className="sr-only">Mot (5 lettres)</label>
              <input
                id="new-word"
                type="text"
                required
                maxLength={5}
                minLength={5}
                pattern="[a-zA-Z]{5}"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                className="w-32 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm uppercase tracking-widest focus:border-indigo-400 focus:outline-none"
                placeholder="TABLE"
                aria-label="Mot de 5 lettres"
              />
            </div>
            <button type="submit" className="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-lg text-sm transition">
              Ajouter
            </button>
          </form>
        </section>

        {/* Words list */}
        <section aria-labelledby="list-heading">
          <h2 id="list-heading" className="text-lg font-bold text-white mb-3">
            Mots planifiés <span className="text-slate-400 font-normal text-sm">({words.length})</span>
          </h2>
          {loading && <Spinner />}
          {!loading && words.length === 0 && (
            <p className="text-slate-400 text-sm">Aucun mot planifié.</p>
          )}
          <ul className="flex flex-col gap-2" role="list">
            {words.map((w) => (
              <li key={w.id} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-4">
                {editing?.id === w.id ? (
                  <form onSubmit={handleUpdate} className="flex flex-wrap gap-2 flex-1">
                    <label htmlFor={`edit-date-${w.id}`} className="sr-only">Date</label>
                    <input
                      id={`edit-date-${w.id}`}
                      type="date"
                      value={editing.date}
                      onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:border-indigo-400 focus:outline-none"
                    />
                    <label htmlFor={`edit-word-${w.id}`} className="sr-only">Mot</label>
                    <input
                      id={`edit-word-${w.id}`}
                      type="text"
                      maxLength={5}
                      value={editing.word}
                      onChange={(e) => setEditing({ ...editing, word: e.target.value })}
                      className="w-24 px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-sm uppercase tracking-widest focus:border-indigo-400 focus:outline-none"
                    />
                    <button type="submit" className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded transition">
                      Sauvegarder
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 border border-slate-600 text-slate-300 text-sm rounded hover:bg-slate-700 transition">
                      Annuler
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="text-slate-400 text-sm w-24 shrink-0">{w.date}</span>
                    <span className="font-mono font-bold text-white uppercase tracking-widest">{w.word}</span>
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={() => setEditing({ id: w.id, date: w.date, word: w.word })}
                        className="text-xs px-3 py-1.5 border border-slate-600 text-slate-300 rounded hover:bg-slate-700 transition"
                        aria-label={`Modifier le mot du ${w.date}`}
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="text-xs px-3 py-1.5 border border-red-800 text-red-400 rounded hover:bg-red-900/30 transition"
                        aria-label={`Supprimer le mot du ${w.date}`}
                      >
                        Supprimer
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Toast message={toast?.message ?? null} type={toast?.type} />
    </div>
  );
}
