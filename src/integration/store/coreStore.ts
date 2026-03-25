import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { LLMMessage, LLMTokenUsage, LLMToolCall, LLMToolDefinition } from '../../core/llm/types';
import { useTeamStore } from './teamStore';

export type TaskStatus = 'scheduled' | 'on_hold' | 'in_progress' | 'done'

export interface Task {
  id: string
  title: string
  description: string
  assignedAgentIds: number[]
  status: TaskStatus
  parentTaskId?: string
  requiresClientApproval: boolean
  output?: string
  createdAt: number
  updatedAt: number
}

export interface ActionLogEntry {
  id: string
  timestamp: number
  agentIndex: number
  action: string
  taskId?: string
}

export interface DebugLogEntryBase {
  id: string
  timestamp: number
  agentIndex: number
  agentName: string
  status: 'pending' | 'completed' | 'error'
  taskId?: string
}

export interface RequestDebugLogEntry extends DebugLogEntryBase {
  phase: 'request'
  systemInstruction?: string
  contents: any[]
  systemTools?: any[]
}

export interface ResponseDebugLogEntry extends DebugLogEntryBase {
  phase: 'response'
  content: string | null
  tool_calls?: LLMToolCall[]
  usage?: LLMTokenUsage
  raw?: any
}

export type DebugLogEntry = RequestDebugLogEntry | ResponseDebugLogEntry;

export type ProjectPhase = 'idle' | 'working' | 'done'

interface CoreState {
  // ── Project ──────────────────────────────────────────────────
  clientBrief: string
  phase: ProjectPhase
  finalOutput: string | null
  availableModels: string[]
  totalTokenUsage: LLMTokenUsage
  agentTokenUsage: Record<number, LLMTokenUsage>

  // ── Tasks ────────────────────────────────────────────────────
  tasks: Task[]

  // ── Log ──────────────────────────────────────────────────────
  actionLog: ActionLogEntry[]
  debugLog: DebugLogEntry[]

  // ── Conversation histories (Agnostic standard) ───────────────
  agentHistories: Record<number, LLMMessage[]>
  agentSummaries: Record<number, string>
  boardroomHistories: Record<string, LLMMessage[]>

  // ── UI ───────────────────────────────────────────────────────
  isKanbanOpen: boolean
  viewMode: 'simulation' | 'design';
  isLogOpen: boolean
  isFinalOutputOpen: boolean;
  pendingApprovalTaskId: string | null;
  logFilterAgentIndex: number | null;
  isResizing: boolean;
  isPaused: boolean;
  pauseOnCall: boolean;

  // ── Actions — Project ─────────────────────────────────────────
  setClientBrief: (brief: string) => void;
  setPhase: (phase: ProjectPhase) => void;
  setFinalOutput: (output: string) => void;

  // ── Actions — Tasks ───────────────────────────────────────────
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task;
  removeTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  setTaskOutput: (taskId: string, output: string) => void;

  // ── Actions — Log ─────────────────────────────────────────────
  addLogEntry: (entry: Omit<ActionLogEntry, 'id' | 'timestamp'>) => void;
  addRequestLog: (entry: Omit<RequestDebugLogEntry, 'id' | 'timestamp' | 'phase' | 'status'>) => void;
  addResponseLog: (entry: Omit<ResponseDebugLogEntry, 'id' | 'timestamp' | 'phase' | 'status'>) => void;

  // ── Actions — History ───────────────────────────────────────
  appendAgentHistory: (agentIndex: number, role: 'user' | 'assistant', parts: any[]) => void;
  setAgentSummary: (agentIndex: number, summary: string) => void;
  appendBoardroomHistory: (taskId: string, role: 'user' | 'assistant', parts: any[]) => void;
  clearAllHistories: () => void;

  // ── Actions — UI ──────────────────────────────────────────────
  setKanbanOpen: (open: boolean) => void;
  setLogOpen: (open: boolean, filterAgent?: number | null) => void;
  setFinalOutputOpen: (open: boolean) => void;
  setPendingApproval: (taskId: string | null) => void;
  setIsResizing: (isResizing: boolean) => void;
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  togglePauseOnCall: () => void;
  resetProject: () => void;
  setViewMode: (mode: 'simulation' | 'design') => void;
}

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

export const useCoreStore = create<CoreState>()(
  persist(
    (set) => ({
      clientBrief: '',
      phase: 'idle',
      finalOutput: null,
      availableModels: [
        'gemini-3-flash-preview',
        'gemini-3.1-pro-preview',
        'gemini-3.1-flash-lite-preview'
      ],
      totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      agentTokenUsage: {},
      tasks: [],
      actionLog: [],
      debugLog: [],
      agentHistories: {},
      agentSummaries: {},
      boardroomHistories: {},
      isKanbanOpen: true,
      isLogOpen: true,
      isFinalOutputOpen: false,
      pendingApprovalTaskId: null,
      logFilterAgentIndex: null,
      isResizing: false,
      isPaused: false,
      pauseOnCall: false,
      viewMode: 'simulation',

      setViewMode: (viewMode) => set({ viewMode }),

      resetProject: () => set({
        clientBrief: '',
        phase: 'idle',
        finalOutput: null,
        tasks: [],
        actionLog: [],
        debugLog: [],
        agentHistories: {},
        agentSummaries: {},
        boardroomHistories: {},
        pendingApprovalTaskId: null,
        isFinalOutputOpen: false,
        isPaused: false,
        totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        agentTokenUsage: {},
      }),

      setClientBrief: (brief) => set({ clientBrief: brief }),
      setPhase: (phase) => set({ phase }),
      setFinalOutput: (output) => set({ finalOutput: output }),

      addTask: (task) => {
        const newTask: Task = {
          ...task,
          id: `task_${uid()}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((s) => ({ tasks: [...s.tasks, newTask] }))
        return newTask
      },

      removeTask: (taskId) =>
        set((s) => {
          const newTasks = s.tasks.filter((t) => t.id !== taskId);

          // Logic to check if removing this task finishes the project
          const hasRemainingTasks = newTasks.some(t => t.status !== 'done');
          const isWorking = s.phase === 'working';

          let nextPhase = s.phase;
          if (isWorking && !hasRemainingTasks) {
            nextPhase = 'done';
          }

          return {
            tasks: newTasks,
            phase: nextPhase,
            // If the pending approval task is removed, clear that as well
            pendingApprovalTaskId: s.pendingApprovalTaskId === taskId ? null : s.pendingApprovalTaskId,
          };
        }),

      updateTaskStatus: (taskId, status) =>
        set((s) => {
          const task = s.tasks.find((t) => t.id === taskId);
          if (!task) return {};

          // Safety check: Cannot move back to 'in_progress' or 'on_hold' if already 'done'
          if (task.status === 'done' && (status === 'in_progress' || status === 'on_hold')) {
            return {};
          }

          return {
            tasks: s.tasks.map((t) =>
              t.id === taskId ? { ...t, status, updatedAt: Date.now() } : t
            ),
          };
        }),

      setTaskOutput: (taskId, output) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, output, updatedAt: Date.now() } : t
          ),
        })),

      addLogEntry: (entry) =>
        set((s) => ({
          actionLog: [
            ...s.actionLog,
            { ...entry, id: `log_${uid()}`, timestamp: Date.now() },
          ],
        })),
      
      addRequestLog: (entry) =>
        set((s) => {
          const newEntry: DebugLogEntry = { 
            ...entry, 
            id: `debug_${uid()}`, 
            timestamp: Date.now(),
            phase: 'request',
            status: 'completed'
          };
          const updated = [...s.debugLog, newEntry];
          return { debugLog: updated.length > 30 ? updated.slice(-30) : updated };
        }),

      addResponseLog: (entry) =>
        set((s) => {
          const newEntry: DebugLogEntry = { 
            ...entry, 
            id: `debug_${uid()}`, 
            timestamp: Date.now(),
            phase: 'response',
            status: 'completed'
          };
          const updated = [...s.debugLog, newEntry];
          
          // Update token usage if available
          let nextTotalUsage = s.totalTokenUsage;
          let nextAgentUsage = { ...s.agentTokenUsage };
          
          if (entry.usage) {
            nextTotalUsage = {
              promptTokens: s.totalTokenUsage.promptTokens + entry.usage.promptTokens,
              completionTokens: s.totalTokenUsage.completionTokens + entry.usage.completionTokens,
              totalTokens: s.totalTokenUsage.totalTokens + entry.usage.totalTokens
            };
            
            const currentAgentUsage = s.agentTokenUsage[entry.agentIndex] || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
            nextAgentUsage[entry.agentIndex] = {
              promptTokens: currentAgentUsage.promptTokens + entry.usage.promptTokens,
              completionTokens: currentAgentUsage.completionTokens + entry.usage.completionTokens,
              totalTokens: currentAgentUsage.totalTokens + entry.usage.totalTokens
            };
          }

          return { 
            debugLog: updated.length > 30 ? updated.slice(-30) : updated,
            totalTokenUsage: nextTotalUsage,
            agentTokenUsage: nextAgentUsage
          };
        }),

      appendAgentHistory: (agentIndex, role, parts) =>
        set((s) => ({
          agentHistories: {
            ...s.agentHistories,
            [agentIndex]: [
              ...(s.agentHistories[agentIndex] ?? []),
              {
                role,
                content: Array.isArray(parts) ? parts.map(p => typeof p === 'string' ? p : JSON.stringify(p)).join(' ') : String(parts),
              },
            ],
          },
        })),

      setAgentSummary: (agentIndex, summary) =>
        set((s) => ({
          agentSummaries: {
            ...s.agentSummaries,
            [agentIndex]: summary
          }
        })),

      appendBoardroomHistory: (taskId, role, parts) =>
        set((s) => ({
          boardroomHistories: {
            ...s.boardroomHistories,
            [taskId]: [
              ...(s.boardroomHistories[taskId] ?? []),
              {
                role,
                content: Array.isArray(parts) ? parts.map(p => typeof p === 'string' ? p : JSON.stringify(p)).join(' ') : String(parts),
              },
            ],
          },
        })),

      clearAllHistories: () => set({ agentHistories: {}, boardroomHistories: {} }),

      setKanbanOpen: (open) => set({ isKanbanOpen: open }),
      setLogOpen: (open, filterAgent = null) =>
        set({ isLogOpen: open, logFilterAgentIndex: filterAgent ?? null }),
      setFinalOutputOpen: (open) => set({ isFinalOutputOpen: open }),
      setPendingApproval: (taskId) => set({ pendingApprovalTaskId: taskId }),
      setIsResizing: (resizing) => set({ isResizing: resizing }),
      togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
      setPaused: (isPaused) => set({ isPaused }),
      togglePauseOnCall: () => set((s) => {
        const nextPauseOnCall = !s.pauseOnCall;
        // If turning OFF debug mode and we are paused, resume automatically
        if (!nextPauseOnCall && s.isPaused) {
          return { pauseOnCall: nextPauseOnCall, isPaused: false };
        }
        return { pauseOnCall: nextPauseOnCall };
      }),
    }),
    {
      name: 'core-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        pauseOnCall: state.pauseOnCall,
      }),
    }
  )
)

// Sync resetProject whenever the active team changes
useTeamStore.subscribe((state, prevState) => {
  if (state.selectedAgentSetId !== prevState.selectedAgentSetId) {
    useCoreStore.getState().resetProject();
  }
});

