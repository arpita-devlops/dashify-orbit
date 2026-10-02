import { initials } from '../../lib/format';

const GRADIENTS = ['from-accent to-coral', 'from-ion to-lilac', 'from-mint to-ion', 'from-lilac to-coral', 'from-coral to-accent', 'from-ion to-mint'];
const hash = (s = '') => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export default function Avatar({ name = '?', id, size = 'h-8 w-8 text-xs', online, className = '' }) {
  return (
    <span
      title={name}
      className={`relative inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-display font-bold text-[#140f06] ${GRADIENTS[hash(id || name) % GRADIENTS.length]} ${size} ${className}`}
    >
      {initials(name)}
      {online !== undefined && (
        <span className={`absolute -bottom-0.5 -right-0.5 h-[34%] min-h-[8px] w-[34%] min-w-[8px] rounded-full ring-2 ring-surface ${online ? 'bg-mint' : 'bg-muted/60'}`} />
      )}
    </span>
  );
}
