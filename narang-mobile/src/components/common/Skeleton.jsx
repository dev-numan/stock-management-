import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Card, useTheme } from 'react-native-paper';
import { appTheme } from '../../theme/paperTheme';

function SkeletonBox({ style, color = appTheme.colors.surfaceVariant }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.box, { backgroundColor: color }, style, { opacity }]} />;
}

export function SkeletonLine({ width = '100%', height = 14, style }) {
  return <SkeletonBox style={[{ width, height, borderRadius: 6 }, style]} />;
}

function SkeletonCardWrapper({ children, style }) {
  const theme = useTheme();
  return (
    <Card mode="elevated" style={[{ marginBottom: 16, borderRadius: theme.roundness }, style]}>
      <Card.Content>{children}</Card.Content>
    </Card>
  );
}

export function SkeletonCard({ children, style }) {
  return <SkeletonCardWrapper style={style}>{children}</SkeletonCardWrapper>;
}

function SkeletonListCard({ children, style }) {
  const theme = useTheme();
  return (
    <Card mode="elevated" style={[{ marginBottom: 12, borderRadius: theme.roundness }, style]}>
      <Card.Content>{children}</Card.Content>
    </Card>
  );
}

export function SaleListSkeleton({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListCard key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <SkeletonLine width="40%" height={16} />
            <SkeletonLine width="25%" height={16} />
          </View>
          <SkeletonLine width="55%" height={12} />
          <SkeletonLine width="35%" height={12} style={{ marginTop: 8 }} />
        </SkeletonListCard>
      ))}
    </>
  );
}

export function CustomerDetailSkeleton() {
  return (
    <View>
      <SkeletonCard>
        <SkeletonLine width="55%" height={24} style={{ marginBottom: 16 }} />
        <SkeletonLine width="25%" height={12} />
        <SkeletonLine width="45%" height={16} style={{ marginTop: 8, marginBottom: 16 }} />
        <SkeletonLine width="30%" height={12} />
        <SkeletonLine width="80%" height={16} style={{ marginTop: 8 }} />
      </SkeletonCard>
      <SkeletonCard>
        <SkeletonLine width="40%" height={18} style={{ marginBottom: 12 }} />
        <SkeletonLine width="70%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonLine width="60%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonLine width="75%" height={14} />
      </SkeletonCard>
      <SkeletonLine width="45%" height={20} style={{ marginBottom: 12 }} />
      <SaleListSkeleton count={4} />
    </View>
  );
}

export function CustomerListSkeleton({ count = 5 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListCard key={i} style={{ marginTop: i === 0 ? 8 : 0 }}>
          <SkeletonLine width="50%" height={16} style={{ marginBottom: 8 }} />
          <SkeletonLine width="35%" height={12} style={{ marginBottom: 6 }} />
          <SkeletonLine width="70%" height={12} />
        </SkeletonListCard>
      ))}
    </>
  );
}

export function ReportCardsSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <SkeletonCard key={i}>
          <SkeletonLine width="45%" height={18} style={{ marginBottom: 12 }} />
          <SkeletonLine width="80%" height={14} style={{ marginBottom: 8 }} />
          <SkeletonLine width="60%" height={14} style={{ marginBottom: 8 }} />
          <SkeletonLine width="70%" height={14} />
        </SkeletonCard>
      ))}
    </>
  );
}

export function DashboardSkeleton() {
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonListCard key={i} style={{ flex: 1, minWidth: '45%' }}>
            <SkeletonLine width="60%" height={12} style={{ marginBottom: 8 }} />
            <SkeletonLine width="80%" height={22} />
          </SkeletonListCard>
        ))}
      </View>
      <SkeletonCard>
        <SkeletonLine width="50%" height={18} style={{ marginBottom: 16 }} />
        <SkeletonBox style={{ height: 160, width: '100%', borderRadius: 12 }} />
      </SkeletonCard>
      <SkeletonLine width="40%" height={18} style={{ marginBottom: 12 }} />
      <SaleListSkeleton count={3} />
    </View>
  );
}

export function ProductListSkeleton({ count = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListCard key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <SkeletonLine width="60%" height={16} style={{ marginBottom: 8 }} />
              <SkeletonLine width="40%" height={12} />
            </View>
            <SkeletonLine width={28} height={28} />
          </View>
        </SkeletonListCard>
      ))}
    </>
  );
}

/** Compact rows for product search modal — matches ProductSearchModal row height. */
export function ProductSearchSkeleton({ count = 8 }) {
  const theme = useTheme();

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          mode="elevated"
          style={{ marginBottom: 8, borderRadius: theme.roundness }}
        >
          <Card.Content style={{ paddingVertical: 10 }}>
            <SkeletonLine width="55%" height={14} style={{ marginBottom: 6 }} />
            <SkeletonLine width="38%" height={11} />
          </Card.Content>
        </Card>
      ))}
    </>
  );
}

export function InvoiceSkeleton() {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16, backgroundColor: theme.colors.background, flex: 1 }}>
      <SkeletonCard>
        <SkeletonBox style={{ width: 80, height: 80, borderRadius: 40, alignSelf: 'center', marginBottom: 12 }} />
        <SkeletonLine width="60%" height={22} style={{ alignSelf: 'center', marginBottom: 8 }} />
        <SkeletonLine width="40%" height={14} style={{ alignSelf: 'center', marginBottom: 16 }} />
        <SkeletonLine width="50%" height={16} style={{ alignSelf: 'center' }} />
      </SkeletonCard>
      {[1, 2].map((i) => (
        <SkeletonListCard key={i}>
          <SkeletonLine width="55%" height={16} style={{ marginBottom: 8 }} />
          <SkeletonLine width="40%" height={12} />
        </SkeletonListCard>
      ))}
      <SkeletonCard>
        <SkeletonLine width="70%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonLine width="50%" height={20} />
      </SkeletonCard>
    </View>
  );
}

export function FormFieldsSkeleton({ rows = 3 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ marginBottom: 12 }}>
          <SkeletonLine width="30%" height={12} style={{ marginBottom: 8 }} />
          <SkeletonBox style={{ height: 48, width: '100%', borderRadius: 12 }} />
        </View>
      ))}
    </>
  );
}

export function SummarySkeleton() {
  return (
    <SkeletonCard style={{ marginBottom: 12 }}>
      <SkeletonLine width="35%" height={18} style={{ marginBottom: 12 }} />
      <SkeletonLine width="55%" height={14} style={{ marginBottom: 8 }} />
      <SkeletonLine width="50%" height={14} style={{ marginBottom: 8 }} />
      <SkeletonLine width="45%" height={14} />
    </SkeletonCard>
  );
}

const styles = StyleSheet.create({
  box: {},
});
