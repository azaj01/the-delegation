
import React, { useEffect, useRef } from 'react';
import { SceneManager } from './three/SceneManager';
import UIOverlay from './components/UIOverlay';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SceneManager | null>(null);

  useEffect(() => {
    if (canvasRef.current && !managerRef.current) {
      managerRef.current = new SceneManager(canvasRef.current);
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-screen h-screen bg-white overflow-hidden">
      {/* Three.js Container */}
      <div ref={canvasRef} className="absolute inset-0 w-full h-full" />
      
      {/* UI Layer */}
      <UIOverlay />

      {/* Loading Hint */}
      <div className="absolute top-4 right-4 pointer-events-none text-[10px] text-white/20 uppercase tracking-widest">
        WebGPU Experimental
      </div>
    </div>
  );
};

export default App;
