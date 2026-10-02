import mongoose from 'mongoose';

const focusSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    minutes: { type: Number, required: true, min: 1, max: 240 },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

focusSessionSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.taskId = ret.task ? ret.task.toString() : null;
    delete ret._id;
    delete ret.__v;
    delete ret.user;
    delete ret.task;
    return ret;
  },
});

export const FocusSession = mongoose.model('FocusSession', focusSessionSchema);
