import { ArrowRight, Loader2 } from 'lucide-react';
import type { WidgetTranslationKey } from '../../locales/widget-translations';
import { ShopperProfilePrompt } from '../ShopperProfilePrompt';

type Translate = (key: WidgetTranslationKey) => string;

type Props = {
  variant: 'stacked' | 'embed';
  isHeroLayout: boolean;
  primaryColor: string;
  contrastText: string;
  t: Translate;
  shopperProfileLoading: boolean;
  showRestorePrompt: boolean;
  onContinueRestore: () => void;
  onUpdateMeasurements: () => void;
  onForgetProfile: () => void;
  forgetting: boolean;
  onStart: () => void;
};

export function TryOnInfoStartActions({
  variant,
  isHeroLayout,
  primaryColor,
  contrastText,
  t,
  shopperProfileLoading,
  showRestorePrompt,
  onContinueRestore,
  onUpdateMeasurements,
  onForgetProfile,
  forgetting,
  onStart,
}: Props) {
  if (shopperProfileLoading) {
    return (
      <div className="omafit-shopper-restore-loading flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>{t('shopperProfileLoading')}</span>
      </div>
    );
  }

  if (showRestorePrompt) {
    return (
      <ShopperProfilePrompt
        mode="restore"
        primaryColor={primaryColor}
        contrastText={contrastText}
        t={t}
        onContinue={onContinueRestore}
        onUpdateMeasurements={onUpdateMeasurements}
        onForget={onForgetProfile}
        forgetting={forgetting}
      />
    );
  }

  const buttonClass =
    variant === 'embed'
      ? `flex w-full items-center justify-center gap-2 rounded-lg py-3 text-base font-medium transition-all duration-300 sm:py-3.5 sm:text-lg ${
          isHeroLayout ? 'omafit-hero-start-now shadow-sm' : 'bg-primary text-white hover:bg-primary-dark'
        }`
      : `flex w-full items-center justify-center gap-2 rounded-lg font-medium transition-all duration-300 ${
          isHeroLayout
            ? 'omafit-hero-start-now py-3 text-base shadow-sm md:py-4 md:text-xl'
            : 'bg-primary py-3.5 text-lg text-white hover:bg-primary-dark md:py-4 md:text-xl'
        }`;

  return (
    <button type="button" onClick={onStart} className={buttonClass}>
      {t('startNow')}
      <ArrowRight className={variant === 'embed' ? 'h-5 w-5' : 'h-5 w-5 md:h-6 md:w-6'} />
    </button>
  );
}
