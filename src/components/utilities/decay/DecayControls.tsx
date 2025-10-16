import { ArrowDownOutlined, ArrowUpOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Checkbox, Col, Input, Popconfirm, Row, Select, Space, Tag } from 'antd';
import type { SortField } from './decayTypes';
import { SORT_FIELDS, type SortOrder } from './useDecayState';

interface DecayControlsProps {
  translate: (key: string, fallback: string, values?: Record<string, unknown>) => string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
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
  sortOrder,
  onSortChange,
  onRefreshAll,
  selectedCount,
  isAllSelected,
  isSomeSelected,
  onToggleSelectAll,
  onRefreshSelected,
  onDeleteSelected,
}: DecayControlsProps) {
  const sortBaseLabel = (field: SortField) =>
    field === 'server'
      ? translate('utilities.decay.sort.server', 'Server Number')
      : field === 'map'
        ? translate('utilities.decay.sort.map', 'Map')
        : translate('utilities.decay.sort.structure', 'Structure Type');

  const sortOptions = SORT_FIELDS.flatMap((field) => {
    const label = sortBaseLabel(field);
    return [
      {
        value: `${field}:asc`,
        label: (
          <Space size={4}>
            <span>{label}</span>
            <ArrowUpOutlined />
          </Space>
        ),
      },
      {
        value: `${field}:desc`,
        label: (
          <Space size={4}>
            <span>{label}</span>
            <ArrowDownOutlined />
          </Space>
        ),
      },
    ];
  });

  const handleSortSelect = (value: string) => {
    const [field, order] = value.split(':') as [SortField, SortOrder];
    onSortChange(field, order);
  };

  const hasSelection = selectedCount > 0;
  const sortValue = `${sortField}:${sortOrder}`;

  return (
    <div className="decay-tool__controls">
      <div className="decay-tool__control-row">
        {hasSelection ? (
          <>
            <Checkbox
              indeterminate={isSomeSelected}
              checked={isAllSelected}
              onChange={(event) => onToggleSelectAll(event.target.checked)}>
              {translate('utilities.decay.selection.selectAll', 'Select all')}
            </Checkbox>
            <Space
              size={12}
              align="center"
              className="decay-tool__control-right"
              wrap>
              <Tag color="blue">{translate('utilities.decay.info.selectedCount', '{{count}} selected', { count: selectedCount })}</Tag>
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
                <Button danger>{translate('utilities.decay.actions.deleteSelected', 'Delete selected')}</Button>
              </Popconfirm>
            </Space>
          </>
        ) : (
          <Row
            gutter={[12, 12]}
            style={{ flex: 1 }}>
            <Col
              xs={{ flex: '100%' }}
              md={{ flex: 1 }}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder={translate('utilities.decay.actions.search', 'Search servers')}
                className="decay-tool__search"
                value={searchTerm}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </Col>
            <Col>
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
                <Select
                  value={sortValue}
                  options={sortOptions}
                  onChange={handleSortSelect}
                  className="decay-tool__sort"
                  popupMatchSelectWidth={false}
                />
              </Space>
            </Col>
          </Row>
        )}
      </div>
    </div>
  );
}
