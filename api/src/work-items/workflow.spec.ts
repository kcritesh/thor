import { WorkItemStatus } from '../generated/prisma/enums.js';
import { TRANSITIONS, canTransition, sourcesFor } from './workflow.js';

const { RECEIVED, ANALYSING, READY_FOR_REVIEW, COMPLETED, FAILED } =
  WorkItemStatus;

describe('workflow transitions', () => {
  it.each([
    [RECEIVED, ANALYSING],
    [ANALYSING, READY_FOR_REVIEW],
    [ANALYSING, FAILED],
    [FAILED, ANALYSING],
    [READY_FOR_REVIEW, COMPLETED],
  ])('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    [RECEIVED, COMPLETED],
    [RECEIVED, READY_FOR_REVIEW],
    [FAILED, COMPLETED],
    [READY_FOR_REVIEW, ANALYSING],
    [COMPLETED, ANALYSING],
    [COMPLETED, RECEIVED],
  ])('rejects %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it('treats COMPLETED as terminal', () => {
    expect(TRANSITIONS[COMPLETED]).toHaveLength(0);
  });

  it('derives valid sources for a target', () => {
    expect(sourcesFor(COMPLETED)).toEqual([READY_FOR_REVIEW]);
    expect(sourcesFor(ANALYSING).sort()).toEqual([FAILED, RECEIVED].sort());
  });
});
