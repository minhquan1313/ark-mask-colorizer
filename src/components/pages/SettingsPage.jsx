import { useMemo } from 'react';
import { Button, Card, Empty, Space, Tabs, Timeline, Typography } from 'antd';
import updateNote from '../../data/updateNote.json';
import MaskExportSettings from '../MaskExportSettings.jsx';

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

const { Title, Text, Paragraph } = Typography;

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

  const languageTab = (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Paragraph>{t('language.selectorLabel')}</Paragraph>
      <Space size="small" wrap>
        {languageOptions.map((option) => (
          <Button
            key={option.code}
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
      </Space>
    </Space>
  );

  const updateTab = updateLogEntries.length ? (
    <Timeline
      mode="left"
      items={updateLogEntries.map((entry) => ({
        key: entry.dateKey,
        label: (
          <Text strong>{entry.displayDate}</Text>
        ),
        children: (
          <Space direction="vertical" size={4}>
            {entry.notes.map((note, noteIndex) => (
              <Text key={`${entry.dateKey}-${noteIndex}`}>- {note}</Text>
            ))}
          </Space>
        ),
      }))}
    />
  ) : (
    <Empty description={t('settings.updateLogEmpty', { defaultValue: 'No updates yet.' })} />
  );

  const maskTab = <MaskExportSettings t={t} />;

  const tabItems = [
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
    {
      key: 'mask',
      label: t('settings.tabs.mask', { defaultValue: 'Mask' }),
      children: maskTab,
    },
  ];

  return (
    <div className="container container--single">
      <Card bordered={false} style={{ background: 'transparent' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Title level={3} style={{ margin: 0 }}>
            {t('settings.title', { defaultValue: 'Settings' })}
          </Title>
          <Tabs tabPosition="left" items={tabItems} />
        </Space>
      </Card>
    </div>
  );
}
