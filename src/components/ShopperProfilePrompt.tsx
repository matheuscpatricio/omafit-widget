import { Loader2 } from 'lucide-react';
import type { WidgetTranslationKey } from '../locales/widget-translations';

type Translate = (key: WidgetTranslationKey) => string;

type RestoreProps = {
  mode: 'restore';
  primaryColor: string;
  contrastText: string;
  t: Translate;
  onContinue: () => void;
  onUpdateMeasurements: () => void;
  onForget: () => void;
  forgetting?: boolean;
};

type SaveProps = {
  mode: 'save-compact';
  primaryColor: string;
  t: Translate;
  consentChecked: boolean;
  onConsentChange: (checked: boolean) => void;
  onDismiss: () => void;
  saving?: boolean;
  saved?: boolean;
  saveError?: string | null;
};

export type ShopperProfilePromptProps = RestoreProps | SaveProps;

export function ShopperProfilePrompt(props: ShopperProfilePromptProps) {
  if (props.mode === 'restore') {
    return (
      <div className="omafit-shopper-restore w-full rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-sm">
        <p className="mb-3 text-sm font-medium text-gray-800">{props.t('shopperRestoreTitle')}</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={props.onContinue}
            className="w-full rounded-lg px-3 py-2.5 text-sm font-medium"
            style={{ backgroundColor: props.primaryColor, color: props.contrastText }}
          >
            {props.t('shopperRestoreContinue')}
          </button>
          <button
            type="button"
            onClick={props.onUpdateMeasurements}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-800"
          >
            {props.t('shopperRestoreUpdate')}
          </button>
          <button
            type="button"
            onClick={props.onForget}
            disabled={props.forgetting}
            className="w-full rounded-lg px-3 py-2 text-xs text-gray-500 disabled:opacity-60"
          >
            {props.forgetting ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : props.t('shopperRestoreForget')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="omafit-shopper-save mx-auto mt-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-3 text-left">
      {props.saved ? (
        <p className="text-sm font-medium text-gray-800">{props.t('shopperSaveSaved')}</p>
      ) : (
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={props.consentChecked}
            onChange={(event) => props.onConsentChange(event.target.checked)}
            disabled={props.saving}
          />
          <span>{props.t('shopperSaveConsent')}</span>
        </label>
      )}
      {props.saveError ? <p className="mt-2 text-xs text-red-600">{props.saveError}</p> : null}
      {props.saving ? <Loader2 className="mt-2 h-4 w-4 animate-spin text-gray-500" /> : null}
      {!props.saved ? (
        <button
          type="button"
          onClick={props.onDismiss}
          className="mt-2 text-xs text-gray-500 underline"
        >
          {props.t('shopperSaveDismiss')}
        </button>
      ) : null}
    </div>
  );
}
