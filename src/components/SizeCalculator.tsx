import React, { useState } from 'react';
import { User, Ruler, Weight } from 'lucide-react';

interface SizeCalculatorProps {
  onComplete: (data: SizeCalculatorData) => void;
  onBack: () => void;
  primaryColor?: string;
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
  { label: 'Ectomorfo', factor: 0.90, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/Manequim%20Levemente%20Magro.jpg' },
  { label: 'Atlético magro', factor: 0.95, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimmasatletico.jpg' },
  { label: 'Médio', factor: 1.00, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimmasgordinho.jpg' },
  { label: 'Mesomorfo', factor: 1.10, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimmasforte.jpg' },
  { label: 'Endomorfo', factor: 1.20, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimmasgordo.jpg' }
];

const bodyTypesFemale = [
  { label: 'Muito magra', factor: 0.90, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimfemmagra.jpg' },
  { label: 'Magra', factor: 0.95, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimfemombrolargo.jpg' },
  { label: 'Média', factor: 1.00, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimfemquadrillargo.jpg' },
  { label: 'Curvilínea', factor: 1.10, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimfemcinturalarga.jpg' },
  { label: 'Plus', factor: 1.20, image: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimfembustolargo.jpg' }
];

const fitOptions = [
  { label: 'Justa', factor: 1.03 },
  { label: 'Na medida', factor: 1.00 },
  { label: 'Solta', factor: 0.97 }
];

export function SizeCalculator({ onComplete, onBack, primaryColor = '#810707' }: SizeCalculatorProps) {
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [bodyTypeIndex, setBodyTypeIndex] = useState<number | null>(null);
  const [fitIndex, setFitIndex] = useState<number>(1);

  const bodyTypes = gender === 'male' ? bodyTypesMale : bodyTypesFemale;

  const handleSubmit = () => {
    if (!height || !weight || bodyTypeIndex === null) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);

    if (heightNum < 100 || heightNum > 250) {
      alert('Por favor, insira uma altura válida (100-250 cm)');
      return;
    }

    if (weightNum < 30 || weightNum > 300) {
      alert('Por favor, insira um peso válido (30-300 kg)');
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
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 min-h-0">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Calculadora de Tamanho</h2>

        <div className="space-y-5 pb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gênero</label>
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
                Feminino
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
                Masculino
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              Altura (cm)
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="Ex: 170"
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
              Peso (kg)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Ex: 70"
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
              Qual corpo se parece mais com o seu?
            </label>
            <div className="grid grid-cols-5 gap-2">
              {bodyTypes.map((type, index) => (
                <button
                  key={index}
                  onClick={() => setBodyTypeIndex(index)}
                  style={bodyTypeIndex === index ? { borderColor: primaryColor, boxShadow: `0 0 0 2px ${primaryColor}` } : {}}
                  className={`relative aspect-[3/4] md:h-32 md:aspect-auto rounded-lg overflow-hidden border-2 transition-all ${
                    bodyTypeIndex === index
                      ? ''
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={type.image}
                    alt={type.label}
                    className="w-full h-full object-cover object-top"
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ajuste desejado
            </label>
            <div className="grid grid-cols-3 gap-2">
              {fitOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => setFitIndex(index)}
                  style={fitIndex === index ? { backgroundColor: primaryColor } : {}}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    fitIndex === index
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 p-4 flex gap-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          Voltar
        </button>
        <button
          onClick={handleSubmit}
          disabled={!height || !weight || bodyTypeIndex === null}
          style={!height || !weight || bodyTypeIndex === null ? {} : { backgroundColor: primaryColor }}
          className="flex-1 py-3 px-4 text-white rounded-lg hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-medium"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
