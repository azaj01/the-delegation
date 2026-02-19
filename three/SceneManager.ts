
import { Engine } from './core/Engine';
import { Stage } from './core/Stage';
import { CharacterManager } from './entities/CharacterManager';
import { useStore } from '../store/useStore';

export class SceneManager {
  private engine: Engine;
  private stage: Stage;
  private characters: CharacterManager;
  
  private frameCount = 0;
  private lastTime = 0;

  constructor(container: HTMLElement) {
    this.engine = new Engine(container);
    this.stage = new Stage(this.engine.renderer.domElement);
    this.characters = new CharacterManager(this.stage.scene);
    
    this.init();
  }

  private async init() {
    await this.engine.init();
    await this.characters.load();

    const state = useStore.getState();
    
    // Initial sync
    this.characters.setInstanceCount(state.instanceCount);
    this.characters.updateBoidsParams(state.boidsParams);
    this.characters.updateWorldSize(state.worldSize);
    this.characters.setDebugMode(state.isDebugOpen); // Sync Debug Mode
    this.stage.updateDimensions(state.worldSize);

    this.engine.renderer.setAnimationLoop(this.animate.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));

    // Subscriptions
    useStore.subscribe((state) => {
      this.characters.fadeToAction(state.currentAction);
    });

    useStore.subscribe((state, prevState) => {
      if (state.instanceCount !== prevState.instanceCount) {
        this.characters.setInstanceCount(state.instanceCount);
      }
      // Update Uniforms when params change
      if (state.boidsParams !== prevState.boidsParams) {
        this.characters.updateBoidsParams(state.boidsParams);
      }
      
      // Update World Size
      if (state.worldSize !== prevState.worldSize) {
        this.characters.updateWorldSize(state.worldSize);
        this.stage.updateDimensions(state.worldSize);
      }

      // Sync Debug Mode
      if (state.isDebugOpen !== prevState.isDebugOpen) {
        this.characters.setDebugMode(state.isDebugOpen);
      }
    });
  }

  private onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.engine.onResize(w, h);
    this.stage.onResize(w, h);
  }

  private animate() {
    this.engine.timer.update();
    const delta = this.engine.timer.getDelta();
    const time = this.engine.timer.getElapsed();

    this.stage.update();
    
    // 1. GPU Update
    this.characters.update(delta, this.engine.renderer);
    
    // 2. CPU Debug Simulation (Only if debug panel is open)
    const { isDebugOpen, boidsParams, worldSize } = useStore.getState();
    if (isDebugOpen) {
      // Pass worldSize to CPU simulation
      const debugPositions = this.characters.simulateOnCPU(boidsParams, worldSize);
      if (debugPositions) {
        // Create a copy to trigger React reactivity
        useStore.getState().setDebugPositions(new Float32Array(debugPositions));
      }
    }

    this.engine.render(this.stage.scene, this.stage.camera);

    this.updateStats(time);
  }

  private updateStats(time: number) {
    this.frameCount++;
    if (this.frameCount >= 20) {
      const fps = Math.round(20 / (time - this.lastTime));
      const info = this.engine.renderer.info;
      const count = this.characters.getCount();

      useStore.getState().updatePerformance({
        fps,
        drawCalls: info.render.drawCalls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        entities: count,
        isInstancingActive: info.render.drawCalls < count
      });

      this.frameCount = 0;
      this.lastTime = time;
    }
  }

  public dispose() {
    window.removeEventListener('resize', this.onResize);
    this.engine.dispose();
    if (this.stage.controls) this.stage.controls.dispose();
  }
}
