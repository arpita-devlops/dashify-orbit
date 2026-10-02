import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    body: { type: String, required: true, maxlength: 1000 },
    mentions: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  },
  { timestamps: true },
);

commentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.taskId = String(ret.task);
    ret.teamId = ret.team ? String(ret.team) : null;
    ret.authorId = String(ret.author);
    ret.mentions = ret.mentions.map(String);
    delete ret._id;
    delete ret.__v;
    delete ret.task;
    delete ret.team;
    delete ret.author;
    return ret;
  },
});

export const Comment = mongoose.model('Comment', commentSchema);
