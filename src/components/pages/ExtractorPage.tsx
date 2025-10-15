export default function ExtractorPage({ t }) {
  return (
    <div className="container container--single">
      <section className="panel">
        <div className="title">{t('nav.extractor', { defaultValue: 'Extractor' })}</div>
        <p className="page-placeholder subtle">{t('extractor.comingSoon', { defaultValue: 'Extractor tools will appear here.' })}</p>
      </section>
    </div>
  );
}
