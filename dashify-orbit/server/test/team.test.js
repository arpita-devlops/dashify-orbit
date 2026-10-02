import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildStandup, workloadBalance } from '../src/services/team.js';

const now = new Date('2026-10-02T12:00:00Z');
const hoursAgo = (h) => new Date(now.getTime() - h * 3_600_000).toISOString();

const members = [
  { id: 'u1', name: 'Maya Chen', timezone: 'America/New_York' },
  { id: 'u2', name: 'Lukas Weber', timezone: 'Europe/Berlin' },
  { id: 'u3', name: 'Priya Nair', timezone: 'Asia/Kolkata' },
];

const tasks = [
  { id: 't1', title: 'Shipped feature', status: 'done', assigneeId: 'u1', completedAt: hoursAgo(3), priority: 'high' },
  { id: 't2', title: 'Old win', status: 'done', assigneeId: 'u1', completedAt: hoursAgo(40), priority: 'low' },
  { id: 't3', title: 'Overdue fix', status: 'todo', assigneeId: 'u2', dueAt: hoursAgo(5), priority: 'high', estimateMins: 60 },
  { id: 't4', title: 'Big migration', status: 'in_progress', assigneeId: 'u2', priority: 'urgent', estimateMins: 240 },
  { id: 't5', title: 'Docs polish', status: 'todo', assigneeId: 'u2', priority: 'low', estimateMins: 60 },
  { id: 't6', title: 'Unowned task', status: 'todo', assigneeId: null, priority: 'medium', estimateMins: 30 },
];

describe('buildStandup', () => {
  const standup = buildStandup(members, tasks, { now });
  const byId = Object.fromEntries(standup.members.map((m) => [m.userId, m]));

  it('only counts work completed in the last 24 hours', () => {
    assert.deepEqual(byId.u1.done, ['Shipped feature']);
  });

  it('flags overdue work as blockers and lists in-flight tasks', () => {
    assert.deepEqual(byId.u2.blockers, ['Overdue fix']);
    assert.deepEqual(byId.u2.doing, ['Big migration']);
  });

  it('summarizes blockers and unassigned work', () => {
    assert.match(standup.summary, /Lukas/);
    assert.match(standup.summary, /unassigned/);
  });
});

describe('workloadBalance', () => {
  const { load, suggestions } = workloadBalance(members, tasks);

  it('marks the most loaded teammate as overloaded', () => {
    assert.equal(load.find((l) => l.userId === 'u2').status, 'overloaded');
  });

  it('suggests moving the lowest-priority todo to the lightest teammate', () => {
    const move = suggestions.find((s) => s.taskId === 't5');
    assert.ok(move, 'expected a rebalancing suggestion');
    assert.ok(['u1', 'u3'].includes(move.to));
  });

  it('suggests an owner for unassigned work', () => {
    assert.ok(suggestions.some((s) => s.taskId === 't6'));
  });
});
