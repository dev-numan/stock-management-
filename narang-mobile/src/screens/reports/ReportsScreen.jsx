import React, { useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getSalesSummary, getProfitLoss, getStockValuation } from '../../api/reports.api';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPeriodQueryParams, getPeriodLabel } from '../../utils/formatDate';
import { exportReportPdf } from '../../utils/generateReportPDF';
import AppCard from '../../components/common/AppCard';
import AppButton from '../../components/common/AppButton';
import { ReportCardsSkeleton } from '../../components/common/Skeleton';
import ErrorMessage from '../../components/common/ErrorMessage';
import PeriodFilter from '../../components/common/PeriodFilter';

const now = new Date();

export default function ReportsScreen() {
  const theme = useTheme();
  const [summary, setSummary] = useState(null);
  const [profitLoss, setProfitLoss] = useState(null);
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('all');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [exporting, setExporting] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = getPeriodQueryParams(mode, year, month);
      const [s, p, st] = await Promise.all([
        getSalesSummary(params),
        getProfitLoss(params),
        getStockValuation(),
      ]);
      setSummary(s.data.data);
      setProfitLoss(p.data.data);
      setStock(st.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [mode, year, month]);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const periodLabel = getPeriodLabel(mode, year, month);

  const handleExportPdf = async () => {
    if (!summary || !profitLoss || !stock) return;
    try {
      setExporting(true);
      setError(null);
      await exportReportPdf({ summary, profitLoss, stock, periodLabel });
    } catch (err) {
      setError(err.message || 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const showSkeleton = loading && !summary;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingTop: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadReports} />}
    >
      <Text variant="headlineSmall" style={{ fontWeight: '700', marginBottom: 12 }}>
        Reports
      </Text>
      <PeriodFilter
        mode={mode}
        year={year}
        month={month}
        onModeChange={setMode}
        onYearChange={setYear}
        onMonthChange={setMonth}
        summaryText={showSkeleton ? 'Loading reports...' : `Showing: ${periodLabel}`}
      />
      <ErrorMessage message={error} />
      {showSkeleton ? (
        <ReportCardsSkeleton />
      ) : (
        <>
      <AppCard>
        <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 4 }}>Sales Summary</Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>{periodLabel}</Text>
        <Text variant="bodyLarge">Total Sales: {formatCurrency(summary?.totalSales)}</Text>
        <Text variant="bodyLarge">Count: {summary?.salesCount ?? 0}</Text>
        <Text variant="bodyLarge">Cash: {formatCurrency(summary?.cashSales)}</Text>
        <Text variant="bodyLarge">Credit: {formatCurrency(summary?.creditSales)}</Text>
      </AppCard>
      <AppCard>
        <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 4 }}>Profit & Loss</Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>{periodLabel}</Text>
        <Text variant="bodyLarge">Revenue: {formatCurrency(profitLoss?.revenue)}</Text>
        <Text variant="bodyLarge">COGS: {formatCurrency(profitLoss?.cogs)}</Text>
        <Text variant="bodyLarge">Gross Profit: {formatCurrency(profitLoss?.grossProfit)}</Text>
        <Text variant="bodyLarge">Expenses: {formatCurrency(profitLoss?.expenses)}</Text>
        <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '700', marginTop: 4 }}>
          Net Profit: {formatCurrency(profitLoss?.netProfit)}
        </Text>
      </AppCard>
      <AppCard>
        <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 4 }}>Stock Valuation</Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>Current stock (not filtered by date)</Text>
        <Text variant="bodyLarge">Cost Value: {formatCurrency(stock?.totalCostValue)}</Text>
        <Text variant="bodyLarge">Sale Value: {formatCurrency(stock?.totalSaleValue)}</Text>
      </AppCard>
      <AppButton
        title="Save & export PDF"
        onPress={handleExportPdf}
        loading={exporting}
        disabled={!summary || loading}
        style={{ marginBottom: 32 }}
      />
        </>
      )}
    </ScrollView>
  );
}
