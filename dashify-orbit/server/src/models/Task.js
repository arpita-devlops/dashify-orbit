import mongoose from 'mongoose';

export const STATUSES = ['todo', 'in_progress', 'done'];
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const taskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // null = personal task; otherwise shared with every member of the team
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, default: '', maxlength: 2000 },
    status: { type: String, enum: STATUSES, default: 'todo' },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    tags: { type: [String], default: [] },
    dueAt: { type: Date, default: null },
    remindAt: { type: Date, default: null },
    reminded: { type: Boolean, default: false },
    estimateMins: { type: Number, min: 5, max: 600, default: 45 },
    completedAt: { type: Date, default: null },
    aiReason: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true },
);

taskSchema.index({ user: 1, status: 1, dueAt: 1 });

taskSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.teamId = ret.team ? String(ret.team) : null;
    ret.assigneeId = ret.assignee ? String(ret.assignee) : null;
    ret.createdBy = ret.user ? String(ret.user) : null;
    delete ret._id;
    delete ret.__v;
    delete ret.user;
    delete ret.team;
    delete ret.assignee;
    return ret;
  },
});

export const Task = mongoose.model('Task', taskSchema);
