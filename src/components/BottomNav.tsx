import { Menu, type MenuProps } from 'antd';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

const { Item: MenuItem } = Menu;

export interface BottomNavItem {
  id?: string;
  to?: string;
  path?: string;
  icon?: ReactNode;
  label: ReactNode;
}

interface BottomNavProps {
  items?: (BottomNavItem | null | undefined)[];
}

export default function BottomNav({ items = [] }: BottomNavProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  const entries = useMemo(() => {
    return items.filter(Boolean).map((item) => {
      const destination = item?.to ?? item?.path ?? '#';
      const key = item?.id ?? destination;
      return {
        ...item,
        key,
        destination,
      };
    });
  }, [items]);

  const selectedKey = useMemo(() => {
    const current = entries.find(({ destination }) => {
      if (!destination || destination === '#') return false;
      if (destination === '/' || destination === '') {
        return location.pathname === '/' || location.pathname === '';
      }
      return location.pathname.startsWith(destination);
    });
    return current?.key ?? '';
  }, [entries, location.pathname]);

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    const entry = entries.find((item) => item.key === key);
    if (!entry) return;
    const { destination } = entry;
    if (destination && destination !== '#') {
      navigate(destination);
    }
  };

  return (
    <nav
      className="bottom-nav"
      aria-label="Primary">
      <Menu
        mode="horizontal"
        selectedKeys={selectedKey ? [selectedKey] : []}
        onClick={handleClick}
        className="bottom-nav__menu">
        {entries.map(({ key, icon, label }) => (
          <MenuItem
            key={key}
            className="bottom-nav__item"
            title={typeof label === 'string' ? label : undefined}>
            <span className="bottom-nav__content">
              {icon ? <span className="bottom-nav__icon">{icon}</span> : null}
              <span className="bottom-nav__label">{label}</span>
            </span>
          </MenuItem>
        ))}
      </Menu>
    </nav>
  );
}
