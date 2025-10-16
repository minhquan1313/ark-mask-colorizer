import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tooltip, Typography } from 'antd';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useI18n } from '../i18n';
import type { TranslateFn } from '../types/mask';

const { Text } = Typography;

interface ColorFavoritesProps {
  label?: string;
  colors?: string[];
  onSelect?: (color: string) => void;
  onRemove?: (color: string) => void;
  onReorder?: (colors: string[]) => void;
}

interface SortableColorSwatchProps {
  id: string;
  color: string;
  disabled: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  t: TranslateFn;
}

function normalizeColor(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

export default function ColorFavorites({ label, colors = [], onSelect, onRemove, onReorder }: ColorFavoritesProps) {
  const { t } = useI18n();
  const items = colors.map((color, index) => ({ id: `${color}-${index}`, color: normalizeColor(color) }));
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );
  const canReorder = typeof onReorder === 'function' && items.length > 1;

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(items, oldIndex, newIndex).map((item) => item.color);
    onReorder?.(reordered);
  };

  const content = (
    <div className="color-favorites__list">
      {items.map((item) => (
        <SortableColorSwatch
          key={item.id}
          id={item.id}
          disabled={!canReorder}
          color={item.color}
          onSelect={() => onSelect?.(item.color)}
          onRemove={() => onRemove?.(item.color)}
          t={t}
        />
      ))}
    </div>
  );

  return (
    <div className="color-favorites">
      {label ? <div className="color-favorites__label small subtle">{label}</div> : null}
      {items.length === 0 ? (
        <div className="color-favorites__empty small subtle">{t('colorFavorites.empty')}</div>
      ) : canReorder ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}>
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={rectSortingStrategy}>
            {content}
          </SortableContext>
        </DndContext>
      ) : (
        content
      )}
    </div>
  );
}

function SortableColorSwatch({ id, color, disabled, onSelect, onRemove, t }: SortableColorSwatchProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { role, tabIndex, ...restAttributes } = attributes;

  const stopPropagation = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`color-favorites__item${isDragging ? ' is-dragging' : ''}`}
      role={role ?? 'button'}
      tabIndex={tabIndex ?? 0}
      onClick={onSelect}
      {...listeners}
      {...restAttributes}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.();
        }
      }}>
      <Tooltip
        title={
          <>
            {color} <Text copyable={{ text: color }} />
          </>
        }>
        <button
          type="button"
          className="color-favorites__swatch"
          style={{ backgroundColor: color }}
          ref={setActivatorNodeRef}
          disabled={disabled}
          aria-label={t('colorFavorites.reorderAria')}
        />
      </Tooltip>
      <button
        type="button"
        className="color-favorites__remove"
        onClick={(event) => {
          stopPropagation(event);
          onRemove?.();
        }}
        aria-label={t('colorFavorites.removeAria')}
        title={t('colorFavorites.removeAria')}>
        X
      </button>
    </div>
  );
}
