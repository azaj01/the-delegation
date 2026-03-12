import { useCoreStore, type Task } from './store/coreStore';
import {
  callAgent,
  callOrchestrator,
  callBoardroomAgent,
  type AgentFunctionCall,
} from './coreService';
import { ToolHandlerService } from './toolHandlerService';

const ORCHESTRATOR_INDEX = 1;

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class CoreOrchestrator {
  private runningAgents = new Set<number>();
  private unsubscribe: (() => void) | null = null;
  private static instance: CoreOrchestrator;

  private constructor() {
    this.startWatchingTasks();
  }

  public static getInstance(): CoreOrchestrator {
    if (!CoreOrchestrator.instance) {
      CoreOrchestrator.instance = new CoreOrchestrator();
    }
    return CoreOrchestrator.instance;
  }

  public destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  private startWatchingTasks() {
    this.unsubscribe = useCoreStore.subscribe((state, prevState) => {
      const tasksChanged = state.tasks.some((t, i) => t.status !== prevState.tasks[i]?.status) ||
                           state.tasks.length !== prevState.tasks.length;

      if (tasksChanged) {
        this.checkAllTasksDone();
      }

      const newScheduled = state.tasks.filter(
        (t) => t.status === 'scheduled' &&
               !prevState.tasks.some((pt) => pt.id === t.id && pt.status === 'scheduled')
      );

      for (const task of newScheduled) {
        this.dispatchTask(task);
      }
    });
  }

  private processFunctionCall(fn: AgentFunctionCall, callerIndex: number): boolean {
    const handled = ToolHandlerService.process(fn, callerIndex);

    if (handled && fn.name === 'complete_task') {
      this.runningAgents.delete(callerIndex);
      setTimeout(() => this.checkAllTasksDone(), 100);
    }

    if (handled && fn.name === 'request_client_approval') {
      this.runningAgents.delete(callerIndex);
    }

    return handled;
  }

  private async checkAllTasksDone() {
    const store = useCoreStore.getState();
    if (store.phase !== 'working' && store.phase !== 'awaiting_approval') return;

    const hasTasks = store.tasks.length > 0;
    const allDone = hasTasks && store.tasks.every((t) => t.status === 'done');
    const isEmptyWorking = !hasTasks && (store.phase === 'working' || store.phase === 'awaiting_approval');

    if (!allDone && !isEmptyWorking) return;
    if (store.finalOutput) return;
    if (this.runningAgents.has(ORCHESTRATOR_INDEX)) return;

    this.runningAgents.add(ORCHESTRATOR_INDEX);

    try {
      const outputs = store.tasks
        .filter((t) => t.output)
        .map((t) => `[${t.description}]\n${t.output}`)
        .join('\n\n---\n\n');

      const prompt = hasTasks
        ? `All tasks are completed. Team outputs:\n\n${outputs}\n\nNow assemble the final prompt for the client and call notify_client_project_ready.`
        : `All tasks have been removed. Sum up and call notify_client_project_ready.`;

      const response = await callOrchestrator(prompt);
      if (response.functionCalls) {
        for (const fn of response.functionCalls) {
          this.processFunctionCall(fn, ORCHESTRATOR_INDEX);
        }
      }
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') console.error('[Orchestrator] final delivery error:', err);
    } finally {
      this.runningAgents.delete(ORCHESTRATOR_INDEX);
    }
  }

  private async dispatchTask(task: Task) {
    const isBoardroom = task.assignedAgentIds.length > 1;

    if (isBoardroom) {
      const anyBusy = task.assignedAgentIds.some((i) => this.runningAgents.has(i));
      if (anyBusy) return;
      task.assignedAgentIds.forEach((i) => this.runningAgents.add(i));
      this.runBoardroomTask(task);
    } else {
      const agentIndex = task.assignedAgentIds[0];
      if (this.runningAgents.has(agentIndex)) return;
      this.runningAgents.add(agentIndex);
      this.runSingleAgentTask(task, agentIndex);
    }
  }

  private async runSingleAgentTask(task: Task, agentIndex: number) {
    await sleep(randomBetween(1500, 3000));
    const store = useCoreStore.getState();
    store.updateTaskStatus(task.id, 'in_progress');
    store.addLogEntry({
      agentIndex,
      action: `started work on task`,
      taskId: task.id,
    });

    try {
      const response = await callAgent({
        agentIndex,
        userMessage: `You have been assigned task [${task.id}]: "${task.description}". ` +
          `First, analyze the task and call request_client_approval to discuss your plan with the client. ` +
          `If the client approves, call complete_task with your final output.`,
      });
      if (response.functionCalls) {
        for (const fn of response.functionCalls) {
          this.processFunctionCall(fn, agentIndex);
        }
      }
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') console.error(`[Orchestrator] agent ${agentIndex} task error:`, err);
    } finally {
      this.runningAgents.delete(agentIndex);
    }
  }

  private async runBoardroomTask(task: Task) {
    const store = useCoreStore.getState();
    const agents = task.assignedAgentIds;

    store.addLogEntry({
      agentIndex: agents[0],
      action: `gathering team in boardroom for "${task.description}"`,
      taskId: task.id,
    });

    await sleep(2000);

    store.updateTaskStatus(task.id, 'in_progress');

    try {
      for (const agentIndex of agents) {
        const response = await callBoardroomAgent(agentIndex, task.id, `Boardroom session for ${task.description}. Propose subtasks or discuss.`);
        if (response.functionCalls) {
          for (const fn of response.functionCalls) {
            this.processFunctionCall(fn, agentIndex);
          }
        }
        await sleep(1500);
      }
      store.updateTaskStatus(task.id, 'done');
      store.addLogEntry({
        agentIndex: agents[0],
        action: `boardroom session concluded — subtasks distributed`,
        taskId: task.id,
      });
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') console.error('[Orchestrator] boardroom error:', err);
    } finally {
      agents.forEach((idx) => this.runningAgents.delete(idx));
    }
  }

  public async handleCoreMessage(npcIndex: number, text: string): Promise<string | null> {
    const store = useCoreStore.getState();

    if (npcIndex === ORCHESTRATOR_INDEX) {
      if (store.phase === 'idle') {
        store.setPhase('briefing');
      }

      const orchestratorPendingTask = store.tasks.find(
        (t) => t.status === 'on_hold' && t.assignedAgentIds.includes(ORCHESTRATOR_INDEX)
      );

      try {
        if (orchestratorPendingTask) {
          store.updateTaskStatus(orchestratorPendingTask.id, 'in_progress');
        }
        this.runningAgents.add(npcIndex);
        const response = await callAgent({ agentIndex: npcIndex, userMessage: text, chatMode: true });
        if (response.functionCalls) {
          for (const fn of response.functionCalls) {
            this.processFunctionCall(fn, npcIndex);
          }
        }
        return response.text || null;
      } catch (err) {
        console.error('[Orchestrator] HM error:', err);
        return null;
      } finally {
        this.runningAgents.delete(npcIndex);
      }
    }

    const pendingTask = store.tasks.find(
      (t) => t.status === 'on_hold' && t.assignedAgentIds.includes(npcIndex)
    );
    if (pendingTask) {
      store.updateTaskStatus(pendingTask.id, 'in_progress');
      store.addLogEntry({
        agentIndex: 0,
        action: `approved task`,
        taskId: pendingTask.id,
      });

      this.runningAgents.add(npcIndex);
      try {
        const response = await callAgent({ agentIndex: npcIndex, userMessage: text, chatMode: true });
        if (response.functionCalls) {
          for (const fn of response.functionCalls) {
            this.processFunctionCall(fn, npcIndex);
          }
        }
        return response.text || null;
      } catch (err) {
        console.error('[Orchestrator] NPC HM error:', err);
        return null;
      } finally {
        this.runningAgents.delete(npcIndex);
      }
    }

    try {
      const response = await callAgent({ agentIndex: npcIndex, userMessage: text, chatMode: true });
      return response.text || null;
    } catch (err) {
      console.error('[Orchestrator] generic chat error:', err);
      return null;
    }
  }
}
