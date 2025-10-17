import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Form, List, Typography } from 'antd';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_ARK_MAP } from '../../../data/arkMaps';
import { DEFAULT_STRUCTURE_TYPE, STRUCTURE_TYPES } from '../../../data/structureTypes';
import DecayControls from './DecayControls';
import DecayDetailDrawer from './DecayDetailDrawer';
import DecayModal from './DecayModal';
import DecayServerCard from './DecayServerCard';
import type { DecayFormValues, SortField } from './decayTypes';
import { useDecayState } from './useDecayState';

const { Title, Paragraph } = Typography;

interface DecayToolProps {
  t: (key: string, values?: Record<string, unknown>) => string;
}

export default function DecayTool({ t }: DecayToolProps) {
  const [form] = Form.useForm();
  const selectedMapId = Form.useWatch('mapId', form) ?? DEFAULT_ARK_MAP.id;

  const translate = useCallback(
    (key: string, fallback: string, values: Record<string, unknown> = {}) => {
      if (typeof t !== 'function') return fallback;
      return t(key, { defaultValue: fallback, ...values });
    },
    [t],
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const {
    searchTerm,
    setSearchTerm,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    selectedIds,
    isAllSelected,
    isSomeSelected,
    handleToggleSelectAll,
    toggleSelection,
    handleRefreshAll,
    handleRefresh,
    handleRefreshSelected,
    handleDelete,
    handleDeleteSelected,
    enrichedServers,
    activeServer,
    toggleFavorite,
    openDetails,
    closeDetails,
    isModalOpen,
    openAddModal,
    closeModal,
    addServer,
    updateServer,
  } = useDecayState({ translate, searchParams, setSearchParams });

  const handleOpenAdd = () => {
    const defaultStructure = STRUCTURE_TYPES[0]?.id ?? DEFAULT_STRUCTURE_TYPE.id;
    form.resetFields();
    form.setFieldsValue({
      mapId: DEFAULT_ARK_MAP.id,
      structureId: defaultStructure,
      serverNumber: undefined,
      note: '',
      creatureEnabled: false,
    });
    openAddModal();
  };

  const handleSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        const payload = {
          mapId: values.mapId,
          structureId: values.structureId,
          serverNumber: Number(values.serverNumber ?? 0),
          note: values.note ? String(values.note).trim() : '',
          creatureEnabled: Boolean(values.creatureEnabled),
        };
        addServer(payload);
        closeModal();
        form.resetFields();
      })
      .catch(() => {
        /* validation handled by antd */
      });
  };

  const handleModalCancel = () => {
    closeModal();
    form.resetFields();
  };

  const handleSaveDetails = (serverId: string, values: DecayFormValues & { lastRefreshed?: number }) => {
    updateServer(serverId, {
      mapId: values.mapId,
      structureId: values.structureId,
      serverNumber: Number(values.serverNumber ?? 0),
      note: values.note ? String(values.note).trim() : '',
      updatedAt: values.lastRefreshed,
      creatureEnabled: Boolean(values.creatureEnabled),
      creatureUpdatedAt: Boolean(values.creatureEnabled) ? (values.lastRefreshed ?? Date.now()) : null,
    });
  };

  const handleSortChange = (field: SortField, order: 'asc' | 'desc') => {
    setSortField(field);
    setSortOrder(order);
  };

  return (
    <div className="decay-tool">
      <header className="decay-tool__header">
        <div>
          <Title
            level={4}
            className="decay-tool__title">
            {translate('utilities.decay.title', 'Decay')}
          </Title>
          <Paragraph className="decay-tool__description">
            {translate('utilities.decay.description', 'This will be a clock to let you know when your base decay.')}
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenAdd}>
          {translate('utilities.decay.actions.add', 'Add server')}
        </Button>
      </header>

      <DecayControls
        translate={translate}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        onRefreshAll={handleRefreshAll}
        selectedCount={selectedIds.length}
        isAllSelected={isAllSelected}
        isSomeSelected={isSomeSelected}
        onToggleSelectAll={handleToggleSelectAll}
        onRefreshSelected={handleRefreshSelected}
        onDeleteSelected={handleDeleteSelected}
      />

      {enrichedServers.length === 0 ? (
        <Empty
          className="decay-tool__empty"
          description={translate('utilities.decay.empty', 'No servers yet. Add your first one to start tracking decay timers.')}
        />
      ) : (
        <List
          itemLayout="vertical"
          dataSource={enrichedServers}
          split={false}
          renderItem={(item) => (
            <List.Item key={item.id}>
              <Card
                className={`decay-tool__server${selectedIds.includes(item.id) ? ' decay-tool__server--selected' : ''}`}
                styles={{ body: { padding: 0 } }}>
                <DecayServerCard
                  translate={translate}
                  server={item}
                  selected={selectedIds.includes(item.id)}
                  onToggleSelect={(checked) => toggleSelection(item.id, checked)}
                  onToggleFavorite={(favorite) => toggleFavorite(item.id, favorite)}
                  onOpenDetails={() => openDetails(item.id)}
                  onRefresh={() => handleRefresh(item.id)}
                />
              </Card>
            </List.Item>
          )}
        />
      )}

      <DecayDetailDrawer
        translate={translate}
        server={activeServer}
        open={Boolean(activeServer)}
        onClose={closeDetails}
        onRefresh={handleRefresh}
        onSave={handleSaveDetails}
        onDelete={handleDelete}
      />

      <DecayModal
        translate={translate}
        form={form}
        open={isModalOpen}
        selectedMapId={selectedMapId}
        onCancel={handleModalCancel}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
