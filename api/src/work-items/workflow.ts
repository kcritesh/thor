import { WorkItemStatus } from '../generated/prisma/enums.js';

const { RECEIVED, ANALYSING, READY_FOR_REVIEW, COMPLETED, FAILED } =
  WorkItemStatus;

export const TRANSITIONS: Record<WorkItemStatus, readonly WorkItemStatus[]> = {
  [RECEIVED]: [ANALYSING],
  [ANALYSING]: [READY_FOR_REVIEW, FAILED],
  [READY_FOR_REVIEW]: [COMPLETED],
  [FAILED]: [ANALYSING],
  [COMPLETED]: [],
};

// Statuses an ops user may set directly. Everything else is system-driven.
export const MANUAL_TARGETS: readonly WorkItemStatus[] = [COMPLETED];

export function canTransition(from: WorkItemStatus, to: WorkItemStatus) {
  return TRANSITIONS[from].includes(to);
}

export function sourcesFor(to: WorkItemStatus) {
  return (Object.keys(TRANSITIONS) as WorkItemStatus[]).filter((from) =>
    canTransition(from, to),
  );
}
