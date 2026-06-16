import React, { useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getSalesSummary, getProfitLoss, getStockValuation } from '../../api/reports.api';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPeriodQueryParams, getPeriodLabel } from '../../utils/formatDate';
import { exportReportPdf } from '../../utils/generateReportPDF';
import { getIsOnline } from '../../stores/networkStore';
import { useOfflineCacheStore, reportPeriodKey } from '../../stores/offlineCacheStore';
import AppCard from '../../components/common/AppCard';
import AppButton from '../../components/common/AppButton';
import { ReportCardsSkeleton } from '../../components/common/Skeleton';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getFriendlyErrorMessage } from '../../utils/apiErrors';
import PeriodFilter from '../../components/common/PeriodFilter';
import { useTranslation } from '../../i18n/useTranslation';

const now = new Date();

export default function ReportsScreen() {
  const theme = useTheme();
  const { t, isRtl } = useTranslation();
  const textDir = { writingDirection: isRtl ? 'rtl' : 'ltr' };
  const [summary, setSummary] = useState(null);
  const [profitLoss, setProfitLoss] = useState(null);
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('all');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [day, setDay] = useState(now.getDate());
  const [exporting, setExporting] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = getPeriodQueryParams(mode, year, month, day);
      const periodKey = reportPeriodKey(mode, year, month, day);

      if (!getIsOnline()) {
        const cached = useOfflineCacheStore.getState().getReportsBundle(periodKey);
        const stockCached = useOfflineCacheStore.getState().getStockValuation();
        if (cached?.summary && cached?.profitLoss && stockCached) {
          setSummary(cached.summary);
          setProfitLoss(cached.profitLoss);
          setStock(stockCached);
          return;
        }
        setError(t('profit.offlineNoCache'));
        return;
      }

      setSummary(null);
      setProfitLoss(null);
      setStock(null);
      const [s, p, st] = await Promise.all([
        getSalesSummary(params),
        getProfitLoss(params),
        getStockValuation(),
      ]);
      const summaryData = s.data.data;
      const profitData = p.data.data;
      const stockData = st.data.data;
      setSummary(summaryData);
      setProfitLoss(profitData);
      setStock(stockData);
      useOfflineCacheStore.getState().setReportsBundle(periodKey, {
        summary: summaryData,
        profitLoss: profitData,
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('reports.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [mode, year, month, day, t]);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const periodLabel = getPeriodLabel(mode, year, month, day);

  const handleExportPdf = async () => {
    if (!summary || !profitLoss || !stock) return;
    try {
      setExporting(true);
      setError(null);
      await exportReportPdf({ summary, profitLoss, stock, periodLabel });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, t('reports.exportFailed')));
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
        {t('reports.title')}
      </Text>
      <PeriodFilter
        mode={mode}
        year={year}
        month={month}
        day={day}
        onModeChange={setMode}
        onYearChange={setYear}
        onMonthChange={setMonth}
        onDayChange={setDay}
        summaryText={showSkeleton ? t('reports.loading') : t('reports.showing', { period: periodLabel })}
      />
      <ErrorMessage message={error} />
      {showSkeleton ? (
        <ReportCardsSkeleton />
      ) : (
        <>
      <AppCard>
        <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 4, ...textDir }}>{t('reports.salesSummary')}</Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>{periodLabel}</Text>
        <Text variant="bodyLarge" style={textDir}>{t('reports.totalSales')} {formatCurrency(summary?.totalSales)}</Text>
        <Text variant="bodyLarge" style={textDir}>{t('reports.count')} {summary?.salesCount ?? 0}</Text>
        <Text variant="bodyLarge" style={textDir}>{t('reports.cash')} {formatCurrency(summary?.cashSales)}</Text>
        <Text variant="bodyLarge" style={textDir}>{t('reports.credit')} {formatCurrency(summary?.creditSales)}</Text>
      </AppCard>
      <AppCard>
        <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 4, ...textDir }}>{t('reports.profitLoss')}</Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>{periodLabel}</Text>
        <Text variant="bodyLarge" style={textDir}>{t('reports.revenue')} {formatCurrency(profitLoss?.revenue)}</Text>
        <Text variant="bodyLarge" style={textDir}>{t('profit.cogs')} {formatCurrency(profitLoss?.cogs)}</Text>
        <Text variant="bodyLarge" style={textDir}>{t('reports.grossProfit')} {formatCurrency(profitLoss?.grossProfit)}</Text>
        <Text variant="bodyLarge" style={textDir}>{t('profit.expenses')} {formatCurrency(profitLoss?.expenses)}</Text>
        <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '700', marginTop: 4, ...textDir }}>
          {t('reports.netProfit')} {formatCurrency(profitLoss?.netProfit)}
        </Text>
      </AppCard>
      <AppCard>
        <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 4, ...textDir }}>{t('reports.stockValuation')}</Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, ...textDir }}>{t('reports.stockNote')}</Text>
        <Text variant="bodyLarge" style={textDir}>{t('reports.costValue')} {formatCurrency(stock?.totalCostValue)}</Text>
        <Text variant="bodyLarge" style={textDir}>{t('reports.saleValue')} {formatCurrency(stock?.totalSaleValue)}</Text>
      </AppCard>
      <AppButton
        title={t('reports.exportPdf')}
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
