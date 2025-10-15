import { EditOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Descriptions, Divider, Drawer, Space, Tag, Typography } from 'antd';
import type { DecayServerView } from './decayTypes';
import { formatDecayDate, itemStatusToColor } from './decayUtils';

const { Text } = Typography;

interface DecayDetailDrawerProps {
  translate: (key: string, fallback: string, values?: Record<string, unknown>) => string;
  server: DecayServerView | null;
  open: boolean;
  onClose: () => void;
  onRefresh: (serverId: string) => void;
  onEdit: (serverId: string) => void;
}

export default function DecayDetailDrawer({ translate, server, open, onClose, onRefresh, onEdit }: DecayDetailDrawerProps) {
  return (
    <Drawer
      className="decay-tool__drawer"
      title={
        server
          ? translate('utilities.decay.drawer.title', 'Server #{{number}} details', {
              number: server.serverNumber,
            })
          : ''
      }
      open={open}
      onClose={onClose}
      width="100%"
      extra={
        server ? (
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => onRefresh(server.id)}>
              {translate('utilities.decay.actions.refresh', 'Refresh')}
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => onEdit(server.id)}>
              {translate('utilities.decay.actions.update', 'Update')}
            </Button>
          </Space>
        ) : null
      }>
      {server ? (
        <div className="decay-tool__drawer-content">
          <div className="decay-tool__drawer-map">
            <img
              src={server.map.image}
              alt={server.map.name}
            />
          </div>
          <Divider />
          <Descriptions
            column={1}
            size="small"
            colon>
            <Descriptions.Item label={translate('utilities.decay.labels.map', 'Map')}>{server.map.name}</Descriptions.Item>
            <Descriptions.Item label={translate('utilities.decay.labels.serverNumber', 'Server number')}>{server.serverNumber}</Descriptions.Item>
            <Descriptions.Item label={translate('utilities.decay.labels.structure', 'Structure')}>
              <Text>{server.structure.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={translate('utilities.decay.labels.structureDecay', 'Structure decay')}>
              <Space
                direction="vertical"
                size={4}>
                <Tag color={itemStatusToColor(server.timeInfo.status)}>{server.timeInfo.label}</Tag>
                <Text type="secondary">
                  {translate('utilities.decay.tooltip.decaysOn', 'Decays on {{date}}', {
                    date: formatDecayDate(server.decayAt),
                  })}
                </Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label={translate('utilities.decay.labels.lastRefreshed', 'Last refreshed')}>
              {formatDecayDate(server.updatedAt)}
            </Descriptions.Item>
            <Descriptions.Item label={translate('utilities.decay.labels.createdAt', 'Created')}>
              {formatDecayDate(server.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label={translate('utilities.decay.labels.note', 'Note')}>
              {server.note ? server.note : <Text type="secondary">—</Text>}
            </Descriptions.Item>
          </Descriptions>
        </div>
      ) : null}
    </Drawer>
  );
}
