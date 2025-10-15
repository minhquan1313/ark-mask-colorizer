import { Card, Grid, Tabs, Typography } from 'antd';
import { useCallback, useMemo } from 'react';
import DecayTool from '../utilities/decay/DecayTool';

const { Title, Text, Paragraph } = Typography;

interface UtilitiesPageProps {
  t: (key: string, values?: Record<string, unknown>) => string;
}

export default function UtilitiesPage({ t }: UtilitiesPageProps) {
  const translate = useCallback(
    (key: string, fallback: string, values: Record<string, unknown> = {}) => {
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
    [t, translate],
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
