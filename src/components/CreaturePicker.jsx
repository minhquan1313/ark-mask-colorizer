import { useI18n } from '../i18n/index.js';

export default function CreaturePicker({ list, currentName, onPick, customMode = false }) {
  const { t } = useI18n();

  return (
    <div
      className="hstack"
      style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <label
        className="small subtle"
        style={{ opacity: 0.8 }}>
        {t('creaturePicker.label')}
      </label>
      <select
        value={customMode ? '__custom__' : currentName || ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__custom__') return;
          onPick(v);
        }}
        style={{
          minWidth: 180,
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text)',
        }}>
        {customMode && <option value="__custom__">{t('creaturePicker.customOption')}</option>}
        {list.map((c) => (
          <option
            key={c.name}
            value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
