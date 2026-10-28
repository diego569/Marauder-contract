import { motion } from 'motion/react';

interface MagicalEntryProps {
  onEnter: () => void;
}

export default function MagicalEntry({ onEnter }: MagicalEntryProps) {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 p-6 text-center"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="space-y-8"
      >
        <div className="w-24 h-24 mx-auto mb-8 opacity-50">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        
        <h2 className="text-magical-brown/50 font-serif text-sm tracking-[0.3em] uppercase">Private & Confidential</h2>
        
        <button
          onClick={onEnter}
          className="group relative"
        >
          <span className="text-parchment/80 font-garamond text-2xl md:text-5xl hover:text-parchment transition-colors duration-500 cursor-pointer italic block">
            "I solemnly swear that I am up to no good"
          </span>
          <motion.div 
            className="absolute -bottom-2 left-0 right-0 h-[1px] bg-magical-brown/50 origin-left"
            initial={{ scaleX: 0 }}
            whileHover={{ scaleX: 1 }}
            transition={{ duration: 0.5 }}
          />
        </button>

        <p className="text-gray-600 font-garamond text-sm max-w-sm mx-auto leading-relaxed mt-12 opacity-80">
          Tap the binding scroll to reveal the hidden contents of this enchanted parchment.
        </p>
      </motion.div>
    </motion.div>
  );
}
