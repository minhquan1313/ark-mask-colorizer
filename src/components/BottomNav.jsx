import { NavLink } from 'react-router-dom';

export default function BottomNav({ items = [] }) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((item) => {
        if (!item) return null;
        const { id, label, icon, to, path, end } = item;
        const destination = to ?? path ?? '#';
        const key = id ?? destination;
        return (
          <NavLink
            key={key}
            to={destination}
            end={end}
            className={({ isActive }) => (isActive ? 'bottom-nav__item is-active' : 'bottom-nav__item')}
            aria-label={label}>
            <span className="bottom-nav__icon" aria-hidden="true">
              {icon}
            </span>
            <span className="bottom-nav__tooltip">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
