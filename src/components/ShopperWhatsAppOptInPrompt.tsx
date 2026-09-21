import { Loader2 } from 'lucide-react';
import type { WidgetTranslationKey } from '../locales/widget-translations';

type Translate = (key: WidgetTranslationKey) => string;

type Props = {
  mode?: 'opt-in' | 'manage';
  primaryColor: string;
  t: Translate;
  phone?: string;
  onPhoneChange?: (value: string) => void;
  consentChecked?: boolean;
  onConsentChange?: (checked: boolean) => void;
  showPhotoConsent?: boolean;
  photoConsentChecked?: boolean;
  onPhotoConsentChange?: (checked: boolean) => void;
  onSubmit?: () => void;
  onDismiss?: () => void;
  onRevoke?: () => void;
  saving?: boolean;
  revoking?: boolean;
  saved?: boolean;
  error?: string | null;
};

export function ShopperWhatsAppOptInPrompt({
  mode = 'opt-in',
  primaryColor,
  t,
  phone = '',
  onPhoneChange,
  consentChecked = false,
  onConsentChange,
  showPhotoConsent = false,
  photoConsentChecked = false,
  onPhotoConsentChange,
  onSubmit,
  onDismiss,
  onRevoke,
  saving = false,
  revoking = false,
  saved = false,
  error,
}: Props) {
  return (
    <div className="omafit-whatsapp-optin fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-lg">
      <p className="mb-2 text-sm font-semibold text-gray-900">{t('shopperWhatsAppTitle')}</p>
      {mode === 'manage' ? (
        <button
          type="button"
          onClick={onRevoke}
          disabled={revoking}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 disabled:opacity-60"
        >
          {revoking ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t('shopperWhatsAppRevoke')}
        </button>
      ) : saved ? (
        <p className="text-sm text-gray-700">{t('shopperWhatsAppSaved')}</p>
      ) : (
        <div className="space-y-2">
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => onPhoneChange?.(event.target.value)}
            placeholder={t('shopperWhatsAppPhone')}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={consentChecked}
              onChange={(event) => onConsentChange?.(event.target.checked)}
            />
            <span>{t('shopperWhatsAppConsent')}</span>
          </label>
          {showPhotoConsent ? (
            <label className="flex items-start gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={photoConsentChecked}
                onChange={(event) => onPhotoConsentChange?.(event.target.checked)}
              />
              <span>{t('shopperWhatsAppPhotoConsent')}</span>
            </label>
          ) : null}
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || !consentChecked || !phone.trim()}
            className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: primaryColor }}
          >
            {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t('shopperWhatsAppSubmit')}
          </button>
          <button type="button" onClick={onDismiss} className="w-full text-xs text-gray-500">
            {t('shopperWhatsAppDismiss')}
          </button>
        </div>
      )}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
