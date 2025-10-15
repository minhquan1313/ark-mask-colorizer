import { ReloadOutlined, SearchOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import { Button, Checkbox, Input, Popconfirm, Select, Space } from 'antd';
import type { SortField } from './decayTypes';
import { SORT_FIELDS } from './useDecayState';

interface DecayControlsProps {
  translate: (key: string, fallback: string, values?: Record<string, unknown>) => string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortField: SortField;
  onSortFieldChange: (value: SortField) => void;
  sortOrder: 'asc' | 'desc';
  onToggleSortOrder: () => void;
  onRefreshAll: () => void;
  selectedCount: number;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  onToggleSelectAll: (checked: boolean) => void;
  onRefreshSelected: () => void;
  onDeleteSelected: () => void;
}

export default function DecayControls({
  translate,
  searchTerm,
  onSearchChange,
  sortField,
  onSortFieldChange,
  sortOrder,
  onToggleSortOrder,
  onRefreshAll,
  selectedCount,
  isAllSelected,
  isSomeSelected,
  onToggleSelectAll,
  onRefreshSelected,
  onDeleteSelected,
}: DecayControlsProps) {
  const sortOptions = SORT_FIELDS.map((field) => ({
    value: field,
    label:
      field === 'server'
        ? translate('utilities.decay.sort.server', 'Server Number')
        : field === 'map'
          ? translate('utilities.decay.sort.map', 'Map')
          : translate('utilities.decay.sort.structure', 'Structure Type'),
  }));

  return (
    <div className="decay-tool__controls">
      <div className="decay-tool__control-row">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={translate('utilities.decay.actions.search', 'Search servers')}
          className="decay-tool__search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <Space
          size={12}
          align="center"
          className="decay-tool__control-right"
          wrap>
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefreshAll}
            className="decay-tool__refresh-all">
            {translate('utilities.decay.actions.refreshAll', 'Refresh all')}
          </Button>
          <div className="decay-tool__sort-group">
            <Button
              type="text"
              icon={sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
              onClick={onToggleSortOrder}
              aria-label={
                sortOrder === 'asc' ? translate('utilities.decay.sort.asc', 'Ascending') : translate('utilities.decay.sort.desc', 'Descending')
              }
            />
            <Select
              value={sortField}
              options={sortOptions}
              onChange={onSortFieldChange}
              className="decay-tool__sort"
              popupMatchSelectWidth={false}
            />
          </div>
        </Space>
      </div>

      {selectedCount > 0 ? (
        <div className="decay-tool__bulk">
          <Checkbox
            indeterminate={isSomeSelected}
            checked={isAllSelected}
            onChange={(event) => onToggleSelectAll(event.target.checked)}>
            {translate('utilities.decay.selection.selectAll', 'Select all')}
          </Checkbox>
          <Space
            size={12}
            wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={onRefreshSelected}>
              {translate('utilities.decay.actions.refreshSelected', 'Refresh selected')}
            </Button>
            <Popconfirm
              title={translate('utilities.decay.confirm.deleteSelectedTitle', 'Delete selected servers?')}
              description={translate('utilities.decay.confirm.deleteSelectedMessage', 'This cannot be undone.')}
              okText={translate('utilities.decay.confirm.ok', 'Delete')}
              cancelText={translate('utilities.decay.confirm.cancel', 'Cancel')}
              onConfirm={onDeleteSelected}>
              <Button
                danger
                className="decay-tool__danger">
                {translate('utilities.decay.actions.deleteSelected', 'Delete selected')}
              </Button>
            </Popconfirm>
          </Space>
        </div>
      ) : null}
    </div>
  );
}
