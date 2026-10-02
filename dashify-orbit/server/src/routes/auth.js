import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { requireAuth, signToken } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { User } from '../models/User.js';
import { isValidTimeZone, parseProfileInput } from '../validation.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Compared against when the email doesn't exist, so response timing doesn't reveal registered emails.
const DUMMY_HASH = bcrypt.hashSync('dashify-timing-guard', 12);

const readCredentials = (body = {}) => ({
  name: String(body.name ?? '').trim(),
  email: String(body.email ?? '').trim().toLowerCase(),
  password: String(body.password ?? ''),
});

router.post('/register', async (req, res) => {
  const { name, email, password } = readCredentials(req.body);
  if (!name || name.length > 60) throw new HttpError(400, 'Please enter your name (max 60 characters)');
  if (!EMAIL_RE.test(email) || email.length > 120) throw new HttpError(400, 'Please enter a valid email');
  if (password.length < 8 || password.length > 128) throw new HttpError(400, 'Password must be 8–128 characters');
  if (await User.exists({ email })) throw new HttpError(409, 'An account with this email already exists');

  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    timezone: isValidTimeZone(req.body?.timezone) ? req.body.timezone : 'UTC',
  });
  res.status(201).json({ token: signToken(user.id), user });
});

router.post('/login', async (req, res) => {
  const { email, password } = readCredentials(req.body);
  const user = await User.findOne({ email });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw new HttpError(401, 'Invalid email or password');
  res.json({ token: signToken(user.id), user });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(401, 'Account no longer exists');
  res.json({ user });
});

router.patch('/me', requireAuth, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.userId, parseProfileInput(req.body), { new: true });
  if (!user) throw new HttpError(401, 'Account no longer exists');
  res.json({ user });
});

export default router;
