import React, { useState } from 'react';
import { TrendingUp, Users } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  tryons: number;
  maxVisits: number;
  description: string;
  additionalImagePrice: number | null;
}

type LandingLocale = 'pt' | 'en' | 'es';

const plansByLocale: Record<LandingLocale, Plan[]> = {
  pt: [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      tryons: 0,
      maxVisits: 50000,
      description: 'Grátis para instalar. 50 imagens gratuitas (uma vez) + US$ 0,18 por imagem adicional.',
      additionalImagePrice: 0.18
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 300,
      tryons: 3000,
      maxVisits: 999999,
      description: 'US$ 300/mês com 3.000 imagens incluídas. Imagens adicionais a US$ 0,08.',
      additionalImagePrice: 0.08
    }
  ],
  en: [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      tryons: 0,
      maxVisits: 50000,
      description: 'Free to install. 50 free images (one-time) + $0.18 per additional image.',
    additionalImagePrice: 0.18
  },
  {
      id: 'pro',
      name: 'Pro',
      price: 300,
      tryons: 3000,
      maxVisits: 999999,
      description: '$300/month with 3,000 images included. Additional images at $0.08 each.',
      additionalImagePrice: 0.08
    }
  ],
  es: [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      tryons: 0,
      maxVisits: 50000,
      description: 'Gratis para instalar. 50 imagenes gratuitas (una vez) + US$ 0,18 por imagen adicional.',
      additionalImagePrice: 0.18
  },
  {
    id: 'pro',
    name: 'Pro',
      price: 300,
      tryons: 3000,
      maxVisits: 999999,
      description: 'US$ 300/mes con 3.000 imagenes incluidas. Imagenes adicionales a US$ 0,08.',
      additionalImagePrice: 0.08
    }
  ]
};

const uiByLocale: Record<LandingLocale, Record<string, string>> = {
  pt: {
    title: 'O plano para seu e-commerce',
    subtitle: 'Arraste o controle para informar quantas visitas mensais sua loja recebe',
    monthlyVisits: 'Visitas Mensais',
    plan: 'Plano',
    recommended: 'Recomendado',
    monthlyPrice: 'Preço mensal',
    includedImages: 'Imagens incluídas',
    imageCost: 'Custo por imagem',
    additionalImages: 'Imagens adicionais',
    monthSuffix: '/mês',
    specialist: 'Falar com Especialista',
    footnote: 'Em média, 1 em cada 4 visitantes usa o try-on virtual. Ajuste o valor acima de acordo com seu tráfego real.',
  },
  en: {
    title: 'The right plan for your e-commerce',
    subtitle: 'Drag the control to inform how many monthly visits your store gets',
    monthlyVisits: 'Monthly Visits',
    plan: 'Plan',
    recommended: 'Recommended',
    monthlyPrice: 'Monthly price',
    includedImages: 'Included images',
    imageCost: 'Cost per image',
    additionalImages: 'Additional images',
    monthSuffix: '/month',
    specialist: 'Talk to a Specialist',
    footnote: 'On average, 1 in 4 visitors uses virtual try-on. Adjust the value above according to your real traffic.',
  },
  es: {
    title: 'El plan para tu e-commerce',
    subtitle: 'Arrastra el control para informar cuántas visitas mensuales recibe tu tienda',
    monthlyVisits: 'Visitas mensuales',
    plan: 'Plan',
    recommended: 'Recomendado',
    monthlyPrice: 'Precio mensual',
    includedImages: 'Imágenes incluidas',
    imageCost: 'Costo por imagen',
    additionalImages: 'Imágenes adicionales',
    monthSuffix: '/mes',
    specialist: 'Hablar con un especialista',
    footnote: 'En promedio, 1 de cada 4 visitantes usa el try-on virtual. Ajusta el valor según tu tráfico real.',
  }
};

interface PlanCalculatorProps {
  locale?: LandingLocale;
}

export function PlanCalculator({ locale = 'pt' }: PlanCalculatorProps) {
  const plans = plansByLocale[locale] || plansByLocale.pt;
  const ui = uiByLocale[locale] || uiByLocale.pt;

  const numberLocale = locale === 'pt' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US';
  const currencyLocale = locale === 'pt' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US';
  const currencyCode = locale === 'pt' ? 'BRL' : 'USD';

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: currencyCode }).format(value);
  const [monthlyVisits, setMonthlyVisits] = useState(1000);

  const getRecommendedPlan = (): Plan => {
    for (const plan of plans) {
      if (monthlyVisits <= plan.maxVisits) {
        return plan;
      }
    }
    return plans[plans.length - 1];
  };

  const recommendedPlan = getRecommendedPlan();
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMonthlyVisits(parseInt(e.target.value));
  };

  return (
    <div className="bg-gradient-to-br from-[#810707] to-red-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 mb-8 sm:mb-12 md:mb-16 text-white animate-swipe-up">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3">{ui.title}</h3>
          <p className="text-red-100 text-xs sm:text-sm md:text-base">
            {ui.subtitle}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                  <p className="text-xs sm:text-sm text-red-100">{ui.monthlyVisits}</p>
                  <p className="text-2xl sm:text-3xl font-bold">{monthlyVisits.toLocaleString(numberLocale)}</p>
              </div>
            </div>
            
          </div>

          <div className="relative">
            <input
              type="range"
              min="0"
              max="800000"
              step="1000"
              value={monthlyVisits}
              onChange={handleSliderChange}
              className="w-full h-2 sm:h-3 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #ffffff 0%, #ffffff ${((monthlyVisits - 0) / (800000 - 100)) * 100}%, rgba(255,255,255,0.2) ${((monthlyVisits - 0) / (800000 - 100)) * 100}%, rgba(255,255,255,0.2) 100%)`
              }}
            />
            <div className="flex justify-between text-[10px] sm:text-xs text-red-100 mt-2">
              <span>0</span>
              <span className="hidden sm:inline">200.000</span>
              <span>400.000</span>
              <span className="hidden sm:inline">600.000</span>
              <span>800.000+</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8 text-gray-900">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#810707] to-red-700 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
            </div>
            <div className="flex-1 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                <h4 className="text-xl sm:text-2xl font-bold text-[#810707]">
                  {ui.plan} {recommendedPlan.name}
                </h4>
                <span className="bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold inline-flex self-start">
                  {ui.recommended}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{ui.monthlyPrice}</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-[#810707]">
                    {formatCurrency(recommendedPlan.price)}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{ui.includedImages}</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
                    {recommendedPlan.tryons > 0
                      ? `${recommendedPlan.tryons.toLocaleString(numberLocale)}${ui.monthSuffix}`
                      : (locale === 'pt' ? 'On-demand' : locale === 'es' ? 'Bajo demanda' : 'On-demand')}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{ui.imageCost}</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
                    {recommendedPlan.tryons > 0
                      ? formatCurrency(recommendedPlan.price / recommendedPlan.tryons)
                      : formatCurrency(recommendedPlan.additionalImagePrice || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{ui.additionalImages}</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
                    {formatCurrency(recommendedPlan.additionalImagePrice || 0)}
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-gray-700 mb-4">
                {recommendedPlan.description}
              </p>

              <div className="flex justify-center">
                <a
                  href="https://wa.me/5573991391471"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#810707] text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg hover:bg-red-800 transition-all font-semibold text-center text-sm sm:text-base"
                >
                  {ui.specialist}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-red-100">
          <p>{ui.footnote}</p>
        </div>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
        }

        @media (min-width: 640px) {
          .slider::-webkit-slider-thumb {
            width: 24px;
            height: 24px;
          }
          .slider::-moz-range-thumb {
            width: 24px;
            height: 24px;
          }
        }
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
        }

        .slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
}
