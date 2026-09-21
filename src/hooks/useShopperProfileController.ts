import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { WidgetTranslationKey } from '../locales/widget-translations';
import type { SizeCalculatorData } from '../components/SizeCalculator';
import { resolveForcedCalculatorGender } from '../utils/chartGenderScope';
import { SHOPPER_RESTORE_DISMISS_PREFIX, SHOPPER_SAVE_DISMISS_PREFIX } from '../components/tryon/tryonWidgetConstants';
import {
  appendTryonHistory,
  applyForcedGenderToMeasurements,
  deleteShopperProfile,
  fetchShopperProfile,
  hasActiveMarketingWhatsappConsent,
  hasActiveShopperConsent,
  isValidShopperMeasurements,
  normalizeShopDomain,
  recordShopperProfileEvent,
  revokeShopperMarketingWhatsapp,
  saveShopperMarketingWhatsapp,
  saveShopperProfile,
  setShopperDeviceIdFromParent,
  getShopperDeviceId,
  shopperMeasurementsEqual,
  type ShopperProfile,
} from '../utils/shopperProfile';

type Step = 'info' | 'calculator' | 'photo' | 'processing' | 'result';

type Args = {
  t: (key: WidgetTranslationKey) => string;
  effectiveShopDomain: string;
  publicId?: string;
  publicIdRef: MutableRefObject<string | undefined>;
  shopperDeviceId?: string;
  whatsappMarketingEnabled: boolean;
  tryOnEnabled: boolean;
  sizeData: SizeCalculatorData | null;
  setSizeData: Dispatch<SetStateAction<SizeCalculatorData | null>>;
  setStep: Dispatch<SetStateAction<Step>>;
  chartGenderScope: 'both' | 'male' | 'female';
  defaultGender?: string;
  recommendedSize: string | null;
  calculatedSize: string | null;
  result: string | null;
  analyticsSessionId: string | null;
  localProductHandle: string;
  productHandle?: string;
  sessionModelImageUrlRef: MutableRefObject<string | null>;
  setError: Dispatch<SetStateAction<string>>;
  step: Step;
  loadShopperProfileRef: MutableRefObject<(() => void) | null>;
  tryonHistoryRecordedRef: MutableRefObject<string | null>;
  onContinueWithoutPhoto: (data: SizeCalculatorData) => void;
};

export function useShopperProfileController(args: Args) {
  const {
    t,
    effectiveShopDomain,
    publicId,
    publicIdRef,
    shopperDeviceId: shopperDeviceIdProp = '',
    whatsappMarketingEnabled,
    tryOnEnabled,
    sizeData,
    setSizeData,
    setStep,
    chartGenderScope,
    defaultGender,
    recommendedSize,
    calculatedSize,
    result,
    analyticsSessionId,
    localProductHandle,
    productHandle,
    sessionModelImageUrlRef,
    setError,
    step,
    loadShopperProfileRef,
    tryonHistoryRecordedRef,
    onContinueWithoutPhoto,
  } = args;

  const [shopperProfile, setShopperProfile] = useState<ShopperProfile | null>(null);
  const [shopperProfileLoading, setShopperProfileLoading] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [restoreOfferLogged, setRestoreOfferLogged] = useState(false);
  const [shopperSaveConsent, setShopperSaveConsent] = useState(false);
  const [shopperSaveEmail, setShopperSaveEmail] = useState('');
  const [shopperProfileSaving, setShopperProfileSaving] = useState(false);
  const [shopperProfileSaved, setShopperProfileSaved] = useState(false);
  const [shopperSaveError, setShopperSaveError] = useState<string | null>(null);
  const [shopperSaveDismissed, setShopperSaveDismissed] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [whatsappPhotoConsent, setWhatsappPhotoConsent] = useState(false);
  const [whatsappSaving, setWhatsappSaving] = useState(false);
  const [whatsappSaved, setWhatsappSaved] = useState(false);
  const [whatsappRevoked, setWhatsappRevoked] = useState(false);
  const [whatsappRevoking, setWhatsappRevoking] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [whatsappDismissed, setWhatsappDismissed] = useState(false);
  const [shopperForgetting, setShopperForgetting] = useState(false);

  const getShopperProfileFetchConfig = () => {
    const shopDomain = normalizeShopDomain(effectiveShopDomain);
    if (!shopDomain) return null;
    return {
      shopDomain,
      publicId: (publicIdRef.current || publicId || '').trim(),
    };
  };

  const getShopperProfileWriteConfig = () => {
    const config = getShopperProfileFetchConfig();
    if (!config?.publicId) return null;
    return config;
  };

  const isRestoreDismissedThisSession = (shopDomain: string) => {
    const normalized = normalizeShopDomain(shopDomain);
    if (!normalized || typeof window === 'undefined') return false;
    try {
      return Boolean(window.sessionStorage.getItem(`${SHOPPER_RESTORE_DISMISS_PREFIX}${normalized}`));
    } catch {
      return false;
    }
  };

  const dismissRestorePromptForSession = (shopDomain: string) => {
    const normalized = normalizeShopDomain(shopDomain);
    if (!normalized || typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(`${SHOPPER_RESTORE_DISMISS_PREFIX}${normalized}`, '1');
    } catch {
      /* ignore */
    }
  };

  const dismissSavePromptForSession = (shopDomain: string) => {
    const normalized = normalizeShopDomain(shopDomain);
    if (!normalized || typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(`${SHOPPER_SAVE_DISMISS_PREFIX}${normalized}`, '1');
    } catch {
      /* ignore */
    }
  };

  const shouldOfferShopperRestore = (profile: ShopperProfile | null) => {
    if (!profile || !hasActiveShopperConsent(profile)) return false;
    if (!isValidShopperMeasurements(profile.measurements)) return false;
    if (isRestoreDismissedThisSession(effectiveShopDomain)) return false;
    return true;
  };

  const handleAcceptShopperRestore = () => {
    if (!shopperProfile || !isValidShopperMeasurements(shopperProfile.measurements)) return;
    const forcedGender = resolveForcedCalculatorGender(chartGenderScope, defaultGender);
    const measurements = applyForcedGenderToMeasurements(shopperProfile.measurements, forcedGender);
    setShowRestorePrompt(false);
    setSizeData(measurements);
    const config = getShopperProfileWriteConfig();
    if (config) {
      void recordShopperProfileEvent(config, 'profile_accepted');
      void recordShopperProfileEvent(config, 'profile_skipped_calculator');
    }
    if (tryOnEnabled === false) {
      onContinueWithoutPhoto(measurements);
      return;
    }
    setStep('photo');
  };

  const handleUpdateShopperMeasurements = () => {
    setShowRestorePrompt(false);
    setStep('calculator');
  };

  const handleForgetShopperProfile = async () => {
    const config = getShopperProfileWriteConfig();
    if (!config) return;
    setShopperForgetting(true);
    try {
      await deleteShopperProfile(config);
      setShopperProfile(null);
      setShowRestorePrompt(false);
      setShopperProfileSaved(false);
      setShopperSaveConsent(false);
      setShopperSaveEmail('');
      dismissRestorePromptForSession(effectiveShopDomain);
    } catch {
      setError(t('shopperProfileDeleteError'));
    } finally {
      setShopperForgetting(false);
    }
  };

  const handleSaveShopperProfile = async (consentOverride?: boolean) => {
    const hasConsent = consentOverride ?? shopperSaveConsent;
    if (!sizeData || !hasConsent) return;
    const config = getShopperProfileWriteConfig();
    if (!config) return;
    setShopperProfileSaving(true);
    setShopperSaveError(null);
    try {
      const saved = await saveShopperProfile(config, sizeData, {
        email: shopperSaveEmail,
        event: 'profile_saved',
      });
      setShopperProfile(saved);
      setShopperProfileSaved(true);
    } catch {
      setShopperSaveError(t('shopperProfileSaveError'));
    } finally {
      setShopperProfileSaving(false);
    }
  };

  const handleShopperSaveConsentChange = (checked: boolean) => {
    setShopperSaveConsent(checked);
    if (checked) {
      void handleSaveShopperProfile(true);
    }
  };

  const handleDismissShopperSave = () => {
    setShopperSaveDismissed(true);
    dismissSavePromptForSession(effectiveShopDomain);
  };

  const shopperProfileStoredInDb =
    Boolean(shopperProfile) &&
    hasActiveShopperConsent(shopperProfile) &&
    isValidShopperMeasurements(shopperProfile?.measurements);

  const shopperMeasurementsMatchStoredProfile =
    shopperProfileStoredInDb &&
    Boolean(sizeData) &&
    isValidShopperMeasurements(sizeData) &&
    shopperMeasurementsEqual(sizeData, shopperProfile!.measurements);

  const shouldShowShopperSavePrompt =
    step === 'processing' &&
    tryOnEnabled !== false &&
    Boolean(sizeData) &&
    isValidShopperMeasurements(sizeData) &&
    !shopperSaveDismissed &&
    !shopperProfileLoading &&
    (
      shopperProfileSaved ||
      shopperMeasurementsMatchStoredProfile ||
      !shopperProfileStoredInDb
    );

  const shopperSavePromptShowsSaved =
    shopperProfileSaved || shopperMeasurementsMatchStoredProfile;

  const shouldShowWhatsappOptIn =
    step === 'result' &&
    whatsappMarketingEnabled &&
    tryOnEnabled !== false &&
    !whatsappDismissed &&
    !hasActiveMarketingWhatsappConsent(shopperProfile) &&
    !whatsappRevoked &&
    Boolean(getShopperProfileWriteConfig());

  const shouldShowWhatsappManage =
    step === 'result' &&
    whatsappMarketingEnabled &&
    tryOnEnabled !== false &&
    hasActiveMarketingWhatsappConsent(shopperProfile) &&
    !whatsappRevoked &&
    Boolean(getShopperProfileWriteConfig());

  const handleSaveWhatsappOptIn = async () => {
    const config = getShopperProfileWriteConfig();
    if (!config || !whatsappConsent || !whatsappPhone.trim()) return;
    const modelImageUrl = sessionModelImageUrlRef.current?.trim() || null;
    setWhatsappSaving(true);
    setWhatsappError(null);
    try {
      if (sizeData && !hasActiveShopperConsent(shopperProfile)) {
        const profile = await saveShopperProfile(config, sizeData, { event: 'profile_saved' });
        if (profile) setShopperProfile(profile);
      }
      const saved = await saveShopperMarketingWhatsapp(config, whatsappPhone, {
        modelImageUrl,
        marketingPhotoConsent: whatsappPhotoConsent,
      });
      if (saved) setShopperProfile(saved);
      setWhatsappSaved(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('OMAFIT_PII_ENCRYPTION_KEY') || msg.includes('503')) {
        setWhatsappError(t('shopperWhatsAppEncryptionError'));
      } else {
        setWhatsappError(t('shopperWhatsAppError'));
      }
    } finally {
      setWhatsappSaving(false);
    }
  };

  const handleRevokeWhatsappOptIn = async () => {
    const config = getShopperProfileWriteConfig();
    if (!config) return;
    setWhatsappRevoking(true);
    setWhatsappError(null);
    try {
      const updated = await revokeShopperMarketingWhatsapp(config);
      if (updated) setShopperProfile(updated);
      setWhatsappRevoked(true);
    } catch {
      setWhatsappError(t('shopperWhatsAppError'));
    } finally {
      setWhatsappRevoking(false);
    }
  };

  const shopperProfileFetchSeqRef = useRef(0);

  const loadShopperProfile = useCallback(() => {
    const config = getShopperProfileFetchConfig();
    if (!config) return;

    const seq = ++shopperProfileFetchSeqRef.current;
    setShopperProfileLoading(true);

    void fetchShopperProfile(config)
      .then((profile) => {
        if (shopperProfileFetchSeqRef.current !== seq) return;
        setShopperProfile(profile);
        if (profile?.email) {
          setShopperSaveEmail(profile.email);
        }
      })
      .catch((err) => {
        if (shopperProfileFetchSeqRef.current === seq) {
          console.warn('[shopperProfile] fetch error:', err);
        }
      })
      .finally(() => {
        if (shopperProfileFetchSeqRef.current === seq) {
          setShopperProfileLoading(false);
        }
      });
  }, [effectiveShopDomain, publicId]);

  loadShopperProfileRef.current = loadShopperProfile;

  useEffect(() => {
    const incoming = String(shopperDeviceIdProp || '').trim();
    if (!incoming) return;
    if (setShopperDeviceIdFromParent(incoming)) {
      loadShopperProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopperDeviceIdProp]);

  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return;
    const deviceId = getShopperDeviceId();
    if (!deviceId) return;
    try {
      window.parent.postMessage(
        {
          type: 'omafit-device-id-adopt',
          deviceId,
          shopDomain: normalizeShopDomain(effectiveShopDomain),
        },
        '*',
      );
    } catch {
      /* ignore */
    }
  }, [effectiveShopDomain]);

  const prevStepRef = useRef(step);

  useEffect(() => {
    loadShopperProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveShopDomain]);

  useEffect(() => {
    const enteredInfo = step === 'info' && prevStepRef.current !== 'info';
    prevStepRef.current = step;
    if (step === 'info') {
      setRestoreOfferLogged(false);
    }
    if (enteredInfo) {
      loadShopperProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, effectiveShopDomain]);

  useEffect(() => {
    if (step !== 'info') {
      setShowRestorePrompt(false);
      return;
    }
    if (shopperProfileLoading) return;
    setShowRestorePrompt(shouldOfferShopperRestore(shopperProfile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, shopperProfile, shopperProfileLoading, effectiveShopDomain]);

  useEffect(() => {
    if (!showRestorePrompt || restoreOfferLogged) return;
    const config = getShopperProfileWriteConfig();
    if (!config) return;
    setRestoreOfferLogged(true);
    void recordShopperProfileEvent(config, 'profile_offered');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRestorePrompt, restoreOfferLogged, publicId]);

  useEffect(() => {
    if (!shopperSaveConsent || shopperProfileSaved || shopperProfileSaving || !sizeData) return;
    if (shopperMeasurementsMatchStoredProfile) return;
    const config = getShopperProfileWriteConfig();
    if (!config) return;
    void handleSaveShopperProfile(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicId, effectiveShopDomain, shopperSaveConsent, shopperProfileSaved, sizeData, shopperProfile?.updated_at]);

  useEffect(() => {
    if (typeof window === 'undefined' || !effectiveShopDomain) return;
    const normalized = normalizeShopDomain(effectiveShopDomain);
    try {
      setShopperSaveDismissed(
        Boolean(window.sessionStorage.getItem(`${SHOPPER_SAVE_DISMISS_PREFIX}${normalized}`)),
      );
    } catch {
      setShopperSaveDismissed(false);
    }
  }, [effectiveShopDomain]);

  useEffect(() => {
    if (step !== 'result' || !sizeData) return;
    const config = getShopperProfileWriteConfig();
    if (!config || !shopperProfile || !hasActiveShopperConsent(shopperProfile)) return;

    const historyKey = [
      localProductHandle || productHandle || '',
      recommendedSize || calculatedSize || '',
      result || '',
      analyticsSessionId || '',
    ].join('|');
    if (tryonHistoryRecordedRef.current === historyKey) return;
    tryonHistoryRecordedRef.current = historyKey;

    void appendTryonHistory(config, {
      productHandle: localProductHandle || productHandle || null,
      recommendedSize: recommendedSize || calculatedSize || null,
      resultImageUrl: result || null,
      tryonSessionId: analyticsSessionId,
      modelImageUrl: sessionModelImageUrlRef.current,
    }).then((updated) => {
      if (updated) setShopperProfile(updated);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, result, recommendedSize, calculatedSize, analyticsSessionId, shopperProfile?.id]);


  const resetShopperUi = () => {
    setShopperProfileSaved(false);
    setShopperSaveError(null);
    setShopperSaveConsent(false);
    if (shouldOfferShopperRestore(shopperProfile)) {
      setShowRestorePrompt(true);
    } else {
      setShowRestorePrompt(false);
    }
  };

  return {
    shopperProfile,
    shopperProfileLoading,
    showRestorePrompt,
    shopperSaveConsent,
    setShopperSaveConsent,
    shopperProfileSaving,
    shopperProfileSaved,
    shopperSaveError,
    shopperForgetting,
    whatsappPhone,
    setWhatsappPhone,
    whatsappConsent,
    setWhatsappConsent,
    whatsappPhotoConsent,
    setWhatsappPhotoConsent,
    whatsappSaving,
    whatsappSaved,
    whatsappRevoking,
    whatsappError,
    setWhatsappDismissed,
    handleAcceptShopperRestore,
    handleUpdateShopperMeasurements,
    handleForgetShopperProfile,
    handleShopperSaveConsentChange,
    handleDismissShopperSave,
    shouldShowShopperSavePrompt,
    shopperSavePromptShowsSaved,
    shouldShowWhatsappOptIn,
    shouldShowWhatsappManage,
    handleSaveWhatsappOptIn,
    handleRevokeWhatsappOptIn,
    resetShopperUi,
  };
}
