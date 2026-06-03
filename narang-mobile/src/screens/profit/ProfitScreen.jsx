import React, { useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Text, Divider, ActivityIndicator, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-gifted-charts';
import { getProfitReport } from '../../api/reports.api';
import { formatCurrency, formatCurrencyCompact } from '../../utils/formatCurrency';
import { getPeriodLabel, getPeriodQueryParams } from '../../utils/formatDate';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import AppCard from '../../components/common/AppCard';
import { ReportCardsSkeleton } from '../../components/common/Skeleton';
import ErrorMessage from '../../components/common/ErrorMessage';
import PeriodFilter from '../../components/common/PeriodFilter';
import { useTranslation } from '../../i18n/useTranslation';

const now = new Date();
const CHART_HEIGHT = 180;
const H_PADDING = 48;

export default function ProfitScreen() {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };

  const breakdownTitle = (mode) => {
    if (mode === 'month') return t('profit.breakdownDay');
    if (mode === 'year') return t('profit.breakdownMonth');
    if (mode === 'all') return t('profit.breakdownYear');
    return null;
  };
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [day, setDay] = useState(now.getDate());

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await getProfitReport({
        mode,
        year,
        month,
        day,
        ...getPeriodQueryParams(mode, year, month, day),
      });
      setReport(data.data);
    } catch (err) {
      setReport(null);
      setError(getFriendlyErrorMessage(err, t('profit.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [mode, year, month, day, t]);

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [loadReport])
  );

  const periodLabel = getPeriodLabel(mode, year, month, day);
  const summary = report?.summary;
  const breakdown = report?.breakdown ?? [];
  const showSkeleton = loading && !report;
  const chartWidth = Dimensions.get('window').width - H_PADDING;

  const values = breakdown.map((row) => row.netProfit);
  const maxValue = Math.max(...values, 1);
  const chartMax = maxValue * 1.15;
  const lineData = breakdown.map((row) => ({
    value: row.netProfit,
    label: row.label,
    dataPointText: row.netProfit !== 0 ? formatCurrencyCompact(row.netProfit) : '',
  }));

  const summaryText = showSkeleton
    ? t('profit.loading')
    : t('profit.summary', { period: periodLabel, amount: formatCurrency(summary?.netProfit) });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingTop: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadReport} />}
    >
      <PeriodFilter
        mode={mode}
        year={year}
        month={month}
        day={day}
        defaultMode="month"
        onModeChange={setMode}
        onYearChange={setYear}
        onMonthChange={setMonth}
        onDayChange={setDay}
        summaryText={summaryText}
      />
      <ErrorMessage message={error} />

      {showSkeleton ? (
        <ReportCardsSkeleton />
      ) : (
        <>
          <AppCard>
            <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 4 }}>
              {t('profit.summaryTitle')}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
              {periodLabel}
            </Text>
            <Text variant="bodyLarge" style={textDir}>{t('profit.revenue')} {formatCurrency(summary?.revenue)}</Text>
            <Text variant="bodyLarge" style={textDir}>{t('profit.cogs')} {formatCurrency(summary?.cogs)}</Text>
            <Text variant="bodyLarge" style={textDir}>{t('profit.grossProfit')} {formatCurrency(summary?.grossProfit)}</Text>
            <Text variant="bodyLarge" style={textDir}>{t('profit.expenses')} {formatCurrency(summary?.expenses)}</Text>
            <Divider style={{ marginVertical: 12 }} />
            <Text
              variant="titleLarge"
              style={{
                color: (summary?.netProfit ?? 0) >= 0 ? theme.colors.primary : theme.colors.error,
                fontWeight: '700',
              }}
            >
              {t('profit.netProfit')} {formatCurrency(summary?.netProfit)}
            </Text>
          </AppCard>

          {breakdown.length > 0 ? (
            <AppCard>
              <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 4 }}>
                {breakdownTitle(mode)}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                {periodLabel}
              </Text>

              {loading ? (
                <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                  <ActivityIndicator animating color={theme.colors.primary} />
                </View>
              ) : values.every((v) => v === 0) ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 16 }}>
                  {t('profit.emptyChart')}
                </Text>
              ) : (
                <View style={{ alignItems: 'center', marginBottom: 16, overflow: 'hidden' }}>
                  <LineChart
                    data={lineData}
                    width={chartWidth}
                    height={CHART_HEIGHT}
                    spacing={Math.max(chartWidth / (values.length + 1), mode === 'month' ? 14 : 28)}
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
                    hideDataPoints={mode === 'month' && values.length > 10}
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
                </View>
              )}

              {breakdown.map((row, index) => (
                <View key={`${row.key}-${index}`}>
                  {index > 0 ? <Divider style={{ marginVertical: 8 }} /> : null}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                      {row.label}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={{
                        fontWeight: '700',
                        color: row.netProfit >= 0 ? theme.colors.primary : theme.colors.error,
                      }}
                    >
                      {formatCurrency(row.netProfit)}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    {t('profit.breakdownRow', {
                      revenue: formatCurrency(row.revenue),
                      expenses: formatCurrency(row.expenses),
                    })}
                  </Text>
                </View>
              ))}
            </AppCard>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
