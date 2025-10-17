import { EyeOutlined, ReloadOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { App as AntdApp, Button, Checkbox, Col, Row, Tooltip, Typography } from 'antd';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { DecayServerView } from './decayTypes';
import { DAY_SECONDS, formatDecayDate } from './decayUtils';

const { Text } = Typography;

interface DecayServerCardProps {
  translate: (key: string, fallback: string, values?: Record<string, unknown>) => string;
  server: DecayServerView;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onToggleFavorite: (favorite: boolean) => void;
  onOpenDetails: () => void;
  onRefresh: () => void;
}

export default function DecayServerCard({
  translate,
  server,
  selected,
  onToggleSelect,
  onToggleFavorite,
  onOpenDetails,
  onRefresh,
}: DecayServerCardProps) {
  const { message } = AntdApp.useApp();
  const showCreatureTimer = Boolean(server.nextDecayType === 'creature' && server.creatureEnabled && server.creatureTimeInfo);
  const timerInfo = showCreatureTimer && server.creatureTimeInfo ? server.creatureTimeInfo : server.structureTimeInfo;
  const timerTitleKey = showCreatureTimer ? 'utilities.decay.labels.creatures' : 'utilities.decay.labels.structure';
  const timerTooltipKey = showCreatureTimer ? 'utilities.decay.tooltip.creaturesDecayOn' : 'utilities.decay.tooltip.decaysOn';
  const timerDate = showCreatureTimer ? server.creatureDecayAt : server.structureDecayAt;
  const timerSecondsRemaining =
    showCreatureTimer && server.creatureSecondsRemaining != null ? server.creatureSecondsRemaining : server.structureSecondsRemaining;
  const isExpired = timerInfo.status === 'expired';
  const isWarning = !isExpired && timerSecondsRemaining != null && timerSecondsRemaining > 0 && timerSecondsRemaining <= 3 * DAY_SECONDS;
  const timerClassName = `decay-tool__timer-card${isExpired ? ' decay-tool__timer-card--expired' : ''}${isWarning ? ' decay-tool__timer-card--warning' : ''}`;

  const handleToggleFavorite = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggleFavorite(!server.isFavorite);
  };

  const copyServerNumber = async (value: string): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // no-op fallthrough
      }
    }

    if (typeof document === 'undefined') return false;
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'absolute';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, value.length);
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    } finally {
      document.body.removeChild(area);
    }
    return copied;
  };

  const triggerCopyNumber = async () => {
    const value = String(server.serverNumber ?? '');
    if (!value) return;
    const success = await copyServerNumber(value);
    if (success) {
      message.success(translate('utilities.decay.toast.copySuccess', 'Server number copied'));
    } else {
      message.error(translate('utilities.decay.toast.copyError', 'Unable to copy server number'));
    }
  };

  const handleCopyNumberClick = async (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    await triggerCopyNumber();
  };

  const handleCopyNumberKeyDown = async (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      await triggerCopyNumber();
    }
  };

  const favoriteTooltip = server.isFavorite
    ? translate('utilities.decay.actions.unfavorite', 'Unfavorite')
    : translate('utilities.decay.actions.favorite', 'Favorite');
  const copyTooltip = translate('utilities.decay.actions.copyNumber', 'Copy server number');

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
                  <Tooltip title={copyTooltip}>
                    <Text
                      className="decay-tool__map-name decay-tool__copyable"
                      role="button"
                      tabIndex={0}
                      onClick={handleCopyNumberClick}
                      onKeyDown={handleCopyNumberKeyDown}>
                      {translate('utilities.decay.info.serverNumber', 'Server #{{number}}', {
                        number: server.serverNumber,
                      })}
                    </Text>
                  </Tooltip>
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
                <div className="decay-tool__server-actions">
                  <Tooltip title={favoriteTooltip}>
                    <Button
                      type="text"
                      shape="circle"
                      size="small"
                      aria-label={favoriteTooltip}
                      className={`decay-tool__icon-btn decay-tool__favorite-btn${server.isFavorite ? ' decay-tool__favorite-btn--active' : ''}`}
                      icon={server.isFavorite ? <StarFilled /> : <StarOutlined />}
                      onClick={handleToggleFavorite}
                    />
                  </Tooltip>
                </div>
              </div>
            </Col>

            <Col
              xs={{ flex: '100%' }}
              lg={{ flex: 'none' }}>
              <div className="decay-tool__timers">
                <Tooltip
                  title={translate(timerTooltipKey, showCreatureTimer ? 'Creatures decay on {{date}}' : 'Decays on {{date}}', {
                    date: formatDecayDate(timerDate),
                  })}>
                  <div className={timerClassName}>
                    <span className="decay-tool__timer-title">{translate(timerTitleKey, showCreatureTimer ? 'Creatures' : 'Structure')}</span>
                    <span className="decay-tool__timer-value">{timerInfo.label}</span>
                  </div>
                </Tooltip>
              </div>
            </Col>
          </Row>

          <Row gutter={[8, 8]}>
            <Col>
              <Button
                icon={<EyeOutlined />}
                onClick={onOpenDetails}
                className="decay-tool__view-button">
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
