import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Checkbox, Col, Row, Tooltip, Typography } from 'antd';
import type { DecayServerView } from './decayTypes';
import { formatDecayDate } from './decayUtils';

const { Text } = Typography;

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
    <div className="decay-tool__server-content">
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
        <div className="decay-tool__media">
          <img
            src={server.map.image}
            alt={server.map.name}
          />
        </div>
        <div className="decay-tool__meta">
          <Row
            justify="space-between"
            gutter={[12, 12]}>
            <Col
              xs={{ flex: '100%' }}
              lg={{ flex: '1' }}>
              <div className="decay-tool__server-header">
                <div className="decay-tool__map-block">
                  <span className="decay-tool__eyebrow">{translate('utilities.decay.labels.serverNumber', 'Server number')}</span>
                  <Text className="decay-tool__map-name">
                    {translate('utilities.decay.info.serverNumber', 'Server #{{number}}', {
                      number: server.serverNumber,
                    })}
                  </Text>
                  <div className="decay-tool__server-subtitle">
                    <Text className="decay-tool__server-number">{server.map.name}</Text>
                    <div className="decay-tool__structure-chip">
                      <span className="decay-tool__structure-chip-thumb">
                        <img
                          src={server.structure.image}
                          alt={translate('utilities.decay.labels.structureIconAlt', '{{structure}} icon', {
                            structure: server.structure.name,
                          })}
                        />
                      </span>
                      <span className="decay-tool__structure-chip-label">{server.structure.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Col>

            <Col
              xs={{ flex: '100%' }}
              lg={{ flex: 'none' }}>
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
            </Col>
          </Row>

          <Row gutter={[8, 8]}>
            <Col>
              <Button
                icon={<EyeOutlined />}
                onClick={onOpenDetails}>
                {translate('utilities.decay.actions.view', 'View')}
              </Button>
            </Col>

            <Col xs={{ flex: 1 }}>
              <Button
                block
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
            </Col>
          </Row>
        </div>
      </div>
    </div>
  );
}
