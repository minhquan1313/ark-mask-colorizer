// @ts-nocheck
import { Button, Card, Empty, Form, Grid, Input, InputNumber, List, Modal, Select, Space, Tabs, Tooltip, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ARK_MAPS, DEFAULT_ARK_MAP, getArkMap } from '../../data/arkMaps';
import { DEFAULT_STRUCTURE_TYPE, STRUCTURE_TYPES, getStructureType } from '../../data/structureTypes';
import { STORAGE_KEYS, loadJSON, saveJSON } from '../../utils/storage';

const { Title, Text, Paragraph } = Typography;

function generateServerId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `decay-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function formatTimeRemaining(secondsRemaining, translate) {
  const suffix = translate ? translate('utilities.decay.time.leftSuffix', 'left') : 'left';
  const expiredLabel = translate ? translate('utilities.decay.time.expired', 'Expired') : 'Expired';
  if (secondsRemaining <= 0) {
    return { label: expiredLabel, status: 'expired' };
  }
  const days = Math.floor(secondsRemaining / (24 * 3600));
  const hours = Math.floor((secondsRemaining % (24 * 3600)) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = Math.floor(secondsRemaining % 60);

  if (days >= 1) {
    return {
      label: `${days}d ${hours}h ${suffix}`,
      status: 'active',
    };
  }

  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (hours === 0 && minutes === 0) {
    parts.push(`${seconds}s`);
  }
  return {
    label: `${parts.join(' ')} ${suffix}`,
    status: 'active',
  };
}

function formatDecayDate(decayTimestamp) {
  if (!decayTimestamp) return 'Unknown';
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(decayTimestamp));
  } catch {
    return new Date(decayTimestamp).toLocaleString();
  }
}

export default function UtilitiesPage({ t }) {
  const translate = useCallback(
    (key, fallback, values = {}) => {
      if (typeof t !== 'function') return fallback;
      return t(key, { defaultValue: fallback, ...values });
    },
    [t],
  );

  const screens = Grid.useBreakpoint();
  const isLargeUp = Boolean(screens.lg);
  const tabPosition = isLargeUp ? 'left' : 'top';

  const tabItems = useMemo(
    () => [
      {
        key: 'decay',
        label: translate('utilities.decay.tab', 'Decay'),
        children: <DecayTool t={t} />,
      },
    ],
    [translate],
  );

  return (
    <div className="container container--single">
      <section className="utilities-page">
        <header className="utilities-page__header">
          <Title
            level={3}
            className="utilities-page__title">
            {translate('utilities.title', 'Utilities')}
          </Title>
          <Text
            type="secondary"
            className="utilities-page__subtitle">
            {translate('utilities.subtitle', 'Handy helpers and quality-of-life tools for your ARK adventures.')}
          </Text>
        </header>

        <Card
          className="utilities-page__tabs-card"
          variant="borderless">
          <Tabs
            tabPosition={tabPosition}
            tabBarGutter={isLargeUp ? 24 : 16}
            className="utilities-page__tabs"
            items={tabItems}
          />
        </Card>
      </section>
    </div>
  );
}

function DecayTool({ t }) {
  const translate = useCallback(
    (key, fallback, values = {}) => {
      if (typeof t !== 'function') return fallback;
      return t(key, { defaultValue: fallback, ...values });
    },
    [t],
  );

  const sortOptions = useMemo(
    () => [
      { value: 'server', label: translate('utilities.decay.sort.server', 'Server Number') },
      { value: 'map', label: translate('utilities.decay.sort.map', 'Map') },
      { value: 'structure', label: translate('utilities.decay.sort.structure', 'Structure Type') },
    ],
    [translate],
  );

  const [form] = Form.useForm();
  const selectedMapId = Form.useWatch('mapId', form) ?? DEFAULT_ARK_MAP.id;
  const selectedMap = getArkMap(selectedMapId);
  const [servers, setServers] = useState(() => loadJSON(STORAGE_KEYS.decayServers, []));
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('server');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServerId, setEditingServerId] = useState(null);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.decayServers, servers);
  }, [servers]);

  const now = Date.now();

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const enrichedServers = useMemo(() => {
    return servers
      .map((server) => {
        const map = getArkMap(server?.mapId);
        const structure = getStructureType(server?.structureId);
        const updatedAt = server?.updatedAt ?? server?.createdAt ?? now;
        const decayAt = updatedAt + structure.decaySeconds * 1000;
        const secondsRemaining = Math.max(0, Math.round((decayAt - now) / 1000));
        const timeInfo = formatTimeRemaining(secondsRemaining, translate);
        return {
          ...server,
          map,
          structure,
          updatedAt,
          decayAt,
          secondsRemaining,
          timeInfo,
        };
      })
      .filter((server) => {
        if (!normalizedSearch) return true;
        const haystack = [server.map.name, server.structure.name, server.serverNumber != null ? String(server.serverNumber) : '']
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => {
        switch (sortKey) {
          case 'map':
            return a.map.name.localeCompare(b.map.name);
          case 'structure':
            return a.structure.name.localeCompare(b.structure.name);
          case 'server':
          default:
            return (a.serverNumber ?? 0) - (b.serverNumber ?? 0);
        }
      });
  }, [servers, normalizedSearch, sortKey, now, translate]);

  const modalTitle = editingServerId
    ? translate('utilities.decay.modal.editTitle', 'Update Server')
    : translate('utilities.decay.modal.addTitle', 'Add Server');

  function openAddModal() {
    setEditingServerId(null);
    form.setFieldsValue({
      mapId: DEFAULT_ARK_MAP.id,
      serverNumber: undefined,
      structureId: DEFAULT_STRUCTURE_TYPE.id,
    });
    setIsModalOpen(true);
  }

  function openEditModal(entry) {
    setEditingServerId(entry.id);
    form.setFieldsValue({
      mapId: entry.mapId,
      serverNumber: entry.serverNumber,
      structureId: entry.structureId,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingServerId(null);
    form.resetFields();
  }

  function handleSubmit() {
    form
      .validateFields()
      .then((values) => {
        const payload = {
          mapId: values.mapId,
          serverNumber: Number(values.serverNumber),
          structureId: values.structureId,
        };
        if (editingServerId) {
          setServers((prev) =>
            prev.map((entry) => {
              if (entry.id !== editingServerId) return entry;
              const updatedAt = Date.now();
              return {
                ...entry,
                ...payload,
                updatedAt,
              };
            }),
          );
        } else {
          const timestamp = Date.now();
          setServers((prev) => [
            ...prev,
            {
              id: generateServerId(),
              ...payload,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ]);
        }
        closeModal();
      })
      .catch(() => {
        /* validation handled by antd */
      });
  }

  function handleDelete(serverId) {
    setServers((prev) => prev.filter((entry) => entry.id !== serverId));
  }

  function handleRefresh(serverId) {
    setServers((prev) =>
      prev.map((entry) => {
        if (entry.id !== serverId) return entry;
        return {
          ...entry,
          updatedAt: Date.now(),
        };
      }),
    );
  }

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
          onClick={openAddModal}>
          {translate('utilities.decay.actions.add', 'Add server')}
        </Button>
      </header>

      <Card className="decay-tool__card">
        <Space
          className="decay-tool__controls"
          size={[16, 16]}
          align="center"
          wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={translate('utilities.decay.actions.search', 'Search servers')}
            className="decay-tool__search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Select
            className="decay-tool__sort"
            value={sortKey}
            options={sortOptions}
            onChange={setSortKey}
          />
        </Space>

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
                  className="decay-tool__server"
                  hoverable
                  onClick={() => openEditModal(item)}>
                  <div className="decay-tool__server-content">
                    <div className="decay-tool__thumb">
                      <img
                        src={item.map.image}
                        alt={item.map.name}
                        className="decay-tool__thumb-image"
                      />
                    </div>
                    <div className="decay-tool__meta">
                      <div className="decay-tool__row">
                        <Text className="decay-tool__map-name">{item.map.name}</Text>
                        <Space size={8}>
                          <Button
                            type="default"
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(item.id);
                            }}>
                            {translate('utilities.decay.actions.delete', 'Delete')}
                          </Button>
                          <Button
                            type="primary"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditModal(item);
                            }}>
                            {translate('utilities.decay.actions.update', 'Update')}
                          </Button>
                        </Space>
                      </div>
                      <div className="decay-tool__row">
                        <Text type="secondary">
                          {translate('utilities.decay.info.serverNumber', 'Server #{{number}}', {
                            number: item.serverNumber,
                          })}
                        </Text>
                        <Text>{item.structure.name}</Text>
                      </div>
                      <div className="decay-tool__row">
                        <Tooltip
                          title={translate('utilities.decay.tooltip.decaysOn', 'Decays on {{date}}', {
                            date: formatDecayDate(item.decayAt),
                          })}>
                          <Text className={`decay-tool__time decay-tool__time--${item.timeInfo.status}`}>{item.timeInfo.label}</Text>
                        </Tooltip>
                        <Button
                          size="small"
                          icon={<ReloadOutlined />}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRefresh(item.id);
                          }}>
                          {translate('utilities.decay.actions.refresh', 'Refresh')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title={modalTitle}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        okText={
          editingServerId ? translate('utilities.decay.modal.saveButton', 'Save changes') : translate('utilities.decay.modal.addButton', 'Add server')
        }
        destroyOnClose
        maskClosable>
        <Form
          layout="vertical"
          form={form}
          initialValues={{
            mapId: DEFAULT_ARK_MAP.id,
            structureId: DEFAULT_STRUCTURE_TYPE.id,
          }}>
          <Form.Item
            label={translate('utilities.decay.fields.map', 'Map')}
            name="mapId"
            rules={[
              {
                required: true,
                message: translate('utilities.decay.validation.map', 'Select a map'),
              },
            ]}>
            <Select
              options={ARK_MAPS.map((map) => ({
                value: map.id,
                label: map.name,
              }))}
            />
          </Form.Item>

          <div className="decay-tool__map-preview">
            <img
              src={selectedMap.image}
              alt={selectedMap.name}
            />
          </div>

          <Form.Item
            label={translate('utilities.decay.fields.serverNumber', 'Server number')}
            name="serverNumber"
            rules={[
              { required: true, message: translate('utilities.decay.validation.server', 'Enter a server number') },
              {
                type: 'number',
                transform: (value) => (value == null ? value : Number(value)),
                min: 0,
                message: translate('utilities.decay.validation.serverPositive', 'Server number must be positive'),
              },
            ]}>
            <InputNumber
              className="decay-tool__input-number"
              placeholder={translate('utilities.decay.placeholders.serverNumber', 'Example: 1234')}
              controls={false}
            />
          </Form.Item>

          <Form.Item
            label={translate('utilities.decay.fields.structureType', 'Structure type')}
            name="structureId"
            rules={[
              {
                required: true,
                message: translate('utilities.decay.validation.structure', 'Select structure type'),
              },
            ]}>
            <Select
              options={STRUCTURE_TYPES.map((structure) => ({
                value: structure.id,
                label: `${structure.name} (${Math.round(structure.decaySeconds / 86400)}d)`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
