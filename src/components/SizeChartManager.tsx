import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, GripVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface SizeEntry {
  id?: string;
  size_name: string;
  bust: string;
  waist: string;
  hips: string;
  order: number;
}

type Gender = 'male' | 'female' | 'unisex';

interface GenderChart {
  id: string | null;
  entries: SizeEntry[];
}

export function SizeChartManager() {
  const { user } = useAuth();
  const [selectedGenders, setSelectedGenders] = useState<Gender[]>(['unisex']);
  const [activeGender, setActiveGender] = useState<Gender>('unisex');
  const [charts, setCharts] = useState<Record<Gender, GenderChart>>({
    male: { id: null, entries: [] },
    female: { id: null, entries: [] },
    unisex: { id: null, entries: [] }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        .select('id, gender')
        .eq('user_id', user?.id);

      if (chartsError) throw chartsError;

      const newCharts: Record<Gender, GenderChart> = {
        male: { id: null, entries: [] },
        female: { id: null, entries: [] },
        unisex: { id: null, entries: [] }
      };

      const gendersWithData: Gender[] = [];

      if (chartsData && chartsData.length > 0) {
        for (const chart of chartsData) {
          const gender = chart.gender as Gender;
          newCharts[gender].id = chart.id;
          gendersWithData.push(gender);

          const { data: entries, error: entriesError } = await supabase
            .from('size_chart_entries')
            .select('*')
            .eq('size_chart_id', chart.id)
            .order('order', { ascending: true });

          if (entriesError) throw entriesError;

          if (entries && entries.length > 0) {
            newCharts[gender].entries = entries.map(e => ({
              id: e.id,
              size_name: e.size_name,
              bust: e.bust.toString(),
              waist: e.waist.toString(),
              hips: e.hips.toString(),
              order: e.order
            }));
          } else {
            newCharts[gender].entries = [createEmptyEntry(0)];
          }
        }

        setSelectedGenders(gendersWithData);
        setActiveGender(gendersWithData[0] || 'unisex');
      } else {
        setSelectedGenders(['unisex']);
        newCharts.unisex.entries = [createEmptyEntry(0)];
      }

      setCharts(newCharts);
    } catch (error) {
      console.error('Error loading size charts:', error);
      setCharts({
        male: { id: null, entries: [createEmptyEntry(0)] },
        female: { id: null, entries: [createEmptyEntry(0)] },
        unisex: { id: null, entries: [createEmptyEntry(0)] }
      });
    } finally {
      setLoading(false);
    }
  };

  const createEmptyEntry = (order: number): SizeEntry => ({
    size_name: '',
    bust: '',
    waist: '',
    hips: '',
    order
  });

  const handleGenderSelection = (gender: Gender, checked: boolean) => {
    if (checked) {
      const newGenders = [...selectedGenders, gender];
      setSelectedGenders(newGenders);
      setActiveGender(gender);
      if (charts[gender].entries.length === 0) {
        setCharts({
          ...charts,
          [gender]: { ...charts[gender], entries: [createEmptyEntry(0)] }
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

  const addEntry = () => {
    const currentEntries = charts[activeGender].entries;
    setCharts({
      ...charts,
      [activeGender]: {
        ...charts[activeGender],
        entries: [...currentEntries, createEmptyEntry(currentEntries.length)]
      }
    });
  };

  const removeEntry = (index: number) => {
    const currentEntries = charts[activeGender].entries;
    const newEntries = currentEntries.filter((_, i) => i !== index);
    setCharts({
      ...charts,
      [activeGender]: {
        ...charts[activeGender],
        entries: newEntries.map((entry, i) => ({ ...entry, order: i }))
      }
    });
  };

  const updateEntry = (index: number, field: keyof SizeEntry, value: string) => {
    const currentEntries = [...charts[activeGender].entries];
    currentEntries[index] = { ...currentEntries[index], [field]: value };
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
        const validEntries = charts[gender].entries.filter(
          e => e.size_name && e.bust && e.waist && e.hips
        );

        if (validEntries.length === 0) {
          alert(`Por favor, preencha pelo menos um tamanho completo para a tabela ${getGenderLabel(gender)}`);
          setSaving(false);
          return;
        }

        let chartId = charts[gender].id;

        if (!chartId) {
          const { data: newChart, error: chartError } = await supabase
            .from('size_charts')
            .insert({ user_id: user?.id, gender })
            .select()
            .single();

          if (chartError) throw chartError;
          chartId = newChart.id;

          setCharts(prev => ({
            ...prev,
            [gender]: { ...prev[gender], id: chartId }
          }));
        }

        const { error: deleteError } = await supabase
          .from('size_chart_entries')
          .delete()
          .eq('size_chart_id', chartId);

        if (deleteError) throw deleteError;

        const entries = validEntries.map((entry, index) => ({
          size_chart_id: chartId,
          size_name: entry.size_name,
          bust: parseFloat(entry.bust),
          waist: parseFloat(entry.waist),
          hips: parseFloat(entry.hips),
          order: index
        }));

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
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tabelas de Medidas</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure as tabelas de medidas por gênero para a calculadora de tamanhos
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
            Selecione os gêneros que deseja configurar:
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
                <span className="text-sm text-gray-700">{getGenderLabel(gender)}</span>
              </label>
            ))}
          </div>
        </div>

        {selectedGenders.length > 1 && (
          <div className="mb-6">
            <div className="flex gap-2 border-b border-gray-200">
              {selectedGenders.map(gender => (
                <button
                  key={gender}
                  onClick={() => setActiveGender(gender)}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeGender === gender
                      ? 'text-[#810707] border-b-2 border-[#810707]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {getGenderLabel(gender)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 w-8"></th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Tamanho</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Busto (cm)</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Cintura (cm)</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Quadril (cm)</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {charts[activeGender].entries.map((entry, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={entry.size_name}
                      onChange={(e) => updateEntry(index, 'size_name', e.target.value)}
                      placeholder="PP, P, M, G..."
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#810707] focus:border-transparent text-sm"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      value={entry.bust}
                      onChange={(e) => updateEntry(index, 'bust', e.target.value)}
                      placeholder="90"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#810707] focus:border-transparent text-sm"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      value={entry.waist}
                      onChange={(e) => updateEntry(index, 'waist', e.target.value)}
                      placeholder="70"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#810707] focus:border-transparent text-sm"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      value={entry.hips}
                      onChange={(e) => updateEntry(index, 'hips', e.target.value)}
                      placeholder="96"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#810707] focus:border-transparent text-sm"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => removeEntry(index)}
                      className="text-red-500 hover:text-red-700 p-1"
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
          className="mt-4 flex items-center gap-2 px-4 py-2 text-sm text-[#810707] border border-[#810707] rounded-lg hover:bg-red-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Linha
        </button>
      </div>
    </div>
  );
}
