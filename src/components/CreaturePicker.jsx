import { useMemo } from 'react';
import { Select, Space, Typography } from 'antd';
import { useI18n } from '../i18n/index.js';

const { Text } = Typography;

export default function CreaturePicker({ list, currentName, onPick, customMode = false }) {
  const { t } = useI18n();

  const options = useMemo(() => {
    const base = Array.isArray(list) ? list.map((c) => ({ value: c.name, label: c.name })) : [];
    if (customMode) {
      return [{ value: '__custom__', label: t('creaturePicker.customOption') }, ...base];
    }
    return base;
  }, [list, customMode, t]);

  const value = customMode ? '__custom__' : currentName || undefined;

  return (
    <Space direction="vertical" size={4} style={{ width: '100%' }}>
      <Text type="secondary">{t('creaturePicker.label')}</Text>
      <Select
        showSearch
        size="large"
        value={value}
        placeholder={t('creaturePicker.pickPlaceholder', { defaultValue: 'Select creature' })}
        options={options}
        optionFilterProp="label"
        filterOption={(input, option) =>
          typeof option?.label === 'string' ? option.label.toLowerCase().includes(input.toLowerCase()) : false
        }
        style={{ width: '100%' }}
        onChange={(selected) => {
          if (!selected || selected === '__custom__') return;
          onPick(selected);
        }}
      />
    </Space>
  );
}
