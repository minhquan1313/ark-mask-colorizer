import { useI18n } from '../i18n/index.js';

export default function CreaturePicker({ list, currentName, onPick, customMode = false }) {
  const { t } = useI18n();

  return (
    <div className="creature-picker">
      <label className="small subtle creature-picker__label">{t('creaturePicker.label')}</label>
      <select
        className="creature-picker__select"
        value={customMode ? '__custom__' : currentName || ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__custom__') return;
          onPick(v);
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
