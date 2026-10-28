import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Check, Trash2, RotateCcw } from 'lucide-react';

interface SignatureModalProps {
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

export default function SignatureModal({ onSave, onClose }: SignatureModalProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const clear = () => sigCanvas.current?.clear();

  const handleSave = () => {
    if (sigCanvas.current?.isEmpty()) return;
    const canvas = sigCanvas.current?.getCanvas();
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-0 md:p-6"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className={`bg-parchment relative shadow-2xl flex flex-col ${
          isMobile 
            ? 'w-full h-full' 
            : 'w-full max-w-2xl h-[500px] rounded-xl border-4 border-magical-brown'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-magical-brown/10 bg-magical-brown/5 flex justify-between items-center relative">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-wax/10 flex items-center justify-center">
                <Check size={16} className="text-wax" />
             </div>
             <h3 className="font-serif text-xl ink-text uppercase tracking-widest">Sellar Juramento</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full ink-text">
            <X size={24} />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="p-8 relative">
          <div className="absolute top-4 left-8 right-8 text-center text-sm font-garamond italic ink-text/50">
            Estampa tu firma aquí abajo...
          </div>
          <div className="border-b-2 border-magical-brown/20 relative">
            <SignatureCanvas 
              ref={sigCanvas}
              penColor="#1a1a1a"
              canvasProps={{
                className: 'w-full h-48 cursor-crosshair mix-blend-multiply',
              }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-magical-brown/10 bg-magical-brown/5 flex gap-4">
          <button 
            onClick={clear}
            className="flex-1 border-2 border-magical-brown/40 ink-text py-3 rounded-sm font-serif tracking-widest flex items-center justify-center gap-2 hover:bg-black/5 transition-colors"
          >
            <Trash2 size={18} />
            LIMPIAR TINTA
          </button>
          <button 
            onClick={handleSave}
            className="flex-[2] bg-wax text-parchment py-3 rounded-sm font-serif tracking-widest flex items-center justify-center gap-2 hover:bg-ink transition-colors shadow-lg"
          >
            <Check size={18} />
            ACEPTAR SELLO
          </button>
        </div>

        {/* Decorative Corner */}
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
           <svg width="40" height="40" viewBox="0 0 100 100">
             <path d="M100 0 L0 0 L100 100 Z" fill="currentColor" />
           </svg>
        </div>
      </motion.div>
    </motion.div>
  );
}
