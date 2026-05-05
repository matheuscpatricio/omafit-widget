import React, { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { User, Ruler, Weight } from 'lucide-react';
import { widgetTranslations, type WidgetTranslationKey } from '../locales/widget-translations';

interface SizeCalculatorProps {
  onComplete: (data: SizeCalculatorData) => void;
  onBack: () => void;
  primaryColor?: string;
  defaultGender?: 'male' | 'female' | 'unisex';
  language?: 'pt' | 'es' | 'en';
}

export interface SizeCalculatorData {
  gender: 'male' | 'female';
  height: number;
  weight: number;
  bodyType: number;
  fit: number;
  bodyTypeIndex?: number;
  fitIndex?: number;
}

const bodyTypesMale = [
  { labelKey: 'bodyTypeLabelBalanced', factor: 1.00, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/Manequim%20Levemente%20Magro.jpg', descriptionKey: 'bodyTypeDescBalanced' },
  { labelKey: 'bodyTypeLabelWiderChest', factor: 1.04, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimmasatletico.jpg', descriptionKey: 'bodyTypeDescWiderChest' },
  { labelKey: 'bodyTypeLabelWideTorso', factor: 1.06, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimmasgordinho.jpg', descriptionKey: 'bodyTypeDescWideTorso' },
  { labelKey: 'bodyTypeLabelVeryWideChest', factor: 1.10, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimmasforte.jpg', descriptionKey: 'bodyTypeDescVeryWideChest' },
  { labelKey: 'bodyTypeLabelWideWaist', factor: 1.15, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimmasgordo.jpg', descriptionKey: 'bodyTypeDescWideWaist' }
];

const bodyTypesFemale = [
  { labelKey: 'bodyTypeLabelBalanced', factor: 1.00, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimfemmagra.jpg', descriptionKey: 'bodyTypeDescBalanced' },
  { labelKey: 'bodyTypeLabelWiderChest', factor: 1.04, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimfemombrolargo.jpg', descriptionKey: 'bodyTypeDescWiderChest' },
  { labelKey: 'bodyTypeLabelWideTorso', factor: 1.06, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimfemquadrillargo.jpg', descriptionKey: 'bodyTypeDescWideTorso' },
  { labelKey: 'bodyTypeLabelVeryWideChest', factor: 1.10, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimfemcinturalarga.jpg', descriptionKey: 'bodyTypeDescVeryWideChest' },
  { labelKey: 'bodyTypeLabelWideWaist', factor: 1.15, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimfembustolargo.jpg', descriptionKey: 'bodyTypeDescWideWaist' }
];

const fitOptions = [
  { labelKey: 'fitTight', factor: 0.97 },
  { labelKey: 'fitRegular', factor: 1.00 },
  { labelKey: 'fitLoose', factor: 1.03 }
];

const bodyTypeEase = [0.22, 1, 0.36, 1] as const;

const bodyTypeGalleryMotion = {
  initial: { opacity: 0, y: 14, filter: 'blur(8px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.4, ease: bodyTypeEase },
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: 'blur(6px)',
    transition: { duration: 0.28, ease: bodyTypeEase },
  },
};

export function SizeCalculator({ onComplete, onBack, primaryColor = '#810707', defaultGender = 'female', language = 'en' }: SizeCalculatorProps) {
  // Usar defaultGender como valor inicial, convertendo 'unisex' para 'female'
  const initialGender = (defaultGender === 'unisex' ? 'female' : defaultGender) as 'male' | 'female';
  const [gender, setGender] = useState<'male' | 'female'>(initialGender);
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [bodyTypeIndex, setBodyTypeIndex] = useState<number | null>(null);
  const [fitIndex, setFitIndex] = useState<number>(1);
  const weightInputRef = useRef<HTMLInputElement>(null);

  const t = (key: WidgetTranslationKey) => widgetTranslations[language][key] || widgetTranslations.en[key] || key;
  const bodyTypes = gender === 'male' ? bodyTypesMale : bodyTypesFemale;

  const handleSubmit = () => {
    if (!height || !weight || bodyTypeIndex === null) {
      alert(t('fillAllFields'));
      return;
    }

    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);

    if (heightNum < 100 || heightNum > 250) {
      alert(t('invalidHeight'));
      return;
    }

    if (weightNum < 30 || weightNum > 300) {
      alert(t('invalidWeight'));
      return;
    }

    onComplete({
      gender,
      height: heightNum,
      weight: weightNum,
      bodyType: bodyTypes[bodyTypeIndex].factor,
      fit: fitOptions[fitIndex].factor,
      bodyTypeIndex,
      fitIndex
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('sizeCalculatorTitle')}</h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('genderLabel')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setGender('female');
                  setBodyTypeIndex(null);
                }}
                style={gender === 'female' ? { backgroundColor: primaryColor } : {}}
                className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                  gender === 'female'
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('female')}
              </button>
              <button
                onClick={() => {
                  setGender('male');
                  setBodyTypeIndex(null);
                }}
                style={gender === 'male' ? { backgroundColor: primaryColor } : {}}
                className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                  gender === 'male'
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('male')}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              {t('heightLabel')}
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => {
                const value = e.target.value;
                setHeight(value);
                if (value.length === 3) {
                  weightInputRef.current?.focus();
                }
              }}
              placeholder={t('heightPlaceholder')}
              style={{ outline: 'none' }}
              onFocus={(e) => {
                e.target.style.borderColor = primaryColor;
                e.target.style.boxShadow = `0 0 0 2px ${primaryColor}33`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Weight className="w-4 h-4" />
              {t('weightLabel')}
            </label>
            <input
              ref={weightInputRef}
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={t('weightPlaceholder')}
              style={{ outline: 'none' }}
              onFocus={(e) => {
                e.target.style.borderColor = primaryColor;
                e.target.style.boxShadow = `0 0 0 2px ${primaryColor}33`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('bodyTypeQuestion')}
            </label>
            <div className="relative overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={gender}
                  className="flex flex-col gap-2"
                  variants={bodyTypeGalleryMotion}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {/* Mobile: Primeira linha com 3 imagens */}
                  <div className="grid grid-cols-3 gap-2 md:hidden">
                    {bodyTypes.slice(0, 3).map((type, index) => (
                      <button
                        key={`${gender}-${index}`}
                        type="button"
                        onClick={() => setBodyTypeIndex(index)}
                        style={bodyTypeIndex === index ? { borderColor: primaryColor, boxShadow: `0 0 0 2px ${primaryColor}` } : {}}
                        className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                          bodyTypeIndex === index
                            ? ''
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <motion.img
                          src={type.image}
                          alt={t(type.labelKey as WidgetTranslationKey)}
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                          decoding="async"
                          initial={{ opacity: 0.85, scale: 1.02 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </button>
                    ))}
                  </div>
                  {/* Mobile: Segunda linha com 2 imagens centralizadas entre as lacunas */}
                  <div
                    className="flex justify-center gap-2 md:hidden"
                    style={{ marginLeft: 'calc((100% / 3 + 0.5rem) / 2)', marginRight: 'calc((100% / 3 + 0.5rem) / 2)' }}
                  >
                    {bodyTypes.slice(3, 5).map((type, index) => (
                      <button
                        key={`${gender}-${index + 3}`}
                        type="button"
                        onClick={() => setBodyTypeIndex(index + 3)}
                        style={{
                          width: 'calc(50% - 0.25rem)',
                          ...(bodyTypeIndex === index + 3 ? { borderColor: primaryColor, boxShadow: `0 0 0 2px ${primaryColor}` } : {}),
                        }}
                        className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                          bodyTypeIndex === index + 3
                            ? ''
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <motion.img
                          src={type.image}
                          alt={t(type.labelKey as WidgetTranslationKey)}
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                          decoding="async"
                          initial={{ opacity: 0.85, scale: 1.02 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </button>
                    ))}
                  </div>
                  {/* Desktop: Todas as 5 imagens em uma linha */}
                  <div className="hidden md:grid grid-cols-5 gap-2">
                    {bodyTypes.map((type, index) => (
                      <button
                        key={`${gender}-d-${index}`}
                        type="button"
                        onClick={() => setBodyTypeIndex(index)}
                        style={bodyTypeIndex === index ? { borderColor: primaryColor, boxShadow: `0 0 0 2px ${primaryColor}` } : {}}
                        className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                          bodyTypeIndex === index
                            ? ''
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <motion.img
                          src={type.image}
                          alt={t(type.labelKey as WidgetTranslationKey)}
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                          decoding="async"
                          initial={{ opacity: 0.85, scale: 1.02 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.32, delay: index * 0.035, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </button>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              {t('fitPreferenceLabel')}
            </label>
            <div className="px-2">
              {/* Slider Container */}
              <div className="relative">
                {/* Linha do slider */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 rounded-full -translate-y-1/2" />

                {/* Barra de progresso */}
                <div
                  className="absolute top-1/2 left-0 h-1 rounded-full -translate-y-1/2 transition-all duration-300"
                  style={{
                    backgroundColor: primaryColor,
                    width: `${fitIndex * 50}%`
                  }}
                />

                {/* Pontos clicáveis */}
                <div className="relative flex justify-between items-center">
                  {fitOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => setFitIndex(index)}
                      className="flex flex-col items-center gap-2 z-10"
                      type="button"
                    >
                      {/* Círculo do ponto */}
                      <div
                        className={`w-6 h-6 rounded-full border-4 transition-all duration-300 ${
                          fitIndex === index
                            ? 'border-white shadow-lg scale-110'
                            : 'border-gray-300 bg-white hover:scale-105'
                        }`}
                        style={fitIndex === index ? { backgroundColor: primaryColor } : {}}
                      />
                      {/* Label */}
                      <span
                        className={`text-sm font-medium transition-colors ${
                          fitIndex === index ? 'text-gray-900' : 'text-gray-500'
                        }`}
                      >
                        {t(option.labelKey as WidgetTranslationKey)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 p-4 flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          {t('back')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!height || !weight || bodyTypeIndex === null}
          style={!height || !weight || bodyTypeIndex === null ? {} : { backgroundColor: primaryColor }}
          className="flex-1 py-2 px-4 text-white rounded-lg hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-medium"
        >
          {t('continue')}
        </button>
      </div>
    </div>
  );
}
