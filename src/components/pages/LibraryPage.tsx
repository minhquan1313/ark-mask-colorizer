import type { TranslateFn } from '../../types/mask';

interface LibraryPageProps {
  t: TranslateFn;
}

export default function LibraryPage({ t }: LibraryPageProps) {
  return (
    <div className="container container--single">
      <section className="panel">
        <div className="title">{t('nav.library', { defaultValue: 'Library' })}</div>
        <p className="page-placeholder subtle">{t('library.comingSoon', { defaultValue: 'Library page is coming soon.' })}</p>
      </section>
    </div>
  );
}
