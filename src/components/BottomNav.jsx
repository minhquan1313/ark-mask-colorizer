import { Menu } from 'antd';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function BottomNav({ items = [] }) {
  const location = useLocation();
  const navigate = useNavigate();

  const menuData = useMemo(() => {
    return items.filter(Boolean).map((item) => {
      const destination = item.to ?? item.path ?? '#';
      const key = item.id ?? destination;
      return {
        key,
        icon: item.icon,
        label: item.label,
        onClick: () => navigate(destination),
      };
    });
  }, [items, navigate]);

  const selectedKey = useMemo(() => {
    const current = menuData.find((entry) => {
      if (!entry) return false;
      const item = items.find((itm) => (itm.id ?? itm.to ?? itm.path) === entry.key);
      if (!item) return false;
      const destination = item.to ?? item.path;
      if (!destination) return false;
      if (destination === '/' && location.pathname === '/') return true;
      return location.pathname.startsWith(destination);
    });
    return current?.key ?? '';
  }, [items, location.pathname, menuData]);

  return (
    <nav
      className="bottom-nav"
      aria-label="Primary">
      <Menu
        mode="horizontal"
        selectedKeys={selectedKey ? [selectedKey] : []}
        items={menuData}
        itemType="MenuItemType"
        className="bottom-nav__menu"
      />
    </nav>
  );
}
