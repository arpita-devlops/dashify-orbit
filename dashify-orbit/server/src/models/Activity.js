import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    // Denormalized names so the feed still reads well after renames or departures.
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

activitySchema.index({ team: 1, createdAt: -1 });

activitySchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.teamId = String(ret.team);
    ret.actorId = String(ret.actor);
    ret.taskId = ret.task ? String(ret.task) : null;
    delete ret._id;
    delete ret.__v;
    delete ret.team;
    delete ret.actor;
    delete ret.task;
    return ret;
  },
});

export const Activity = mongoose.model('Activity', activitySchema);
