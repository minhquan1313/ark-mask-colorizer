export default function BottomNav({ items = [], activeId, onSelect }) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((item) => {
        if (!item) return null;
        const isActive = item.id === activeId;
        const classes = isActive ? 'bottom-nav__item is-active' : 'bottom-nav__item';
        const handleClick = () => {
          if (typeof onSelect === 'function') {
            onSelect(item.id);
          }
        };
        return (
          <button
            key={item.id}
            type="button"
            className={classes}
            onClick={handleClick}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}>
            <span className="bottom-nav__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="bottom-nav__tooltip">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
