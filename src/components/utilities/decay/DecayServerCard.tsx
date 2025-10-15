import { ReloadOutlined } from '@ant-design/icons';
import { Button, Checkbox, Flex, Tag, Tooltip, Typography } from 'antd';
import type { DecayServerView } from './decayTypes';
import { formatDecayDate } from './decayUtils';

const { Text, Paragraph } = Typography;

interface DecayServerCardProps {
  translate: (key: string, fallback: string, values?: Record<string, unknown>) => string;
  server: DecayServerView;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onOpenDetails: () => void;
  onRefresh: () => void;
}

export default function DecayServerCard({ translate, server, selected, onToggleSelect, onOpenDetails, onRefresh }: DecayServerCardProps) {
  return (
    <div
      className="decay-tool__server-content"
      onClick={onOpenDetails}>
      <div
        className="decay-tool__select-wrap"
        onClick={(event) => event.stopPropagation()}>
        <Checkbox
          className="decay-tool__select"
          checked={selected}
          onChange={(event) => onToggleSelect(event.target.checked)}
        />
      </div>
      <div className="decay-tool__server-shell">
        <div
          className="decay-tool__media"
          style={{ backgroundImage: `url(${server.map.image})` }}>
          <img
            src={server.map.image}
            alt={server.map.name}
          />
        </div>
        <div className="decay-tool__meta">
          <Flex
            align="start"
            justify="space-between">
            <div className="decay-tool__server-header">
              <div className="decay-tool__map-block">
                <span className="decay-tool__eyebrow">{translate('utilities.decay.labels.map', 'Map')}</span>
                <Text className="decay-tool__map-name">{server.map.name}</Text>
                <div className="decay-tool__server-subtitle">
                  <span className="decay-tool__server-number">
                    {translate('utilities.decay.info.serverNumber', 'Server #{{number}}', {
                      number: server.serverNumber,
                    })}
                  </span>
                  <Tag
                    className="decay-tool__structure-tag"
                    color="cyan">
                    {server.structure.name}
                  </Tag>
                </div>
              </div>
            </div>

            <div className="decay-tool__timers">
              <Tooltip
                title={translate('utilities.decay.tooltip.decaysOn', 'Decays on {{date}}', {
                  date: formatDecayDate(server.decayAt),
                })}>
                <div className={`decay-tool__timer-card ${server.timeInfo.status === 'expired' ? 'decay-tool__timer-card--expired' : ''}`}>
                  <span className="decay-tool__timer-title">{translate('utilities.decay.labels.structure', 'Structure')}</span>
                  <span className="decay-tool__timer-value">{server.timeInfo.label}</span>
                </div>
              </Tooltip>
            </div>
          </Flex>

          <Button
            type="primary"
            size="middle"
            icon={<ReloadOutlined />}
            className="decay-tool__refresh-button"
            onClick={(event) => {
              event.stopPropagation();
              onRefresh();
            }}>
            {translate('utilities.decay.actions.refresh', 'Refresh')}
          </Button>
        </div>
      </div>
    </div>
  );
}
