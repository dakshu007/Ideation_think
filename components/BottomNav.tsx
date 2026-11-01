import Link from 'next/link';
import { Bolt, Chat, Home, Phone } from './icons';

const items = [
  { href: '/dashboard', label: 'Home', Icon: Home },
  { href: '/test', label: 'Test', Icon: Phone },
  { href: '/feedback', label: 'Feedback', Icon: Chat },
  { href: '/boost', label: 'Boost', Icon: Bolt },
] as const;

export default function BottomNav({ active }: { active: (typeof items)[number]['href'] }) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      <div className="inner">
        {items.map(({ href, label, Icon }) => (
          <Link key={href} href={href} aria-current={active === href ? 'page' : undefined}>
            <Icon />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
