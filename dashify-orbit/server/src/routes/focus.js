import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { FocusSession } from '../models/FocusSession.js';
import { Task } from '../models/Task.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const sessions = await FocusSession.find({ user: req.userId }).sort({ startedAt: -1 }).limit(300);
  res.json({ sessions });
});

router.post('/', async (req, res) => {
  const minutes = Number(req.body?.minutes);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) throw new HttpError(400, 'Minutes must be a whole number between 1 and 240');

  let task = null;
  const { taskId } = req.body ?? {};
  if (taskId) {
    if (!mongoose.isValidObjectId(taskId) || !(await Task.exists({ _id: taskId, user: req.userId }))) {
      throw new HttpError(400, 'Unknown task');
    }
    task = taskId;
  }

  const completedAt = new Date();
  const startedAt = new Date(completedAt.getTime() - minutes * 60_000);
  const session = await FocusSession.create({ user: req.userId, task, minutes, startedAt, completedAt });
  res.status(201).json({ session });
});

export default router;
