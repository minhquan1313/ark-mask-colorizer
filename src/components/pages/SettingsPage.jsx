import { useMemo } from 'react';
import updateNote from '../../data/updateNote.json';

function parseUpdateDate(key) {
  if (!key) return null;
  const parts = String(key).split('/');
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map((value) => Number(value));
  if (![year, month, day].every(Number.isFinite)) {
    return null;
  }
  return new Date(year, month - 1, day);
}

export default function SettingsPage({ t, languageOptions, lang, onSelectLanguage }) {
  const updateLogEntries = useMemo(() => {
    if (!updateNote || typeof updateNote !== 'object') {
      return [];
    }
    return Object.entries(updateNote)
      .map(([dateKey, notes]) => {
        const parsed = parseUpdateDate(dateKey);
        return {
          dateKey,
          displayDate: dateKey,
          sortValue: parsed?.getTime?.() ?? Number.MIN_SAFE_INTEGER,
          notes: Array.isArray(notes) ? notes : [],
        };
      })
      .sort((a, b) => (b.sortValue ?? 0) - (a.sortValue ?? 0));
  }, []);

  return (
    <div className="container container--single">
      <section className="panel settings-panel">
        <div className="title">{t('settings.title', { defaultValue: 'Settings' })}</div>
        <div className="settings-section">
          <div className="settings-section__header">{t('language.selectorLabel')}</div>
          <div className="language-switch">
            <div className="language-switch__options">
              {languageOptions.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => onSelectLanguage(option.code)}
                  aria-pressed={lang === option.code}
                  className="btn language-switch__button">
                  {option.flag && (
                    <img
                      src={option.flag}
                      alt={`${option.label} flag`}
                      width={20}
                      height={14}
                      style={{ borderRadius: 4 }}
                    />
                  )}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="settings-section">
          <div className="settings-section__header">{t('settings.updateLogTitle', { defaultValue: 'Update log' })}</div>
          {updateLogEntries.length ? (
            <div className="update-log">
              {updateLogEntries.map((entry) => (
                <article className="update-card" key={entry.dateKey}>
                  <div className="update-card__date">{entry.displayDate}</div>
                  <ul>
                    {entry.notes.map((note, noteIndex) => (
                      <li key={`${entry.dateKey}-${noteIndex}`}>{note}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          ) : (
            <div className="subtle small">{t('settings.updateLogEmpty', { defaultValue: 'No updates yet.' })}</div>
          )}
        </div>
      </section>
    </div>
  );
}
