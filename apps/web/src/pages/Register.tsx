import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setLoading(true);
    try {
      await register(email, password);
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Un compte existe déjà avec cet email.");
      } else if (err instanceof ApiError && err.status === 400) {
        setError("Données invalides. Vérifiez votre email et mot de passe.");
      } else {
        setError("Une erreur est survenue. Réessayez.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main" className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm fade-in">
        <div className="text-center mb-8">
          <div className="text-5xl font-black tracking-tighter text-white mb-1">WORDL<span className="text-indigo-400">FR</span></div>
          <p className="text-slate-400 text-sm">Le Wordle en français</p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700"
        >
          <h1 className="text-xl font-bold text-white mb-6">Créer un compte</h1>

          {error && (
            <div role="alert" aria-live="assertive" className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
              Adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none transition"
              placeholder="vous@exemple.fr"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
              Mot de passe <span className="text-slate-500">(8 caractères min.)</span>
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="pwd-hint"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none transition"
              placeholder="••••••••"
            />
            <p id="pwd-hint" className="mt-1 text-xs text-slate-500">Minimum 8 caractères.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-800 text-white font-bold rounded-lg transition"
          >
            {loading ? "Inscription…" : "Créer mon compte"}
          </button>

          <p className="mt-5 text-center text-sm text-slate-400">
            Déjà un compte ?{" "}
            <Link to="/connexion" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
