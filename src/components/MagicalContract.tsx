import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { Send, Check, Loader2 } from 'lucide-react';
import { getClauses, saveContract, getLatestContract } from '../lib/api';
import { Clause } from '../types';
import SignatureModal from './SignatureModal';

const ClauseItem = ({ clause, idx, isExporting }: { clause: Clause, idx: number, isExporting: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const showText = isOpen || isExporting;
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][idx] || idx + 1;
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.1 }}
      className="border-b border-magical-brown/10 pb-4"
    >
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full text-left group hover:bg-magical-brown/5 p-3 rounded-sm transition-colors cursor-pointer"
      >
        <span className="font-serif font-bold text-xl md:text-2xl ink-text opacity-70 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Cláusula {roman}:
        </span>
        <span className="font-garamond font-bold text-xl md:text-2xl ink-text flex-1 leading-tight">
          {clause.title}
        </span>
      </button>
      <AnimatePresence>
        {showText && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="font-garamond italic text-xl md:text-2xl ink-text leading-relaxed w-full p-4 pt-2 md:pl-[9.5rem]">
              {clause.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

export default function MagicalContract({ refreshKey }: { refreshKey?: number }) {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [signature1, setSignature1] = useState<string | null>(null);
  const [signature2, setSignature2] = useState<string | null>(null);
  const [activeSigner, setActiveSigner] = useState<1 | 2 | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [magicWord, setMagicWord] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const contractRef = useRef<HTMLDivElement>(null);

  // ── Fetch clauses from REST API ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchInitialData = async () => {
      try {
        const latestContract = await getLatestContract();
        if (!cancelled) {
          if (latestContract) {
            setClauses(latestContract.clauses_snapshot);
            setSignature1(latestContract.signature1);
            setSignature2(latestContract.signature2);
            setIsSigned(true);
            setSavedContractId(latestContract.id);
          } else {
            const clausesData = await getClauses();
            setClauses(clausesData);
            setSignature1(null);
            setSignature2(null);
            setIsSigned(false);
            setSavedContractId(null);
          }
        }
      } catch (err) {
        if (!cancelled) setLoadError('Could not load data from the server.');
        console.error(err);
      }
    };
    fetchInitialData();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // ── PDF Export ──────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!contractRef.current) return;
    setIsExporting(true);
    // Wait for React to render expanded clauses and animations to complete
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const dataUrl = await toPng(contractRef.current, {
        pixelRatio: 2,
        backgroundColor: '#f4e4bc',
        // Ignore elements with the no-print class so they don't appear in PDF
        filter: (node) => {
          if (node.nodeType === 1) {
            const el = node as Element;
            if (el.classList && el.classList.contains('no-print')) {
              return false;
            }
          }
          return true;
        },
      });
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('ElJuramentoInquebrantable.pdf');
    } catch (error) {
      console.error('PDF Export failed:', error);
      const msg = error instanceof Error ? error.message : String(error);
      alert(`No se pudo enviar por lechuza: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Finalize & Save Contract ────────────────────────────────────────────────
  const initiateBinding = () => {
    if (!signature1 || !signature2) return;
    setMagicWord('');
    setPasswordError(null);
    setShowPasswordModal(true);
  };

  const finalizeContract = async () => {
    if (magicWord !== 'marauder') {
      setPasswordError('Wrong magic word! The vow remains unbound.');
      return;
    }

    setShowPasswordModal(false);
    setIsSaving(true);
    try {
      const saved = await saveContract({
        signature1,
        signature2,
        clausesSnapshot: clauses.map(c => ({ id: c.id, title: c.title, text: c.text, order: c.order })),
      });
      setSavedContractId(saved.id);
      setIsSigned(true);
      setTimeout(() => setShowSuccess(true), 500);
    } catch (error) {
      console.error('Error saving contract:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      alert(`El juramento falló: ${errMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Signature Line Sub-component ────────────────────────────────────────────
  const SignatureLine = ({
    num,
    signature,
    onSign,
  }: {
    num: number;
    signature: string | null;
    onSign: () => void;
  }) => (
    <div className="flex-1 flex flex-col items-center">
      <button
        onClick={onSign}
        disabled={isSigned}
        className="relative w-full h-24 flex flex-col items-center justify-end group transition-all"
      >
        <AnimatePresence>
          {signature ? (
            <motion.img
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              src={signature}
              alt={`Signature ${num}`}
              className="h-20 object-contain mb-[-10px] z-10"
            />
          ) : (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mb-4 text-magical-brown/30 font-garamond italic group-hover:text-magical-brown/60 transition-colors"
            >
              Haz clic para sellar
            </motion.div>
          )}
        </AnimatePresence>

        {!signature && (
          <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none flex items-center justify-center">
            <div className="w-full h-full bg-magical-brown/5 rounded-sm animate-pulse" />
          </motion.div>
        )}
        <div className="h-[2px] bg-magical-brown w-full opacity-60" />
      </button>
      <p className="font-serif text-xs mt-2 uppercase tracking-widest opacity-60">
        Signatario {['Uno', 'Dos'][num - 1]}
      </p>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] py-12 px-4 flex justify-center">
      <div className="max-w-3xl w-full relative">
        <motion.div
          ref={contractRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="parchment magical-border p-4 sm:p-8 md:p-16 rounded-sm relative shadow-2xl min-h-[1000px] flex flex-col quill-cursor"
        >
          {/* Header */}
          <header className="text-center mb-12 space-y-8">
            <div className="space-y-4">
              <h1 className="font-serif text-2xl sm:text-3xl md:text-5xl uppercase tracking-[0.05em] sm:tracking-[0.1em] md:tracking-[0.15em] ink-text w-full max-w-full overflow-hidden text-center px-2">
                El Juramento Inquebrantable
              </h1>
              <div className="h-[1px] w-48 bg-magical-brown/30 mx-auto" />
            </div>

            {/* Hero Visualization */}
            <div className="relative w-full h-64 flex items-center justify-center overflow-hidden rounded-lg bg-magical-brown/5 border border-magical-brown/10">
              <svg viewBox="0 0 400 200" className="w-full h-full max-w-lg opacity-80">
                <g fill="none" stroke="#2c1810" strokeWidth="1" opacity="0.6">
                  <path d="M150 100c0 0 30-40 50-40s50 40 50 40" />
                  <path d="M150 100c0 0 30 40 50 40s50-40 50-40" />
                </g>
                <motion.path
                  d="M140 100 Q 200 20 260 100 T 320 100"
                  stroke="#ffd700"
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.6 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.path
                  d="M140 100 Q 200 180 260 100 T 320 100"
                  stroke="#ffd700"
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.6 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
                />
              </svg>
              <div className="absolute inset-x-0 -bottom-8 text-center text-magical-brown/50 font-serif text-sm tracking-[0.2em] uppercase">
                {isSigned ? 'El Juramento ha sido Sellado' : 'Esperando las firmas...'}
              </div>
              <div className="absolute inset-0 bg-radial-gradient from-transparent to-parchment/40" />
            </div>
          </header>

          {/* Clauses */}
          <div className="flex-1 space-y-10 mb-20">
            <p className="font-garamond italic text-2xl leading-relaxed ink-text opacity-90 text-center px-4">
              "Un juramento inquebrantable es un vínculo que ninguna magia, salvo el corazón mismo, puede romper. Que las siguientes verdades queden grabadas en la esencia misma de esta unión:"
            </p>

            {loadError && (
              <p className="text-center text-[#b91c1c] font-garamond italic">{loadError}</p>
            )}

            <ul className="space-y-4 max-w-3xl mx-auto">
              {clauses.map((clause, idx) => (
                <ClauseItem key={clause.id} clause={clause} idx={idx} isExporting={isExporting} />
              ))}
            </ul>
          </div>

          {/* Dual Signatures */}
          <div className="mt-auto pt-20 border-t-2 border-magical-brown/20">
            <div className="flex flex-col md:flex-row gap-16 md:gap-24 px-8">
              <SignatureLine num={1} signature={signature1} onSign={() => setActiveSigner(1)} />
              <SignatureLine num={2} signature={signature2} onSign={() => setActiveSigner(2)} />
            </div>

            <div className="flex flex-col gap-4 mt-16 no-print items-center">
              {!isSigned && signature1 && signature2 && (
                <button
                  onClick={initiateBinding}
                  disabled={isSaving}
                  className="bg-wax text-parchment py-4 px-12 rounded-sm font-serif tracking-widest hover:bg-ink transition-all flex items-center justify-center gap-3 group shadow-2xl text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Check size={20} className="group-hover:scale-125 transition-transform" />
                  )}
                  {isSaving ? 'VINCULANDO...' : 'VINCULAR JURAMENTO'}
                </button>
              )}

              <button
                onClick={handleExport}
                disabled={isExporting}
                className="no-print mt-16 px-8 py-3 bg-magical-brown text-parchment font-serif tracking-widest uppercase rounded-sm hover:bg-magical-brown/90 shadow-xl flex items-center gap-3 transition-all disabled:opacity-70 disabled:cursor-not-allowed mx-auto"
              >
                {isExporting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                {isExporting ? 'Invocando a la lechuza...' : 'ENVIAR POR LECHUZA'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Signature Modal */}
        <AnimatePresence>
          {activeSigner && (
            <SignatureModal
              onSave={data => {
                if (activeSigner === 1) setSignature1(data);
                else setSignature2(data);
                setActiveSigner(null);
              }}
              onClose={() => setActiveSigner(null)}
            />
          )}
        </AnimatePresence>

        {/* Password Modal */}
        <AnimatePresence>
          {showPasswordModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowPasswordModal(false)}
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-parchment p-8 rounded-sm shadow-2xl border-4 border-magical-brown max-w-md w-full no-print"
              >
                <div className="text-center space-y-4">
                  <h3 className="text-3xl font-serif ink-text">Sellar el Juramento</h3>
                  <p className="font-garamond italic text-xl ink-text/80">
                    "Juro solemnemente que mis intenciones no son buenas..."
                  </p>
                  
                  {passwordError && (
                    <p className="text-[#b91c1c] font-garamond italic">{passwordError}</p>
                  )}
                  
                  <input
                    type="password"
                    placeholder="Introduce la palabra mágica..."
                    className="w-full border-2 border-magical-brown/30 bg-white/50 p-3 rounded-sm focus:ring-2 focus:ring-magical-brown outline-none font-garamond text-xl ink-text text-center mt-4"
                    value={magicWord}
                    onChange={e => setMagicWord(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && finalizeContract()}
                    autoFocus
                  />
                  
                  <div className="flex gap-4 mt-8">
                    <button
                      onClick={() => setShowPasswordModal(false)}
                      className="flex-1 py-3 px-6 bg-magical-brown/10 text-magical-brown hover:bg-magical-brown/20 rounded-sm font-serif tracking-widest transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={finalizeContract}
                      disabled={isSaving}
                      className="flex-1 py-3 px-6 bg-magical-brown text-parchment hover:bg-magical-brown/90 rounded-sm font-serif tracking-widest shadow-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                      Confirmar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Success Overlay */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
            >
              <div className="bg-black/80 fixed inset-0" />
              <motion.div
                initial={{ scale: 5, opacity: 0, rotate: -20 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
                className="relative z-10 flex flex-col items-center"
              >
                {/* Wax Seal */}
                <div className="w-48 h-48 rounded-full wax-seal flex items-center justify-center border-4 border-black/20 mb-8 overflow-hidden relative shadow-[0_0_50px_rgba(139,0,0,0.5)]">
                  <svg viewBox="0 0 24 24" fill="white" className="w-24 h-24 opacity-60">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                </div>

                <h2 className="text-white font-serif text-5xl md:text-8xl tracking-tighter text-center uppercase drop-shadow-lg">
                  Vow Bound
                </h2>
                <h3 className="text-[#9ca3af] font-garamond italic text-2xl mt-2">
                  Mischief Managed
                </h3>

                {savedContractId && (
                  <div className="mt-4 px-4 py-2 bg-white/5 border border-white/10 rounded-sm text-center pointer-events-auto">
                    <p className="text-[#6b7280] font-serif text-[10px] uppercase tracking-widest">
                      Contract Seal ID
                    </p>
                    <p className="text-magical-brown font-mono text-sm select-all mt-1">
                      {savedContractId}
                    </p>
                  </div>
                )}

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                  onClick={() => setShowSuccess(false)}
                  className="pointer-events-auto mt-12 text-[#6b7280] hover:text-white transition-colors underline uppercase tracking-widest text-xs"
                >
                  Return to Parchment
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
