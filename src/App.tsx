/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { SceneManager } from './three/SceneManager';
import { SceneContext } from './three/SceneContext';
import UIOverlay from './components/UIOverlay';
import { useAgencyOrchestrator } from './hooks/useAgencyOrchestrator';
import { useStore } from './store/useStore';
import { useAgencyStore } from './store/agencyStore';
import ChatPanel from './components/ChatPanel';
import { ActionLogPanel } from './components/ActionLogPanel';
import { KanbanPanel } from './components/KanbanPanel';
import { FinalOutputModal } from './components/FinalOutputModal';

/** Mounts inside SceneContext so useSceneManager() is available. */
function AgencyOrchestrator() {
  useAgencyOrchestrator();
  return null;
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);
  const { isChatting } = useStore();
  const { isLogOpen, isKanbanOpen } = useAgencyStore();

  useEffect(() => {
    if (canvasRef.current && !managerRef.current) {
      const manager = new SceneManager(canvasRef.current);
      managerRef.current = manager;
      setSceneManager(manager);
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
        setSceneManager(null);
      }
    };
  }, []);

  return (
    <SceneContext.Provider value={sceneManager}>
      <AgencyOrchestrator />
      <div className="w-screen h-screen bg-white overflow-hidden flex flex-row">

        {/* Left: Log panel */}
        {isLogOpen && <ActionLogPanel />}

        {/* Center: canvas + kanban drawer stacked */}
        <div className="relative flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <div ref={canvasRef} className="flex-1 min-h-0 relative">
            <UIOverlay />
          </div>
          {isKanbanOpen && <KanbanPanel />}
        </div>

        {/* Right: chat panel */}
        {isChatting && <ChatPanel />}

        {/* Final output — fixed viewport overlay */}
        <FinalOutputModal />
      </div>
    </SceneContext.Provider>
  );
};

export default App;

