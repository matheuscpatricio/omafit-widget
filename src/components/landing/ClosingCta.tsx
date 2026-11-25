import { ArrowRight, Play } from 'lucide-react';
import { useLandingLocale } from '../../contexts/LandingLocaleContext';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface ClosingCtaProps {
  onOpenInstallModal?: () => void;
  onRequestDemo?: () => void;
}

export function ClosingCta({ onOpenInstallModal, onRequestDemo }: ClosingCtaProps) {
  const { t } = useLandingLocale();

  return (
    <section className="bg-oma-canvas px-6 pb-24 md:pb-32">
      <Card className="landing-glass mx-auto flex max-w-3xl flex-col items-center gap-6 px-8 py-12 text-center md:px-14 md:py-16">
        <h2 className="landing-title text-3xl font-semibold tracking-tight text-oma-cream md:text-5xl">
          {t.closing.title}
        </h2>
        <p className="max-w-xl text-lg leading-relaxed text-oma-cream/75">{t.closing.lead}</p>
        <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full justify-center sm:w-auto"
            onClick={() => onOpenInstallModal?.()}
          >
            {t.hero.install}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full justify-center border-oma-cream/25 bg-oma-parchment/95 text-white hover:bg-oma-light hover:text-white sm:w-auto [&_svg]:text-white"
            onClick={onRequestDemo}
          >
            <Play className="h-4 w-4" />
            {t.hero.demo}
          </Button>
        </div>
      </Card>
    </section>
  );
}
