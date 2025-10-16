import {
  BuildOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FieldNumberOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App as AntdApp,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Flex,
  Form,
  Grid,
  Image,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { ARK_MAPS } from '../../../data/arkMaps';
import { STRUCTURE_TYPES } from '../../../data/structureTypes';
import type { DecayFormValues, DecayServerView } from './decayTypes';
import { DAY_SECONDS, formatDecayDate } from './decayUtils';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface DecayDetailDrawerProps {
  translate: (key: string, fallback: string, values?: Record<string, unknown>) => string;
  server: DecayServerView | null;
  open: boolean;
  onClose: () => void;
  onRefresh: (serverId: string) => void;
  onSave: (serverId: string, values: DecayFormValues & { lastRefreshed?: number }) => void;
  onDelete: (serverId: string) => void;
}

type DrawerFormValues = DecayFormValues & { lastRefreshed?: Dayjs | null };

export default function DecayDetailDrawer({ translate, server, open, onClose, onRefresh, onSave, onDelete }: DecayDetailDrawerProps) {
  const [form] = Form.useForm<DrawerFormValues>();
  const { message } = AntdApp.useApp();
  const { token } = theme.useToken();
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const screens = Grid.useBreakpoint();
  const structureAvatarSize = screens?.md ? 80 : 64;
  const coverHeight = screens?.md ? 220 : 180;

  const mapOptions = useMemo(() => ARK_MAPS.map((map) => ({ value: map.id, label: map.name })), []);
  const structureOptions = useMemo(
    () =>
      STRUCTURE_TYPES.map((structure) => ({
        value: structure.id,
        label: `${structure.name} (${Math.round(structure.decaySeconds / DAY_SECONDS)} ${translate('utilities.decay.labels.days', 'days')})`,
      })),
    [translate],
  );

  useEffect(() => {
    if (server) {
      form.setFieldsValue({
        mapId: server.mapId,
        structureId: server.structureId,
        serverNumber: server.serverNumber,
        note: server.note ?? '',
        lastRefreshed: dayjs(server.updatedAt),
      });
      setIsDirty(false);
    } else {
      form.resetFields();
      setIsDirty(false);
    }
  }, [form, server]);

  const computeDirty = (values: DrawerFormValues): boolean => {
    if (!server) return false;
    const normalizedNote = values.note ? values.note.trim() : '';
    const refreshedAt = values.lastRefreshed ? values.lastRefreshed.valueOf() : server.updatedAt;
    return (
      values.mapId !== server.mapId ||
      values.structureId !== server.structureId ||
      Number(values.serverNumber ?? 0) !== server.serverNumber ||
      normalizedNote !== (server.note ?? '') ||
      refreshedAt !== server.updatedAt
    );
  };

  const handleValuesChange = (_: unknown, allValues: DrawerFormValues) => {
    setIsDirty(computeDirty(allValues));
  };

  const handleSave = async () => {
    if (!server) return;
    try {
      const values = (await form.validateFields()) as DrawerFormValues;
      const refreshedAt = values.lastRefreshed ? values.lastRefreshed.valueOf() : server.updatedAt;
      const normalized: DecayFormValues & { lastRefreshed?: number } = {
        mapId: values.mapId,
        structureId: values.structureId,
        serverNumber: Number(values.serverNumber ?? 0),
        note: values.note ? values.note.trim() : '',
        lastRefreshed: refreshedAt,
      };
      setIsSaving(true);
      await Promise.resolve(onSave(server.id, normalized));
      form.setFieldsValue({
        ...values,
        lastRefreshed: dayjs(refreshedAt),
      });
      setIsDirty(false);
      message.success(translate('utilities.decay.toast.saved', 'Server updated'));
    } catch {
      // form validation feedback handled by antd
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!server) return;
    onDelete(server.id);
  };

  const renderEditableLabel = (label: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span>{label}</span>
      <EditOutlined style={{ color: token.colorTextTertiary }} />
    </span>
  );

  const statusColor = server?.timeInfo.status === 'expired' ? 'volcano' : 'geekblue';
  const drawerWidth = screens?.lg ? 640 : screens?.md ? 520 : '100%';

  return (
    <Drawer
      title={
        server
          ? translate('utilities.decay.drawer.title', 'Server #{{number}} details', {
              number: server.serverNumber,
            })
          : ''
      }
      open={open}
      onClose={onClose}
      width={drawerWidth}
      destroyOnHidden
      closeIcon={null}
      extra={
        server ? (
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => onRefresh(server.id)}>
            {translate('utilities.decay.actions.refresh', 'Refresh')}
          </Button>
        ) : null
      }
      footer={
        server ? (
          <Space
            style={{
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}>
            <Popconfirm
              title={translate('utilities.decay.confirm.deleteTitle', 'Delete this server?')}
              description={translate('utilities.decay.confirm.deleteMessage', 'This action cannot be undone.')}
              okText={translate('utilities.decay.confirm.ok', 'Delete')}
              cancelText={translate('utilities.decay.confirm.cancel', 'Cancel')}
              onConfirm={handleDelete}>
              <Button
                danger
                icon={<DeleteOutlined />}
                type="text">
                {translate('utilities.decay.actions.delete', 'Delete')}
              </Button>
            </Popconfirm>
            <Space size="middle">
              <Button onClick={onClose}>{translate('utilities.decay.actions.close', 'Close')}</Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                loading={isSaving}>
                {translate('utilities.decay.actions.save', 'Save changes')}
              </Button>
            </Space>
          </Space>
        ) : undefined
      }>
      {server ? (
        <Space
          direction="vertical"
          size={16}
          style={{ width: '100%' }}>
          <Badge.Ribbon
            color={statusColor}
            text={server.timeInfo.label}>
            <Card
              variant="borderless"
              styles={{
                body: {
                  padding: 24,
                  paddingTop: 16,
                },
              }}
              cover={
                <Image
                  src={server.map.image}
                  alt={server.map.name}
                  height={coverHeight}
                  preview={false}
                  style={{ objectFit: 'cover', width: '100%' }}
                />
              }>
              <Space
                direction="vertical"
                size={16}
                style={{ width: '100%' }}>
                <Flex
                  gap="small"
                  wrap>
                  <Tag
                    icon={<EnvironmentOutlined />}
                    color="blue">
                    {server.map.name}
                  </Tag>
                  <Tag
                    icon={<FieldNumberOutlined />}
                    color="purple">
                    {translate('utilities.decay.info.serverNumber', 'Server #{{number}}', {
                      number: server.serverNumber,
                    })}
                  </Tag>
                </Flex>

                <Flex
                  align="center"
                  gap="middle"
                  wrap>
                  <Avatar
                    shape="square"
                    size={structureAvatarSize}
                    src={server.structure.image}
                    alt={translate('utilities.decay.labels.structureIconAlt', '{{structure}} icon', {
                      structure: server.structure.name,
                    })}
                  />
                  <Space
                    direction="vertical"
                    size={4}>
                    <Text type="secondary">{translate('utilities.decay.labels.structure', 'Structure')}</Text>
                    <Title
                      level={4}
                      style={{ margin: 0 }}>
                      {server.structure.name}
                    </Title>
                    <Tag
                      icon={<BuildOutlined />}
                      color="geekblue">
                      {translate('utilities.decay.labels.decayWindow', '{{days}} days decay', {
                        days: Math.round(server.structure.decaySeconds / DAY_SECONDS),
                      })}
                    </Tag>
                  </Space>
                </Flex>

                <Alert
                  type={server.note ? 'info' : 'warning'}
                  showIcon
                  message={translate('utilities.decay.labels.note', 'Note')}
                  description={server.note ? server.note : translate('utilities.decay.messages.noteEmpty', 'No note yet. Add one below!')}
                />
              </Space>
            </Card>
          </Badge.Ribbon>

          <Row gutter={[16, 16]}>
            <Col
              xs={24}
              md={12}>
              <Card size="small">
                <Space
                  direction="vertical"
                  size={8}>
                  <Statistic
                    title={translate('utilities.decay.labels.structureDecay', 'Structure decay')}
                    value={server.timeInfo.label}
                    prefix={<ClockCircleOutlined style={{ color: statusColor === 'volcano' ? token.colorError : token.colorPrimary }} />}
                    valueStyle={{ color: statusColor === 'volcano' ? token.colorError : token.colorPrimary }}
                  />
                  <Tag
                    icon={<CalendarOutlined />}
                    color="blue">
                    {translate('utilities.decay.tooltip.decaysOn', 'Decays on {{date}}', {
                      date: formatDecayDate(server.decayAt),
                    })}
                  </Tag>
                </Space>
              </Card>
            </Col>
            <Col
              xs={24}
              md={12}>
              <Card size="small">
                <Statistic
                  title={translate('utilities.decay.labels.lastRefreshed', 'Last refreshed')}
                  value={formatDecayDate(server.updatedAt)}
                  prefix={<ReloadOutlined style={{ color: token.colorInfo, marginRight: 4 }} />}
                  valueStyle={{ fontSize: 16 }}
                />
              </Card>
            </Col>
            <Col
              xs={24}
              md={12}>
              <Card size="small">
                <Statistic
                  title={translate('utilities.decay.labels.createdAt', 'Created')}
                  value={formatDecayDate(server.createdAt)}
                  prefix={<CalendarOutlined style={{ color: token.colorSuccess, marginRight: 4 }} />}
                  valueStyle={{ fontSize: 16 }}
                />
              </Card>
            </Col>
          </Row>

          <Divider plain>{translate('utilities.decay.actions.update', 'Update')}</Divider>

          <Card
            size="small"
            variant="borderless"
            style={{
              background: 'transparent',
            }}
            styles={{
              body: {
                padding: 0,
              },
            }}>
            <Form
              layout="vertical"
              form={form}
              onValuesChange={handleValuesChange}>
              <Row gutter={[16, 0]}>
                <Col
                  xs={24}
                  md={12}>
                  <Form.Item
                    label={renderEditableLabel(translate('utilities.decay.fields.map', 'Map'))}
                    name="mapId"
                    rules={[{ required: true, message: translate('utilities.decay.validation.map', 'Select a map') }]}>
                    <Select options={mapOptions} />
                  </Form.Item>
                </Col>
                <Col
                  xs={24}
                  md={12}>
                  <Form.Item
                    label={renderEditableLabel(translate('utilities.decay.fields.serverNumber', 'Server number'))}
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
                      placeholder={translate('utilities.decay.placeholders.serverNumber', 'Example: 1234')}
                      controls={false}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label={renderEditableLabel(translate('utilities.decay.fields.lastRefreshed', 'Last refreshed'))}
                name="lastRefreshed"
                rules={[{ required: true, message: translate('utilities.decay.validation.lastRefreshed', 'Select the last refresh time') }]}>
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  allowClear={false}
                  inputReadOnly
                />
              </Form.Item>

              <Form.Item
                label={renderEditableLabel(translate('utilities.decay.fields.structureType', 'Structure type'))}
                name="structureId"
                rules={[{ required: true, message: translate('utilities.decay.validation.structure', 'Select structure type') }]}>
                <Select options={structureOptions} />
              </Form.Item>

              <Form.Item
                label={renderEditableLabel(translate('utilities.decay.fields.note', 'Note'))}
                name="note">
                <TextArea
                  rows={4}
                  placeholder={translate(
                    'utilities.decay.placeholders.note',
                    'Note what you have to render in this server, ex: Main base, water pen, etc',
                  )}
                />
              </Form.Item>
            </Form>
          </Card>
        </Space>
      ) : null}
    </Drawer>
  );
}
