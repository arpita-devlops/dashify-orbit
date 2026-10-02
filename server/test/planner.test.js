import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { heuristicPlan, heuristicPrioritize, scoreTask } from '../src/services/planner.js';

const now = new Date('2026-10-02T08:00:00');
const at = (days, hour) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const tasks = [
  { id: 'a', title: 'Overdue bug fix', status: 'todo', priority: 'medium', dueAt: at(-1, 17), estimateMins: 45, tags: [] },
  { id: 'b', title: 'Write docs', status: 'todo', priority: 'low', dueAt: null, estimateMins: 60, tags: ['writing'] },
  { id: 'c', title: 'Ship feature', status: 'in_progress', priority: 'high', dueAt: at(0, 18), estimateMins: 90, tags: ['work'] },
  { id: 'd', title: 'Done already', status: 'done', priority: 'urgent', dueAt: null, estimateMins: 30, tags: [] },
];

describe('scoreTask', () => {
  it('ranks overdue and due-today work above undated work', () => {
    assert.ok(scoreTask(tasks[0], { now }).score > scoreTask(tasks[1], { now }).score);
    assert.ok(scoreTask(tasks[2], { now }).score > scoreTask(tasks[1], { now }).score);
  });

  it('boosts tasks matching the stated focus', () => {
    const plain = scoreTask(tasks[1], { now }).score;
    const focused = scoreTask(tasks[1], { now, focus: 'writing day' }).score;
    assert.equal(focused - plain, 8);
  });
});

describe('heuristicPlan', () => {
  it('schedules open tasks inside the window, most important first', () => {
    const plan = heuristicPlan(tasks, { start: '09:00', end: '13:00', now });
    const taskBlocks = plan.blocks.filter((b) => b.type === 'task');
    assert.equal(plan.source, 'heuristic');
    assert.equal(taskBlocks[0].taskId, 'c');
    assert.ok(!taskBlocks.some((b) => b.taskId === 'd'), 'done tasks are never scheduled');
    assert.ok(plan.blocks.every((b) => b.end <= '13:00'));
  });

  it('inserts a break after ~90 minutes of focus', () => {
    const plan = heuristicPlan(tasks, { start: '09:00', end: '17:00', now });
    assert.ok(plan.blocks.some((b) => b.type === 'break'));
  });

  it('explains when nothing fits', () => {
    const plan = heuristicPlan(tasks, { start: '09:00', end: '09:10', now });
    assert.equal(plan.blocks.length, 0);
    assert.match(plan.summary, /too short/);
  });
});

describe('heuristicPrioritize', () => {
  it('raises overdue tasks and lowers stale ones', () => {
    const { updates } = heuristicPrioritize(tasks, { now });
    const byId = Object.fromEntries(updates.map((u) => [u.id, u]));
    assert.equal(byId.a.priority, 'urgent');
    assert.ok(!byId.d, 'done tasks are left alone');
  });
});
