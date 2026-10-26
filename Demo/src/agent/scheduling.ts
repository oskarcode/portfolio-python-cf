import { Type } from "@earendil-works/pi-ai";
import { type ConversationId, defineDoc, defineTask, type TaskInspection, type ToolRegistration } from "@earendil-works/pi-durable";

type ScheduledInstruction = { id: string; conversationId: ConversationId; instruction: string; runAt: number };
type DeliveryState = { phase: "wait" } | { phase: "deliver" };
const MAX_DELAY_SECONDS = 366 * 24 * 60 * 60;
const ScheduleIntent = defineDoc<{ scheduled?: ScheduledInstruction }>({ kind: "portfolio.schedule-intent", version: 1, scope: "task", initial: () => ({}) });

export const DeliverScheduledInstruction = defineTask<ScheduledInstruction, DeliveryState, null>({
  name: "portfolio.deliver-scheduled-instruction", version: 1, initial: () => ({ phase: "wait" }),
  phases: {
    wait: async (task, runtime, context) => {
      await runtime.sleep(task.input.runAt, context);
      await runtime.commit(() => ({ status: "running", checkpoint: { phase: "deliver" } }), context);
    },
    deliver: async (task, runtime, context) => {
      const conversation = await runtime.conversation(task.input.conversationId, context);
      if (conversation) {
        const submission = await conversation.submit({ type: "input", content: `Scheduled instruction due now: ${task.input.instruction}`, requestId: task.input.id, whenBusy: "followUp" }, context);
        await submission.wait(context);
      }
      await runtime.commit(() => ({ status: "terminal", outcome: { status: "completed", result: null } }), context);
    },
  },
  abort: async (_task, runtime, context) => {
    await runtime.commit(() => ({ status: "terminal", outcome: { status: "aborted" } }), context);
  },
});

export function scheduledDeadline(task: TaskInspection): number | undefined {
  if (task.record.kind !== DeliverScheduledInstruction.definition.name || task.record.state.status === "terminal" || task.record.state.status === "completing") return undefined;
  const input = task.record.input as Partial<ScheduledInstruction>;
  const checkpoint = task.record.state.checkpoint as Partial<DeliveryState>;
  return checkpoint.phase === "wait" && Number.isSafeInteger(input.runAt) ? input.runAt : undefined;
}

export function matchesSchedule(task: TaskInspection, conversationId: ConversationId, scheduleId: string): boolean {
  const input = task.record.input as Partial<ScheduledInstruction>;
  return task.record.kind === DeliverScheduledInstruction.definition.name && input.conversationId === conversationId && input.id === scheduleId;
}

export function createScheduleTools(ensureWakeupAt: (timestamp: number) => Promise<void>, cancel: (conversationId: ConversationId, scheduleId: string) => Promise<number>): ToolRegistration[] {
  return [
    {
      name: "schedule", description: "Schedule a self-contained instruction to run later in this workspace. Use a relative delay or an absolute ISO 8601 date-time with timezone.", replay: "safe",
      parameters: Type.Object({ instruction: Type.String({ minLength: 1, maxLength: 16_000 }), delaySeconds: Type.Optional(Type.Integer({ minimum: 1, maximum: MAX_DELAY_SECONDS })), at: Type.Optional(Type.String()) }),
      execute: async (args: { instruction: string; delaySeconds?: number; at?: string }, api, context) => {
        const existing = (await api.snapshot(ScheduleIntent, api.taskId, context))?.scheduled;
        if (existing) { await ensureWakeupAt(existing.runAt); return { output: [{ type: "text" as const, text: `Already scheduled as ${existing.id} for ${new Date(existing.runAt).toISOString()}.` }] }; }
        if ((args.delaySeconds === undefined) === (args.at === undefined)) throw new Error("Provide exactly one of delaySeconds or at");
        const now = Date.now(); const runAt = args.delaySeconds !== undefined ? now + args.delaySeconds * 1_000 : Date.parse(args.at!);
        if (!Number.isFinite(runAt) || runAt <= now || runAt > now + MAX_DELAY_SECONDS * 1_000) throw new Error("Schedule time must be valid, future, timezone-aware, and within one year");
        const scheduled = await api.commit(async (tx) => {
          const intent = await tx.doc(ScheduleIntent, api.taskId);
          if (intent.scheduled) return intent.scheduled;
          const value: ScheduledInstruction = { id: `schedule:${api.taskId}`, conversationId: api.conversationId, instruction: args.instruction.trim(), runAt };
          intent.scheduled = value;
          await tx.createTask(DeliverScheduledInstruction, value, { ownership: { kind: "conversation" }, conversationId: api.conversationId, background: true });
          return value;
        }, context);
        await ensureWakeupAt(scheduled.runAt);
        return { output: [{ type: "text" as const, text: `Scheduled as ${scheduled.id} for ${new Date(scheduled.runAt).toISOString()}. Use cancel_schedule with this ID to cancel it.` }] };
      },
    },
    {
      name: "cancel_schedule", description: "Cancel a scheduled instruction in this workspace by its schedule ID.", replay: "safe",
      parameters: Type.Object({ scheduleId: Type.String({ minLength: 1, maxLength: 256 }) }),
      execute: async ({ scheduleId }: { scheduleId: string }, api) => {
        const count = await cancel(api.conversationId, scheduleId);
        return { output: [{ type: "text" as const, text: count ? `Cancelled ${scheduleId}.` : `No active schedule ${scheduleId} was found.` }] };
      },
    },
  ];
}
