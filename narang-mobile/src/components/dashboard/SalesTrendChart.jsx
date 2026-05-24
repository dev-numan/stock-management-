import React, { useState, useEffect, useCallback } from 'react';
import { View, Dimensions } from 'react-native';
import { Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { LineChart } from 'react-native-gifted-charts';
import AppCard from '../common/AppCard';
import ErrorMessage from '../common/ErrorMessage';
import PeriodFilter from '../common/PeriodFilter';
import { formatCurrency, formatCurrencyCompact } from '../../utils/formatCurrency';
import { useDashboardStore } from '../../stores/dashboardStore';

const CHART_HEIGHT = 200;
const H_PADDING = 48;

export default function SalesTrendChart() {
  const theme = useTheme();
  const now = new Date();
  const [mode, setMode] = useState('month');
  const [year, setYear] = useState(now.getFullYear());
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSalesTrend = useDashboardStore((s) => s.fetchSalesTrend);
  const trendLoading = useDashboardStore((s) => s.trendLoading);

  const chartWidth = Dimensions.get('window').width - H_PADDING;

  const loadTrend = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSalesTrend(mode, year, false);
      setTrend(data);
    } catch (err) {
      setTrend(null);
      setError(err.response?.data?.message || 'Failed to load sales chart');
    } finally {
      setLoading(false);
    }
  }, [mode, year, fetchSalesTrend]);

  useEffect(() => {
    loadTrend();
  }, [loadTrend]);

  const values = trend?.values ?? [];
  const labels = trend?.labels ?? [];
  const maxValue = Math.max(...values, 1);
  const chartMax = maxValue * 1.15;

  const lineData = values.map((value, index) => ({
    value,
    label: labels[index] ?? '',
    dataPointText: value > 0 ? formatCurrencyCompact(value) : '',
  }));

  const summaryText =
    mode === 'year'
      ? `${year - 4}–${year} · Total ${formatCurrency(trend?.total)}`
      : `${year} · Total ${formatCurrency(trend?.total)}`;

  return (
    <AppCard>
      <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 4 }}>
        Sales trend
      </Text>
      <PeriodFilter
        compact
        title=""
        modes={['month', 'year']}
        showMonthPicker={false}
        mode={mode}
        year={year}
        month={1}
        onModeChange={setMode}
        onYearChange={setYear}
        onMonthChange={() => {}}
        summaryText={trend ? summaryText : ''}
      />
      <ErrorMessage message={error} />
      {loading || trendLoading ? (
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          <ActivityIndicator animating size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <View style={{ alignItems: 'center', marginTop: 8, overflow: 'hidden' }}>
          {values.every((v) => v === 0) ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 32 }}>
              No sales in this period
            </Text>
          ) : (
            <LineChart
              data={lineData}
              width={chartWidth}
              height={CHART_HEIGHT}
              spacing={mode === 'month' ? Math.max(chartWidth / 13, 18) : Math.max(chartWidth / (values.length + 1), 36)}
              initialSpacing={12}
              endSpacing={12}
              color={theme.colors.primary}
              thickness={2}
              curved
              areaChart
              startFillColor={theme.colors.primary}
              endFillColor={theme.colors.primary}
              startOpacity={0.2}
              endOpacity={0.02}
              hideDataPoints={mode === 'month'}
              dataPointsColor={theme.colors.primary}
              dataPointsRadius={4}
              maxValue={chartMax}
              noOfSections={4}
              yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 9 }}
              formatYLabel={(v) => formatCurrencyCompact(v)}
              rulesColor={theme.colors.outlineVariant}
              yAxisColor={theme.colors.outlineVariant}
              xAxisColor={theme.colors.outlineVariant}
            />
          )}
        </View>
      )}
    </AppCard>
  );
}
