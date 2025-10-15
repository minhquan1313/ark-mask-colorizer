export default function LibraryPage({ t }) {
  return (
    <div className="container container--single">
      <section className="panel">
        <div className="title">{t('nav.library', { defaultValue: 'Library' })}</div>
        <p className="page-placeholder subtle">{t('library.comingSoon', { defaultValue: 'Library page is coming soon.' })}</p>
      </section>
    </div>
  );
}
