import crypto from 'node:crypto';
import mongoose from 'mongoose';

export const ROLES = ['viewer', 'member', 'admin', 'owner'];
export const ROLE_RANK = { viewer: 0, member: 1, admin: 2, owner: 3 };

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid typos

export function generateJoinCode() {
  return [...crypto.randomBytes(8)].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    joinCode: { type: String, required: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

teamSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.createdBy = String(ret.createdBy);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const membershipSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ROLES, default: 'member' },
  },
  { timestamps: true },
);
membershipSchema.index({ team: 1, user: 1 }, { unique: true });

export const Team = mongoose.model('Team', teamSchema);
export const Membership = mongoose.model('Membership', membershipSchema);
