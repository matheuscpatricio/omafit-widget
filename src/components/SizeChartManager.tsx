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

export function SizeChartManager() {
  const { user } = useAuth();
  const [sizeChart, setSizeChart] = useState<SizeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sizeChartId, setSizeChartId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSizeChart();
    }
  }, [user]);

  const loadSizeChart = async () => {
    try {
      setLoading(true);

      const { data: charts, error: chartsError } = await supabase
        .from('size_charts')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (chartsError) throw chartsError;

      if (charts) {
        setSizeChartId(charts.id);

        const { data: entries, error: entriesError } = await supabase
          .from('size_chart_entries')
          .select('*')
          .eq('size_chart_id', charts.id)
          .order('order', { ascending: true });

        if (entriesError) throw entriesError;

        if (entries && entries.length > 0) {
          setSizeChart(entries.map(e => ({
            id: e.id,
            size_name: e.size_name,
            bust: e.bust.toString(),
            waist: e.waist.toString(),
            hips: e.hips.toString(),
            order: e.order
          })));
        } else {
          setSizeChart([createEmptyEntry(0)]);
        }
      } else {
        setSizeChart([createEmptyEntry(0)]);
      }
    } catch (error) {
      console.error('Error loading size chart:', error);
      setSizeChart([createEmptyEntry(0)]);
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

  const addEntry = () => {
    setSizeChart([...sizeChart, createEmptyEntry(sizeChart.length)]);
  };

  const removeEntry = (index: number) => {
    const newChart = sizeChart.filter((_, i) => i !== index);
    setSizeChart(newChart.map((entry, i) => ({ ...entry, order: i })));
  };

  const updateEntry = (index: number, field: keyof SizeEntry, value: string) => {
    const newChart = [...sizeChart];
    newChart[index] = { ...newChart[index], [field]: value };
    setSizeChart(newChart);
  };

  const saveSizeChart = async () => {
    try {
      setSaving(true);

      const validEntries = sizeChart.filter(
        e => e.size_name && e.bust && e.waist && e.hips
      );

      if (validEntries.length === 0) {
        alert('Por favor, preencha pelo menos um tamanho completo');
        return;
      }

      let chartId = sizeChartId;

      if (!chartId) {
        const { data: newChart, error: chartError } = await supabase
          .from('size_charts')
          .insert({ user_id: user?.id })
          .select()
          .single();

        if (chartError) throw chartError;
        chartId = newChart.id;
        setSizeChartId(chartId);
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

      alert('Tabela de medidas salva com sucesso!');
      loadSizeChart();
    } catch (error) {
      console.error('Error saving size chart:', error);
      alert('Erro ao salvar tabela de medidas');
    } finally {
      setSaving(false);
    }
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
            <h2 className="text-2xl font-bold text-gray-900">Insira sua Tabela</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure a tabela de medidas da sua loja para a calculadora de tamanhos
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
              {sizeChart.map((entry, index) => (
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
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
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
          className="mt-4 flex items-center gap-2 px-4 py-2 text-[#810707] border border-[#810707] rounded-lg hover:bg-red-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Tamanho
        </button>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Como medir:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li><strong>Busto:</strong> Medida da parte mais larga do peito</li>
            <li><strong>Cintura:</strong> Medida da parte mais estreita do tronco</li>
            <li><strong>Quadril:</strong> Medida da parte mais larga dos quadris</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
