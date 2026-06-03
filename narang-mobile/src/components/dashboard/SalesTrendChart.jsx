import React, { useState, useEffect, useCallback } from 'react';
import { View, Dimensions } from 'react-native';
import { Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { LineChart } from 'react-native-gifted-charts';
import AppCard from '../common/AppCard';
import ErrorMessage from '../common/ErrorMessage';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import PeriodFilter from '../common/PeriodFilter';
import { formatCurrency, formatCurrencyCompact } from '../../utils/formatCurrency';
import { useDashboardStore } from '../../stores/dashboardStore';
import { getIsOnline } from '../../stores/networkStore';
import { useTranslation } from '../../i18n/useTranslation';

const CHART_HEIGHT = 200;
const H_PADDING = 48;
const PROFIT_LINE_COLOR = '#2563EB';

export default function SalesTrendChart() {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const now = new Date();
  const [mode, setMode] = useState('month');
  const [year, setYear] = useState(now.getFullYear());
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSalesTrend = useDashboardStore((s) => s.fetchSalesTrend);
  const trendLoading = useDashboardStore((s) => s.trendLoading);
  const trendVersion = useDashboardStore((s) => s.trendVersion);

  const chartWidth = Dimensions.get('window').width - H_PADDING;

  const loadTrend = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSalesTrend(mode, year, false);
      setTrend(data);
      if (!data && getIsOnline()) {
        setError(t('chart.loadFailed'));
      }
    } catch (err) {
      setTrend(null);
      setError(getFriendlyErrorMessage(err, t('chart.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [mode, year, fetchSalesTrend, trendVersion, t]);

  useEffect(() => {
    loadTrend();
  }, [loadTrend]);

  const values = trend?.values ?? [];
  const profitValues = trend?.profitValues ?? [];
  const labels = trend?.labels ?? [];
  const allSeries = [...values, ...profitValues];
  const chartMin = Math.min(...allSeries, 0);
  const chartMax = Math.max(...allSeries, 1) * 1.15;

  const lineData = values.map((value, index) => ({
    value,
    label: labels[index] ?? '',
    dataPointText: value > 0 ? formatCurrencyCompact(value) : '',
  }));

  const profitLineData = profitValues.map((value, index) => ({
    value,
    label: labels[index] ?? '',
    dataPointText: value !== 0 ? formatCurrencyCompact(value) : '',
  }));

  const hasChartData =
    values.some((v) => v !== 0) || profitValues.some((v) => v !== 0);

  const salesTotal =
    trend?.total ?? (trend?.values ?? []).reduce((sum, v) => sum + Number(v || 0), 0);
  const grossProfitTotal =
    trend?.profitTotal ?? (trend?.profitValues ?? []).reduce((sum, v) => sum + Number(v || 0), 0);

  const rangeLabel = mode === 'year' ? `${year - 4}–${year}` : String(year);
  const summaryText = trend
    ? t('chart.summary', {
        range: rangeLabel,
        sales: formatCurrency(salesTotal),
        profit: formatCurrency(grossProfitTotal),
      })
    : '';

  return (
    <AppCard>
      <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 4, ...textDir }}>
        {t('chart.salesTrend')}
      </Text>
      <PeriodFilter
        compact
        title=""
        modes={['month', 'year']}
        showMonthPicker={false}
        defaultMode="month"
        mode={mode}
        year={year}
        month={1}
        onModeChange={setMode}
        onYearChange={setYear}
        onMonthChange={() => {}}
        summaryText={summaryText}
      />
      <ErrorMessage message={error} />
      {trend && hasChartData ? (
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 12,
                height: 3,
                borderRadius: 2,
                backgroundColor: theme.colors.primary,
              }}
            />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, ...textDir }}>
              {t('chart.sales')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 12,
                height: 3,
                borderRadius: 2,
                backgroundColor: PROFIT_LINE_COLOR,
              }}
            />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, ...textDir }}>
              {t('chart.grossProfit')}
            </Text>
          </View>
        </View>
      ) : null}
      {loading || trendLoading ? (
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          <ActivityIndicator animating size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <View style={{ alignItems: 'center', marginTop: 8, overflow: 'hidden' }}>
          {!hasChartData ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 32, ...textDir }}>
              {t('chart.noSales')}
            </Text>
          ) : (
            <LineChart
              data={lineData}
              data2={profitLineData}
              width={chartWidth}
              height={CHART_HEIGHT}
              spacing={mode === 'month' ? Math.max(chartWidth / 13, 18) : Math.max(chartWidth / (values.length + 1), 36)}
              initialSpacing={12}
              endSpacing={12}
              color={theme.colors.primary}
              color2={PROFIT_LINE_COLOR}
              thickness={2}
              thickness2={2}
              curved
              curved2
              areaChart
              startFillColor={theme.colors.primary}
              endFillColor={theme.colors.primary}
              startOpacity={0.2}
              endOpacity={0.02}
              hideDataPoints={mode === 'month'}
              hideDataPoints2={mode === 'month'}
              dataPointsColor={theme.colors.primary}
              dataPointsColor2={PROFIT_LINE_COLOR}
              dataPointsRadius={4}
              dataPointsRadius2={4}
              maxValue={chartMax}
              minValue={chartMin < 0 ? chartMin * 1.15 : undefined}
              noOfSections={4}
              noOfSectionsBelowXAxis={chartMin < 0 ? 2 : 0}
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
