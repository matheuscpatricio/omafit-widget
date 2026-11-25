import { useLandingLocale } from '../../contexts/LandingLocaleContext';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface ClosingCtaProps {
  onRequestDemo?: () => void;
}

export function ClosingCta({ onRequestDemo }: ClosingCtaProps) {
  const { t } = useLandingLocale();

  return (
    <section className="bg-oma-canvas px-6 pb-24 md:pb-32">
      <Card className="landing-glass mx-auto flex max-w-3xl flex-col items-center gap-6 px-8 py-12 text-center md:px-14 md:py-16">
        <h2 className="landing-title text-3xl font-semibold tracking-tight text-oma-cream md:text-5xl">
          {t.closing.title}
        </h2>
        <p className="max-w-xl text-lg leading-relaxed text-oma-cream/75">{t.closing.lead}</p>
        <Button type="button" variant="primary" size="lg" onClick={onRequestDemo}>
          {t.hero.demo}
        </Button>
      </Card>
    </section>
  );
}
