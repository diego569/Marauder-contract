import { useState, useEffect } from 'react';
import { getClauses, createClause, updateClause, deleteClause, deleteAllContracts, getLatestContract } from '../lib/api';
import { Clause } from '../types';
import { Plus, Trash2, Save, X, Settings, LogOut, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ADMIN_KEY = 'marauder';

interface AdminModeProps {
  onResetContract: () => void;
  onClausesChanged: () => void;
}

export default function AdminMode({ onResetContract, onClausesChanged }: AdminModeProps) {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newClause, setNewClause] = useState('');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSealed, setIsSealed] = useState(false);
  const [confirmUnseal, setConfirmUnseal] = useState(false);

  // ── Fetch clauses once authenticated ────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchClauses();
    checkIfSealed();
  }, [isAuthenticated]);

  const checkIfSealed = async () => {
    try {
      const latest = await getLatestContract();
      setIsSealed(!!latest);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClauses = async () => {
    try {
      const data = await getClauses();
      setClauses(data);
    } catch (err) {
      setError('Failed to load clauses.');
    }
  };

  // ── Password check ───────────────────────────────────────────────────────────
  const checkPassword = () => {
    if (password === ADMIN_KEY) {
      setIsAuthenticated(true);
      setError(null);
    } else {
      setError('Wrong magic word!');
    }
  };

  const handleUnseal = async () => {
    if (!confirmUnseal) {
      setConfirmUnseal(true);
      return;
    }
    
    setIsLoading(true);
    try {
      await deleteAllContracts(ADMIN_KEY);
      setShowAdmin(false);
      setConfirmUnseal(false);
      onResetContract();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unseal the vow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    setShowAdmin(false);
    setError(null);
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newClause.trim() || !newTitle.trim()) return;
    setIsLoading(true);
    try {
      const nextOrder = clauses.length > 0 ? Math.max(...clauses.map(c => c.order)) + 1 : 0;
      const clause = await createClause(newTitle.trim(), newClause.trim(), nextOrder, ADMIN_KEY);
      setClauses(prev => [...prev, clause]);
      setNewTitle('');
      setNewClause('');
      onClausesChanged();
      checkIfSealed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add clause');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editText.trim() || !editTitle.trim()) return;
    setIsLoading(true);
    try {
      const updated = await updateClause(id, editTitle.trim(), editText.trim(), ADMIN_KEY);
      setClauses(prev => prev.map(c => (c.id === id ? updated : c)));
      setIsEditing(null);
      onClausesChanged();
      checkIfSealed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update clause');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      await deleteClause(id, ADMIN_KEY);
      setClauses(prev => prev.filter(c => c.id !== id));
      onClausesChanged();
      checkIfSealed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete clause');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Hidden gear trigger ──────────────────────────────────────────────────────
  if (!showAdmin) {
    return (
      <button
        onClick={() => setShowAdmin(true)}
        className="fixed bottom-4 right-4 bg-magical-brown/20 text-parchment/50 hover:text-parchment hover:bg-magical-brown/40 border border-magical-brown/30 backdrop-blur-sm p-3 rounded-full transition-all duration-300 shadow-lg hover:scale-110 z-40"
        title="Open Chamber of Clauses (Admin)"
      >
        <Settings size={20} />
      </button>
    );
  }

  // ── Phase 1: Password gate ───────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
        <div className="parchment p-8 rounded-xl shadow-2xl border-4 border-magical-brown w-full max-w-sm">
          <h3 className="text-2xl font-serif mb-2 ink-text">Enter Secret Passage</h3>
          <p className="font-garamond italic text-sm opacity-60 mb-4 ink-text">
            "I solemnly swear that I am up to no good"
          </p>
          {error && <p className="text-red-700 font-garamond italic text-sm mb-3">{error}</p>}
          <input
            type="password"
            placeholder="Magic word..."
            className="w-full border-2 border-magical-brown/20 bg-white/50 p-2 rounded mb-4 font-garamond"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkPassword()}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={checkPassword}
              className="bg-magical-brown text-parchment px-4 py-2 rounded flex-1 font-serif tracking-widest hover:bg-ink transition-colors"
            >
              Enter
            </button>
            <button
              onClick={() => { setShowAdmin(false); setError(null); }}
              className="bg-white/20 px-4 py-2 rounded font-serif"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase 2: The Admin Chamber ───────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-[100] overflow-y-auto p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-magical-brown/30 pb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-serif text-parchment">Cámara de Cláusulas</h2>
            <div className="px-3 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-800/50 uppercase tracking-widest">
              Autorizado
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="p-2 text-parchment hover:bg-white/10 rounded-full transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
            <button
              onClick={() => setShowAdmin(false)}
              className="p-2 text-parchment hover:bg-white/10 rounded-full transition-colors"
              title="Cerrar Cámara"
            >
              <X size={24} />
            </button>
            <button
              onClick={handleUnseal}
              disabled={isLoading}
              className={`ml-4 px-4 py-2 rounded font-garamond italic font-bold tracking-widest uppercase text-sm shadow-md transition-colors ${
                confirmUnseal ? 'bg-red-600 text-white animate-pulse' : 'bg-red-900/60 text-red-100 hover:bg-red-800'
              }`}
            >
              {isLoading ? 'Rompiendo...' : confirmUnseal ? '¡Haz clic de nuevo para confirmar!' : 'Romper el Juramento'}
            </button>
          </div>
        </div>

        {/* Reset hint banner */}
        {isSealed ? (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-sm text-red-200 font-garamond italic text-base flex items-start gap-3 shadow-lg">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-500" />
            <div>
              <strong className="block font-serif not-italic text-red-400 mb-1 tracking-widest uppercase text-sm">El Juramento está Sellado</strong>
              Tus cambios se están guardando en la Cámara, pero el pergamino principal muestra actualmente el <strong>juramento sellado</strong>. 
              Para aplicar estos nuevos cambios al pergamino, debes hacer clic en <strong>ROMPER EL JURAMENTO</strong> arriba y volver a firmar el contrato.
            </div>
          </div>
        ) : (
          <div className="mb-6 p-3 bg-amber-900/10 border border-amber-800/20 rounded-sm text-amber-500/70 font-garamond italic text-sm flex items-start gap-2">
            <RefreshCw size={14} className="mt-0.5 shrink-0" />
            <span>El Juramento está abierto. El pergamino está mostrando estas cláusulas en vivo. Ambas partes deben firmar para sellarlo de nuevo.</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-700/30 rounded text-red-400 font-garamond italic text-sm">
            {error}
          </div>
        )}


        <div className="bg-parchment rounded-sm shadow-sm border-4 border-magical-brown overflow-hidden mb-8">
          {/* New clause input */}
          <div className="p-6 border-b border-magical-brown/20 bg-magical-brown/5 flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Título de la cláusula..."
              className="md:w-1/3 border-2 border-magical-brown/20 bg-white/50 p-3 rounded-sm focus:ring-2 focus:ring-magical-brown outline-none font-garamond italic text-xl ink-text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <input
              type="text"
              placeholder="Inscribe una nueva condición mágica..."
              className="flex-1 border-2 border-magical-brown/20 bg-white/50 p-3 rounded-sm focus:ring-2 focus:ring-magical-brown outline-none font-garamond italic text-xl ink-text"
              value={newClause}
              onChange={e => setNewClause(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={isLoading}
              className="bg-magical-brown text-parchment px-6 py-3 md:py-0 rounded-sm hover:bg-ink transition-colors flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Plus className="group-hover:rotate-90 transition-transform" />}
              AÑADIR
            </button>
          </div>

          {/* Clause list */}
          <div className="divide-y divide-magical-brown/10">
            <AnimatePresence initial={false}>
              {clauses.map((clause, idx) => (
                <motion.div
                  key={clause.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-6 flex items-center gap-6 group hover:bg-magical-brown/5 transition-colors"
                >
                  <span className="text-magical-brown/30 font-serif text-lg w-8">{idx + 1}</span>
                  {isEditing === clause.id ? (
                    <div className="flex-1 flex flex-col md:flex-row gap-3">
                      <input
                        className="md:w-1/3 border-2 border-magical-brown/20 bg-white/50 p-2 rounded-sm font-garamond italic text-xl ink-text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        placeholder="Título..."
                      />
                      <input
                        className="flex-1 border-2 border-magical-brown/20 bg-white/50 p-2 rounded-sm font-garamond italic text-xl ink-text"
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleUpdate(clause.id)}
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end mt-2 md:mt-0">
                        <button
                          onClick={() => handleUpdate(clause.id)}
                          className="text-green-700 hover:scale-110 transition-transform"
                        >
                          <Save size={24} />
                        </button>
                        <button
                          onClick={() => setIsEditing(null)}
                          className="text-red-700 hover:scale-110 transition-transform"
                        >
                          <X size={24} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 font-garamond ink-text">
                        <strong className="text-xl not-italic block mb-1">Cláusula {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][idx] || idx + 1}: {clause.title}</strong>
                        <span className="italic text-lg opacity-80">{clause.text}</span>
                      </div>
                      <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <button
                          onClick={() => { setIsEditing(clause.id); setEditTitle(clause.title); setEditText(clause.text); }}
                          className="text-magical-brown/60 hover:text-magical-brown transition-colors"
                        >
                          <Settings size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(clause.id)}
                          className="text-magical-brown/60 hover:text-red-700 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {clauses.length === 0 && (
              <div className="p-12 text-center text-magical-brown/30 font-garamond italic text-xl">
                El pergamino está vacío. Inicia el encantamiento.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
