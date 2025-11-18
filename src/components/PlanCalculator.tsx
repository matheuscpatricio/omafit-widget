import React, { useState } from 'react';
import { TrendingUp, Users } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  tryons: number;
  maxVisits: number;
}

const plans: Plan[] = [
  { id: 'basic', name: 'Basic', price: 130, tryons: 100, maxVisits: 10000 },
  { id: 'starter', name: 'Starter', price: 550, tryons: 500, maxVisits: 70000 },
  { id: 'growth', name: 'Growth', price: 975, tryons: 1000, maxVisits: 200000 },
  { id: 'scale', name: 'Scale', price: 2400, tryons: 3000, maxVisits: 500000 },
  { id: 'enterprise', name: 'Enterprise', price: 0, tryons: -1, maxVisits: Infinity }
];

export function PlanCalculator() {
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
  const estimatedTryons = Math.round(monthlyVisits / 4);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMonthlyVisits(parseInt(e.target.value));
  };

  return (
    <div className="bg-gradient-to-br from-[#810707] to-red-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 mb-8 sm:mb-12 md:mb-16 text-white animate-swipe-up">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3">
             O plano para seu e-commerce
          </h3>
          <p className="text-red-100 text-xs sm:text-sm md:text-base">
            Arraste o controle para informar quantas visitas mensais sua loja recebe
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-red-100">Visitas Mensais</p>
                <p className="text-2xl sm:text-3xl font-bold">{monthlyVisits.toLocaleString('pt-BR')}</p>
              </div>
            </div>
            
          </div>

          <div className="relative">
            <input
              type="range"
              min="0"
              max="1000000"
              step="1000"
              value={monthlyVisits}
              onChange={handleSliderChange}
              className="w-full h-2 sm:h-3 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #ffffff 0%, #ffffff ${((monthlyVisits - 0) / (1000000 - 100)) * 100}%, rgba(255,255,255,0.2) ${((monthlyVisits - 0) / (1000000 - 100)) * 100}%, rgba(255,255,255,0.2) 100%)`
              }}
            />
            <div className="flex justify-between text-[10px] sm:text-xs text-red-100 mt-2">
              <span>0</span>
              <span className="hidden sm:inline">250.000</span>
              <span>500.000</span>
              <span className="hidden sm:inline">750.000</span>
              <span>1.000.000+</span>
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
                  Plano {recommendedPlan.name}
                </h4>
                <span className="bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold inline-flex self-start">
                  Recomendado
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Preço mensal</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-[#810707]">
                    {recommendedPlan.id === 'enterprise'
                      ? 'Customizado'
                      : `R$ ${recommendedPlan.price.toLocaleString('pt-BR')}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Imagens incluídas</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
                    {recommendedPlan.tryons === -1
                      ? 'Ilimitado'
                      : `${recommendedPlan.tryons.toLocaleString('pt-BR')}/mês`}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-xs sm:text-sm text-gray-600">Custo por imagem</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
                    {recommendedPlan.id === 'enterprise'
                      ? 'A negociar'
                      : `R$ ${(recommendedPlan.price / recommendedPlan.tryons).toFixed(2)}`}
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                Com base em {monthlyVisits.toLocaleString('pt-BR')} visitas mensais, estimamos que você precisará de aproximadamente {estimatedTryons.toLocaleString('pt-BR')} try-ons por mês.
                {recommendedPlan.tryons !== -1 && estimatedTryons <= recommendedPlan.tryons && (
                  <span className="text-green-600 font-semibold"> Este plano oferece margem de segurança perfeita para seu negócio!</span>
                )}
              </p>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    const pricingSection = document.getElementById('pricing');
                    if (pricingSection) {
                      const offset = pricingSection.offsetTop + 800;
                      window.scrollTo({ top: offset, behavior: 'smooth' });
                    }
                  }}
                  className="flex-1 bg-[#810707] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-red-800 transition-all font-semibold text-sm sm:text-base"
                >
                  Ver Detalhes do Plano
                </button>
                <a
                  href="#"
                  className="flex-1 bg-gray-100 text-gray-900 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-gray-200 transition-all font-semibold text-center text-sm sm:text-base"
                >
                  Falar com Especialista
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-red-100">
          <p>
            💡 <span className="font-semibold">Dica:</span> Em média, 1 em cada 4 visitantes usa o try-on virtual.
            Ajuste o valor acima de acordo com seu tráfego real.
          </p>
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
