import { Select, Space, Typography, type SelectProps } from 'antd';
import { useMemo } from 'react';
import type { CreatureEntry } from '../types/creatures';
import { useI18n } from '../i18n';

const { Text } = Typography;

interface CreaturePickerProps {
  list: CreatureEntry[];
  currentName?: string | null;
  onPick: (name: string) => void;
  customMode?: boolean;
}

type CreatureOption = NonNullable<SelectProps['options']>[number] & { value: string; label: string };

export default function CreaturePicker({ list, currentName, onPick, customMode = false }: CreaturePickerProps) {
  const { t } = useI18n();

  const options = useMemo<CreatureOption[]>(() => {
    const base = (list ?? []).map((c) => ({ value: c.name, label: c.name }));
    if (customMode) {
      return [{ value: '__custom__', label: t('creaturePicker.customOption') as string }, ...base];
    }
    return base;
  }, [list, customMode, t]);

  const value = customMode ? '__custom__' : (currentName ?? undefined);

  return (
    <Space
      direction="vertical"
      size={4}
      style={{ width: '100%' }}>
      <Text type="secondary">{t('creaturePicker.label')}</Text>
      <Select
        showSearch
        size="large"
        value={value}
        placeholder={t('creaturePicker.pickPlaceholder', { defaultValue: 'Select creature' })}
        options={options}
        optionFilterProp="label"
        filterOption={(input: string, option?: CreatureOption) => option?.label?.toLowerCase().includes(input.toLowerCase()) ?? false}
        style={{ width: '100%' }}
        onChange={(selected: string | undefined) => {
          if (!selected || selected === '__custom__') return;
          onPick(selected);
        }}
      />
    </Space>
  );
}
