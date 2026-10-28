/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import MagicalEntry from './components/MagicalEntry';
import MagicalContract from './components/MagicalContract';
import AdminMode from './components/AdminMode';

export default function App() {
  const [hasEntered, setHasEntered] = useState(false);
  // Incrementing this key forces MagicalContract to fully re-mount,
  // which resets all signatures and signed state for a fresh signing session.
  const [contractKey, setContractKey] = useState(0);
  const [clausesRefreshKey, setClausesRefreshKey] = useState(0);

  const resetContract = () => setContractKey(k => k + 1);
  const refreshClauses = () => setClausesRefreshKey(k => k + 1);

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      <AnimatePresence mode="wait">
        {!hasEntered ? (
          <MagicalEntry key="entry" onEnter={() => setHasEntered(true)} />
        ) : (
          <div key="contract" className="animate-in fade-in duration-1000">
            <MagicalContract key={contractKey} refreshKey={clausesRefreshKey} />
            <AdminMode onResetContract={resetContract} onClausesChanged={refreshClauses} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
