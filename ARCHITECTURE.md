# Architecture

> **Goal**: Every layer has a single job and no cross-layer imports except downward. Swapping out any one system should not require touching the others.

---

## Dependency map

```
  React UI (App, UIOverlay, ChatPanel, HelpModal)
       │  reads only: Zustand store (raw data)
       │  calls:      SceneManager via SceneContext
       ▼
  SceneManager          ← single orchestrator, owns the game loop
       │
       ├─ CharacterController   ← unified character API
       │       ├─ CharacterManager     (GPU rendering)
       │       ├─ CharacterStateMachine (animation+expression state)
       │       ├─ PathAgent[]           (CPU path following)
       │       ├─ NavMeshManager        (path queries)
       │       └─ PoiManager            (POI occupancy)
       │
       ├─ DriverManager
       │       ├─ PlayerInputDriver
       │       └─ NpcAgentDriver (one per NPC)
       │
       ├─ InputManager           ← raw pointer events → callbacks
       ├─ Engine                 ← WebGPU renderer + timer
       └─ Stage                  ← camera, orbit controls, resize
```

---

## Layers in detail

### 1. React UI

Files: `src/App.tsx`, `src/components/`

- **Pure presentation**: reads Zustand for display state, calls `SceneManager` for actions.
- **No Three.js import**: components get the scene manager via `SceneContext` (a standard React context). If the 3D layer is removed entirely, the UI files need no changes beyond removing `SceneContext.Provider`.

### 2. Zustand store (`src/store/useStore.ts`)

- **Pure data + simple setters only.** No closures that reference Three.js objects.
- What lives here: `isChatting`, `chatMessages`, `isThinking`, `isTyping`, `selectedNpcIndex`, `hoveredNpcIndex`, `selectedPosition`, `instanceCount`, `worldSize`.
- What does NOT live here: Any Three.js call, any AI call, any animation trigger. Those are SceneManager's job.

### 3. SceneManager (`src/three/SceneManager.ts`)

The single orchestrator. Owns the `requestAnimationFrame` loop and all wiring:

- Creates `Engine`, `Stage`, `CharacterManager`, `CharacterController`, `DriverManager`, `InputManager`.
- Subscribes to the Zustand store to react to UI-driven changes.
- Exposes a clean public API to React: `startChat(npcIndex)`, `endChat()`, `sendMessage(text)`.

**Important**: SceneManager is the only file allowed to touch both Zustand and Three.js. Everything below it is pure Three.js or pure TS logic.

### 4. CharacterController (`src/three/CharacterController.ts`)

Unified character API for player and NPCs. No knowledge of input, React, or AI.

High-level methods:

- `play(index, stateKey)` → delegates to `CharacterStateMachine`; animation + expression applied automatically.
- `moveTo(index, target, arrivalState?, onArrival?)` → navmesh path → PathAgent → auto-transitions on arrival.
- `walkToPoi(index, poiId, onArrival?)` → POI lookup → `moveTo()`.
- `setSpeaking(index, bool)` → mouth animation overlay, independent of state.
- `getState(index)` → current `CharacterStateKey` from the state machine.
- `getAgentState(index)` → GPU physics mode (`AgentBehavior.IDLE` / `AgentBehavior.GOTO`).

Implements `ICharacterDriver`: the interface used by `CharacterStateMachine` and drivers to call back into it without circular imports.

---

## `AgentBehavior` and `AgentStateBuffer` — are they still needed?

**Yes. They operate at a different layer than `CharacterStateMachine`.**

|                      | `AgentStateBuffer` + `AgentBehavior`                                          | `CharacterStateMachine`                                     |
| -------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **What it controls** | GPU physics: does the compute shader push this character toward its waypoint? | CPU animation + expression: which clip plays? what face?    |
| **Values**           | `IDLE=0` (stopped), `GOTO=1` (moving toward waypoint X/Z)                     | `'idle'`, `'walk'`, `'talk'`, `'listen'`, `'sit'`, …        |
| **Who reads it**     | The WebGPU compute shader every frame                                         | `CharacterController.getState()`, `SceneManager` subscriber |
| **Who writes it**    | `CharacterController.setPhysicsMode()`, `PathAgent`                           | `CharacterController.play()` via state machine transition   |

When you call `controller.moveTo(index, target)`:

1. `AgentStateBuffer` gets `GOTO` + the waypoint X/Z → GPU moves the mesh.
2. `CharacterStateMachine` transitions to `'walk'` → walk animation + expression plays.

When the agent arrives:

1. `PathAgent` detects arrival → sets `AgentStateBuffer` back to `IDLE` → GPU stops moving the mesh.
2. The arrival callback calls `play(index, arrivalState)` → state machine transitions to e.g. `'idle'` → animation switches.

**You can think of `AgentBehavior` as the movement engine and `CharacterStateMachine` as the animation layer. They are always kept in sync by `CharacterController`, but neither knows about the other.**

`AgentStateBuffer` also stores the current animation index (`.y` component of the vec4), which the GPU uses to sample the correct baked animation frame. It is the bridge between CPU logic and GPU shader.

---

## Drivers — what they are and why they exist

**Problem solved**: Player and NPCs are the same type of entity (same `CharacterController` calls), but they are controlled by completely different sources — a human vs. autonomous AI logic. Without drivers, you'd need `if (isPlayer) { ... } else { ... }` scattered everywhere.

**Solution**: `IAgentDriver` is a simple interface with one method: `update(positions, delta)`. Each entity gets one driver. The frame loop calls `DriverManager.update()` which iterates all drivers uniformly.

```
IAgentDriver
├─ PlayerInputDriver    → translates pointer/click events into controller.moveTo() calls
└─ NpcAgentDriver       → autonomous behavior (currently idle skeleton, ready to extend)
```

### `PlayerInputDriver`

- Registered to index `0` (the player).
- Receives callbacks from `InputManager` (floor click → `onFloorClick(x, z)`, or from `SceneManager.startChat` → `walkTo(target, arrivalState)`).
- Contains **zero** animation logic — it calls `controller.moveTo()` or `controller.play()` and the state machine handles the rest.
- `update()` is currently empty, reserved for keyboard/gamepad polling.

### `NpcAgentDriver`

- One instance per NPC, registered from `NPC_START_INDEX` onward.
- Has access to: `controller` (full character API) and `data` (AgentData: role, personality, etc.).
- `update(positions, delta)` is called every frame **after** the GPU→CPU position readback, so `positions` is fresh.
- Currently empty — this is intentional. Add autonomous behaviors here:
  - Wander between POIs → `this.controller.walkToPoi(this.agentIndex, 'poi_sit_01')`
  - React to nearby player → check `positions[PLAYER_INDEX*4]` vs `positions[this.agentIndex*4]`
  - Expression reactions → `this.controller.play(this.agentIndex, 'happy')`

### Swapping drivers

`DriverManager.setDriver(agentIndex, newDriver)` lets you replace any driver at runtime. You could, for example, give an NPC full player-like control by replacing its `NpcAgentDriver` with a second `PlayerInputDriver`.

---

## Conversation (`src/services/`)

| File                     | Responsibility                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `geminiService.ts`       | Low-level Gemini API wrapper. Converts `ChatMessage[]` history to Gemini format, returns `string`. No domain knowledge.                             |
| `conversationService.ts` | Domain logic: builds system prompts per agent persona, exposes `getGreeting(agent)` and `sendMessage(agent, history, text)`. No Three.js. No store. |

`SceneManager` calls `conversationService` and writes results to the Zustand store (`chatMessages`, `isThinking`). The UI reads those store values reactively.

---

## Adding new behaviors — checklist

### New character state (e.g. `dance`)

1. Add `'dance'` to `CharacterStateKey` union in `src/types.ts`.
2. Add one entry to `STATE_MAP` in `src/three/behavior/CharacterStateMachine.ts`:
   ```ts
   dance: { animation: AnimationName.DANCE, expression: 'happy', loop: true, interruptible: true },
   ```
3. Add the animation name to `AnimationName` enum in `src/types.ts`.
4. Done. Call `controller.play(index, 'dance')` from anywhere.

### New NPC autonomous behavior

- Edit `NpcAgentDriver.update()` in `src/three/drivers/NpcAgentDriver.ts`.
- Use `this.controller.*` for all character control.
- Use `positions[this.agentIndex * 4]` for world-space X, `[...+2]` for Z.

### New POI

```ts
poiManager.addPoi({
  id: 'desk_01',
  position: new THREE.Vector3(3, 0, 2),
  arrivalState: 'sit',
  occupiedBy: null,
})
// Then from an NpcAgentDriver:
this.controller.walkToPoi(this.agentIndex, 'desk_01')
```

### New UI panel that needs 3D interaction

1. Call `useSceneManager()` in the component to get the scene.
2. Add the public method to `SceneManager` if not already there.
3. Do **not** add Three.js logic to Zustand or React; keep it in `SceneManager`.

---

## File tree

```
src/
├─ App.tsx                        React root, SceneContext.Provider
├─ types.ts                       Shared type contracts for the whole project
├─ index.css / main.tsx           Entry points
│
├─ components/
│   ├─ UIOverlay.tsx              HUD, NPC info panel, Start/End Chat buttons
│   ├─ ChatPanel.tsx              Chat slide-over panel
│   └─ HelpModal.tsx              Help overlay
│
├─ data/
│   └─ agents.ts                  Agent data (roles, departments, personalities)
│
├─ services/
│   ├─ geminiService.ts           Raw Gemini API wrapper
│   └─ conversationService.ts     Agent persona prompts, greeting & chat helpers
│
├─ store/
│   └─ useStore.ts                Zustand store — pure data + simple setters
│
└─ three/
    ├─ constants.ts               All magic numbers in one place
    ├─ SceneManager.ts            Orchestrator: game loop, wiring, public chat API
    ├─ SceneContext.ts            React context carrying SceneManager to components
    ├─ CharacterController.ts     Unified character API (play, moveTo, setSpeaking…)
    │
    ├─ behavior/
    │   ├─ AgentStateBuffer.ts    GPU buffer: physics mode (IDLE/GOTO) + animation index
    │   ├─ ExpressionBuffer.ts    GPU buffer: per-instance eye/mouth UV offsets, blink, speaking
    │   └─ CharacterStateMachine.ts  Declarative state→animation+expression map + timers
    │
    ├─ core/
    │   ├─ Engine.ts              WebGPU renderer, animation loop timer
    │   └─ Stage.ts               Camera, OrbitControls, resize, chat camera mode
    │
    ├─ drivers/
    │   ├─ DriverManager.ts       Registers and iterates all agent drivers
    │   ├─ PlayerInputDriver.ts   Human input → CharacterController
    │   └─ NpcAgentDriver.ts      Autonomous NPC logic skeleton
    │
    ├─ entities/
    │   └─ CharacterManager.ts    GPU instanced rendering, animation baking, AgentStateBuffer
    │
    ├─ input/
    │   └─ InputManager.ts        Raw pointer events → select / waypoint / hover callbacks
    │
    ├─ pathfinding/
    │   ├─ NavMeshManager.ts      three-pathfinding wrapper: buildFromPlane, findPath
    │   └─ PathAgent.ts           Per-agent CPU path follower: setPath, update (checks arrival)
    │
    └─ world/
        └─ PoiManager.ts          POI registry: add, occupy, release, getNearestFreePoi
```
