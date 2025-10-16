import { Button, Card, Empty, Grid, Tabs, Timeline, Typography, type TabsProps, type TimelineProps } from 'antd';
import { useMemo } from 'react';
import updateNoteRaw from '../../data/updateNote.json';
import { useLanguageOptions } from '../../i18n';
import type { TranslateFn } from '../../types/mask';
import MaskExportSettings from '../MaskExportSettings';

type LanguageOption = ReturnType<typeof useLanguageOptions>[number];

interface SettingsPageProps {
  t: TranslateFn;
  languageOptions: LanguageOption[];
  lang: string;
  onSelectLanguage: (code: LanguageOption['code']) => void;
}

interface UpdateLogEntry {
  dateKey: string;
  displayDate: string;
  sortValue: number;
  notes: string[];
}

const { Title, Text, Paragraph } = Typography;

const parseUpdateDate = (key: string | null | undefined): Date | null => {
  if (!key) return null;
  const parts = String(key).split('/');
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map((value) => Number(value));
  if (![year, month, day].every(Number.isFinite)) {
    return null;
  }
  return new Date(year, month - 1, day);
};

const updateNote = updateNoteRaw as Record<string, string[]>;

export default function SettingsPage({ t, languageOptions, lang, onSelectLanguage }: SettingsPageProps) {
  const screens = Grid.useBreakpoint();
  const isMediumUp = Boolean(screens.md);
  const isLargeUp = Boolean(screens.lg);
  const tabPosition: TabsProps['tabPosition'] = isLargeUp ? 'left' : 'top';

  const updateLogEntries = useMemo<UpdateLogEntry[]>(() => {
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

  const languageTab = (
    <div className="settings-language">
      <Paragraph className="settings-language__intro">{t('language.selectorLabel')}</Paragraph>
      <div className="settings-language__options">
        {languageOptions.map((option) => (
          <Button
            key={option.code}
            size={isMediumUp ? 'middle' : 'large'}
            block={!isMediumUp}
            className="settings-language__button"
            type={lang === option.code ? 'primary' : 'default'}
            onClick={() => onSelectLanguage(option.code)}
            icon={
              option.flag ? (
                <img
                  src={option.flag}
                  alt=""
                  width={20}
                  height={14}
                  style={{ borderRadius: 4 }}
                />
              ) : null
            }>
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );

  const timelineItems: TimelineProps['items'] =
    updateLogEntries.length === 0
      ? []
      : updateLogEntries.map((entry) => ({
          key: entry.dateKey,
          label: <Text strong>{entry.displayDate}</Text>,
          children: (
            <div className="settings-update__notes">
              {entry.notes.map((note, noteIndex) => (
                <Text key={`${entry.dateKey}-${noteIndex}`}>- {note}</Text>
              ))}
            </div>
          ),
        }));

  const updateTab =
    timelineItems.length > 0 ? (
      <div className="settings-update">
        <Timeline
          mode={isMediumUp ? 'left' : 'alternate'}
          className="settings-update__timeline"
          items={timelineItems}
        />
      </div>
    ) : (
      <Empty
        className="settings-update__empty"
        description={t('settings.updateLogEmpty', { defaultValue: 'No updates yet.' })}
      />
    );

  const maskTab = (
    <div className="settings-mask">
      <MaskExportSettings t={t} />
    </div>
  );

  const tabItems: TabsProps['items'] = [
    {
      key: 'mask',
      label: t('settings.tabs.mask', { defaultValue: 'Mask' }),
      children: maskTab,
    },
    {
      key: 'language',
      label: t('settings.tabs.language', { defaultValue: 'Language' }),
      children: languageTab,
    },
    {
      key: 'update',
      label: t('settings.tabs.update', { defaultValue: 'Updates' }),
      children: updateTab,
    },
  ];

  return (
    <div className="container container--single">
      <section className="settings-page">
        <header className="settings-page__header">
          <Title
            level={3}
            className="settings-page__title">
            {t('settings.title', { defaultValue: 'Settings' })}
          </Title>
          <Text
            type="secondary"
            className="settings-page__subtitle">
            {t('settings.subtitle', { defaultValue: 'Adjust the experience and review recent changes.' })}
          </Text>
        </header>

        <Card
          variant="borderless"
          className="settings-page__card">
          <Tabs
            className="settings-page__tabs"
            tabPosition={tabPosition}
            tabBarGutter={isLargeUp ? 20 : 12}
            items={tabItems}
          />
        </Card>
      </section>
    </div>
  );
}
