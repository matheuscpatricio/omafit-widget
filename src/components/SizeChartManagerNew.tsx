import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface SizeEntry {
  id?: string;
  size_name: string;
  measurements: { [key: string]: string };
  order: number;
}

type Gender = 'male' | 'female' | 'unisex';

interface GenderChart {
  id: string | null;
  entries: SizeEntry[];
  measurementNames: string[];
}

const AVAILABLE_MEASUREMENTS = [
  'Busto',
  'Cintura',
  'Quadril',
  'Comprimento',
  'Tornozelo',
  'Ombro',
  'Manga',
  'Coxa',
  'Panturrilha'
];

export function SizeChartManagerNew() {
  const { user } = useAuth();
  const [selectedGenders, setSelectedGenders] = useState<Gender[]>(['unisex']);
  const [activeGender, setActiveGender] = useState<Gender>('unisex');
  const [charts, setCharts] = useState<Record<Gender, GenderChart>>({
    male: { id: null, entries: [], measurementNames: ['Busto', 'Cintura', 'Quadril'] },
    female: { id: null, entries: [], measurementNames: ['Busto', 'Cintura', 'Quadril'] },
    unisex: { id: null, entries: [], measurementNames: ['Busto', 'Cintura', 'Quadril'] }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMeasurementConfig, setShowMeasurementConfig] = useState(false);

  useEffect(() => {
    if (user) {
      loadSizeCharts();
    }
  }, [user]);

  const loadSizeCharts = async () => {
    try {
      setLoading(true);

      const { data: chartsData, error: chartsError } = await supabase
        .from('size_charts')
        .select('id, gender, measurement_names')
        .eq('user_id', user?.id)
        .is('collection_id', null);

      if (chartsError) throw chartsError;

      const newCharts: Record<Gender, GenderChart> = {
        male: { id: null, entries: [], measurementNames: ['Busto', 'Cintura', 'Quadril'] },
        female: { id: null, entries: [], measurementNames: ['Busto', 'Cintura', 'Quadril'] },
        unisex: { id: null, entries: [], measurementNames: ['Busto', 'Cintura', 'Quadril'] }
      };

      const gendersWithData: Gender[] = [];

      if (chartsData && chartsData.length > 0) {
        for (const chart of chartsData) {
          const gender = chart.gender as Gender;
          newCharts[gender].id = chart.id;

          if (chart.measurement_names && Array.isArray(chart.measurement_names)) {
            newCharts[gender].measurementNames = chart.measurement_names;
          }

          gendersWithData.push(gender);

          const { data: entries, error: entriesError } = await supabase
            .from('size_chart_entries')
            .select('*')
            .eq('size_chart_id', chart.id)
            .order('order', { ascending: true });

          if (entriesError) throw entriesError;

          if (entries && entries.length > 0) {
            newCharts[gender].entries = entries.map(e => {
              const measurements: { [key: string]: string } = {};

              if (e.measurements) {
                Object.keys(e.measurements).forEach(key => {
                  measurements[key] = e.measurements[key].toString();
                });
              } else {
                measurements['medida1'] = e.bust?.toString() || '';
                measurements['medida2'] = e.waist?.toString() || '';
                measurements['medida3'] = e.hips?.toString() || '';
              }

              return {
                id: e.id,
                size_name: e.size_name,
                measurements,
                order: e.order
              };
            });
          } else {
            newCharts[gender].entries = [createEmptyEntry(0, newCharts[gender].measurementNames)];
          }
        }

        setSelectedGenders(gendersWithData);
        setActiveGender(gendersWithData[0] || 'unisex');
      } else {
        setSelectedGenders(['unisex']);
        newCharts.unisex.entries = [createEmptyEntry(0, ['Busto', 'Cintura', 'Quadril'])];
      }

      setCharts(newCharts);
    } catch (error) {
      console.error('Error loading size charts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEmptyEntry = (order: number, measurementNames: string[]): SizeEntry => {
    const measurements: { [key: string]: string } = {};
    measurementNames.forEach((_, index) => {
      measurements[`medida${index + 1}`] = '';
    });

    return {
      size_name: '',
      measurements,
      order
    };
  };

  const handleGenderSelection = (gender: Gender, checked: boolean) => {
    if (checked) {
      const newGenders = [...selectedGenders, gender];
      setSelectedGenders(newGenders);
      setActiveGender(gender);
      if (charts[gender].entries.length === 0) {
        setCharts({
          ...charts,
          [gender]: {
            ...charts[gender],
            entries: [createEmptyEntry(0, charts[gender].measurementNames)]
          }
        });
      }
    } else {
      const newGenders = selectedGenders.filter(g => g !== gender);
      if (newGenders.length === 0) {
        alert('Você precisa ter pelo menos uma tabela de medidas');
        return;
      }
      setSelectedGenders(newGenders);
      if (activeGender === gender) {
        setActiveGender(newGenders[0]);
      }
    }
  };

  const updateMeasurementNames = (gender: Gender, newNames: string[]) => {
    if (newNames.length !== 3) {
      alert('Você deve selecionar exatamente 3 medidas');
      return;
    }

    const existingEntries = charts[gender].entries;
    const newEntries = existingEntries.map(entry => {
      const oldMeasurements = entry.measurements;
      const newMeasurements: { [key: string]: string } = {};

      newNames.forEach((_, index) => {
        const oldKey = `medida${index + 1}`;
        newMeasurements[oldKey] = oldMeasurements[oldKey] || '';
      });

      return {
        ...entry,
        measurements: newMeasurements
      };
    });

    setCharts({
      ...charts,
      [gender]: {
        ...charts[gender],
        measurementNames: newNames,
        entries: newEntries
      }
    });
  };

  const addEntry = () => {
    const currentEntries = charts[activeGender].entries;
    setCharts({
      ...charts,
      [activeGender]: {
        ...charts[activeGender],
        entries: [...currentEntries, createEmptyEntry(currentEntries.length, charts[activeGender].measurementNames)]
      }
    });
  };

  const removeEntry = (index: number) => {
    const currentEntries = charts[activeGender].entries;
    if (currentEntries.length === 1) {
      alert('Você deve ter pelo menos uma linha');
      return;
    }
    const newEntries = currentEntries.filter((_, i) => i !== index);
    setCharts({
      ...charts,
      [activeGender]: {
        ...charts[activeGender],
        entries: newEntries.map((entry, i) => ({ ...entry, order: i }))
      }
    });
  };

  const updateEntry = (index: number, field: string, value: string) => {
    const currentEntries = [...charts[activeGender].entries];

    if (field === 'size_name') {
      currentEntries[index] = { ...currentEntries[index], size_name: value };
    } else {
      currentEntries[index] = {
        ...currentEntries[index],
        measurements: {
          ...currentEntries[index].measurements,
          [field]: value
        }
      };
    }

    setCharts({
      ...charts,
      [activeGender]: {
        ...charts[activeGender],
        entries: currentEntries
      }
    });
  };

  const saveSizeChart = async () => {
    try {
      setSaving(true);

      for (const gender of selectedGenders) {
        const validEntries = charts[gender].entries.filter(e => {
          if (!e.size_name) return false;

          const hasAllMeasurements = Object.values(e.measurements).every(v => v !== '');
          return hasAllMeasurements;
        });

        if (validEntries.length === 0) {
          alert(`Por favor, preencha pelo menos um tamanho completo para a tabela ${getGenderLabel(gender)}`);
          setSaving(false);
          return;
        }

        let chartId = charts[gender].id;

        if (!chartId) {
          const { data: newChart, error: chartError } = await supabase
            .from('size_charts')
            .insert({
              user_id: user?.id,
              gender,
              measurement_names: charts[gender].measurementNames
            })
            .select()
            .single();

          if (chartError) throw chartError;
          chartId = newChart.id;

          setCharts(prev => ({
            ...prev,
            [gender]: { ...prev[gender], id: chartId }
          }));
        } else {
          const { error: updateError } = await supabase
            .from('size_charts')
            .update({ measurement_names: charts[gender].measurementNames })
            .eq('id', chartId);

          if (updateError) throw updateError;
        }

        const { error: deleteError } = await supabase
          .from('size_chart_entries')
          .delete()
          .eq('size_chart_id', chartId);

        if (deleteError) throw deleteError;

        const entries = validEntries.map((entry, index) => {
          const measurements: { [key: string]: number } = {};
          Object.keys(entry.measurements).forEach(key => {
            measurements[key] = parseFloat(entry.measurements[key]);
          });

          return {
            size_chart_id: chartId,
            size_name: entry.size_name,
            measurements,
            measurement_labels: charts[gender].measurementNames,
            order: index
          };
        });

        const { error: insertError } = await supabase
          .from('size_chart_entries')
          .insert(entries);

        if (insertError) throw insertError;
      }

      alert('Tabelas de medidas salvas com sucesso!');
      loadSizeCharts();
    } catch (error) {
      console.error('Error saving size chart:', error);
      alert('Erro ao salvar tabelas de medidas');
    } finally {
      setSaving(false);
    }
  };

  const getGenderLabel = (gender: Gender): string => {
    const labels: Record<Gender, string> = {
      male: 'Masculino',
      female: 'Feminino',
      unisex: 'Unissex'
    };
    return labels[gender];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tabelas de Medidas</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure as tabelas de medidas por gênero
            </p>
          </div>
          <button
            onClick={saveSizeChart}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#810707] text-white rounded-lg hover:bg-[#a00909] disabled:bg-gray-400 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Selecione os gêneros:
          </label>
          <div className="flex gap-4">
            {(['male', 'female', 'unisex'] as Gender[]).map(gender => (
              <label key={gender} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedGenders.includes(gender)}
                  onChange={(e) => handleGenderSelection(gender, e.target.checked)}
                  className="w-4 h-4 text-[#810707] border-gray-300 rounded focus:ring-[#810707]"
                />
                <span className="text-gray-700">{getGenderLabel(gender)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-2">
            {selectedGenders.map(gender => (
              <button
                key={gender}
                onClick={() => setActiveGender(gender)}
                className={`px-4 py-2 border-b-2 transition-colors ${
                  activeGender === gender
                    ? 'border-[#810707] text-[#810707] font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {getGenderLabel(gender)}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-blue-900 mb-2">
                Medidas configuradas: {charts[activeGender].measurementNames.join(', ')}
              </h3>
              <p className="text-sm text-blue-700">
                Você pode escolher qualquer combinação de 3 medidas para esta tabela
              </p>
            </div>
            <button
              onClick={() => setShowMeasurementConfig(!showMeasurementConfig)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Alterar
            </button>
          </div>

          {showMeasurementConfig && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-3">
                Selecione exatamente 3 medidas:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {AVAILABLE_MEASUREMENTS.map(measurement => {
                  const isSelected = charts[activeGender].measurementNames.includes(measurement);
                  const currentCount = charts[activeGender].measurementNames.length;

                  return (
                    <label
                      key={measurement}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer border-2 transition-colors ${
                        isSelected
                          ? 'bg-blue-100 border-blue-600'
                          : 'bg-white border-gray-300 hover:border-blue-400'
                      } ${!isSelected && currentCount >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!isSelected && currentCount >= 3}
                        onChange={(e) => {
                          const newNames = e.target.checked
                            ? [...charts[activeGender].measurementNames, measurement]
                            : charts[activeGender].measurementNames.filter(m => m !== measurement);

                          if (newNames.length <= 3) {
                            updateMeasurementNames(activeGender, newNames);
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{measurement}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Tamanho
                </th>
                {charts[activeGender].measurementNames.map((name, index) => (
                  <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {name} (cm)
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {charts[activeGender].entries.map((entry, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={entry.size_name}
                      onChange={(e) => updateEntry(index, 'size_name', e.target.value)}
                      placeholder="PP, P, M, G..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent"
                    />
                  </td>
                  {charts[activeGender].measurementNames.map((_, measurementIndex) => (
                    <td key={measurementIndex} className="px-4 py-3">
                      <input
                        type="number"
                        step="0.1"
                        value={entry.measurements[`medida${measurementIndex + 1}`]}
                        onChange={(e) => updateEntry(index, `medida${measurementIndex + 1}`, e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => removeEntry(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover linha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={addEntry}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-[#810707] border border-[#810707] rounded-lg hover:bg-[#810707] hover:text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Tamanho
        </button>
      </div>
    </div>
  );
}
