import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { stackScreenOptions } from '../theme/paperTheme';
import { useLanguageStore } from '../stores/languageStore';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import NewSaleScreen from '../screens/sales/NewSaleScreen';
import InvoiceScreen from '../screens/sales/InvoiceScreen';
import ProductsScreen from '../screens/products/ProductsScreen';
import AddEditProductScreen from '../screens/products/AddEditProductScreen';
import SalesHistoryScreen from '../screens/sales/SalesHistoryScreen';
import MoreScreen from '../screens/more/MoreScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import ProfitScreen from '../screens/profit/ProfitScreen';
import PurchasesScreen from '../screens/purchases/PurchasesScreen';
import AddPurchaseScreen from '../screens/purchases/AddPurchaseScreen';
import CustomersScreen from '../screens/customers/CustomersScreen';
import AddCustomerScreen from '../screens/customers/AddCustomerScreen';
import SuppliersScreen from '../screens/suppliers/SuppliersScreen';
import AddSupplierScreen from '../screens/suppliers/AddSupplierScreen';
import PartiesScreen from '../screens/parties/PartiesScreen';
import PartyDetailScreen from '../screens/parties/PartyDetailScreen';
import ExpensesScreen from '../screens/expenses/ExpensesScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import CreditsScreen from '../screens/credits/CreditsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabIcon = (name) =>
  ({ color, size }) => <MaterialCommunityIcons name={name} color={color} size={size} />;

function SaleStack() {
  const theme = useTheme();
  const t = useLanguageStore((s) => s.t);
  const locale = useLanguageStore((s) => s.locale);

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(theme)} key={locale}>
      <Stack.Screen name="NewSale" component={NewSaleScreen} options={{ title: t('screens.newSale') }} />
      <Stack.Screen name="Invoice" component={InvoiceScreen} options={{ title: t('screens.invoice') }} />
    </Stack.Navigator>
  );
}

function StockStack() {
  const theme = useTheme();
  const t = useLanguageStore((s) => s.t);
  const locale = useLanguageStore((s) => s.locale);

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(theme)} key={locale}>
      <Stack.Screen name="ProductsList" component={ProductsScreen} options={{ title: t('screens.stock') }} />
      <Stack.Screen name="AddEditProduct" component={AddEditProductScreen} options={{ title: t('screens.product') }} />
    </Stack.Navigator>
  );
}

function HistoryStack() {
  const theme = useTheme();
  const t = useLanguageStore((s) => s.t);
  const locale = useLanguageStore((s) => s.locale);

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(theme)} key={locale}>
      <Stack.Screen name="SalesHistory" component={SalesHistoryScreen} options={{ title: t('screens.salesHistory') }} />
      <Stack.Screen name="Invoice" component={InvoiceScreen} options={{ title: t('screens.invoice') }} />
    </Stack.Navigator>
  );
}

function MoreStack() {
  const theme = useTheme();
  const t = useLanguageStore((s) => s.t);
  const locale = useLanguageStore((s) => s.locale);

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(theme)} key={locale}>
      <Stack.Screen name="MoreMenu" component={MoreScreen} options={{ title: t('tabs.more') }} />
      <Stack.Screen name="SalesHistory" component={SalesHistoryScreen} options={{ title: t('screens.sales') }} />
      <Stack.Screen name="Profit" component={ProfitScreen} options={{ title: t('screens.profit') }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: t('screens.reports') }} />
      <Stack.Screen name="Purchases" component={PurchasesScreen} options={{ title: t('screens.purchases') }} />
      <Stack.Screen name="AddPurchase" component={AddPurchaseScreen} options={{ title: t('screens.addPurchase') }} />
      <Stack.Screen name="Parties" component={PartiesScreen} options={{ title: t('screens.parties') }} />
      <Stack.Screen
        name="PartyDetail"
        component={PartyDetailScreen}
        options={({ route }) => ({
          title: route.params?.party?.name || route.params?.customer?.name || route.params?.supplier?.name || t('screens.parties'),
        })}
      />
      <Stack.Screen name="Customers" component={CustomersScreen} options={{ title: t('screens.customers') }} />
      <Stack.Screen name="AddCustomer" component={AddCustomerScreen} options={{ title: t('screens.addCustomer') }} />
      <Stack.Screen
        name="CustomerDetail"
        component={PartyDetailScreen}
        options={({ route }) => ({ title: route.params?.customer?.name || t('screens.customer') })}
      />
      <Stack.Screen name="Suppliers" component={SuppliersScreen} options={{ title: t('screens.suppliers') }} />
      <Stack.Screen name="AddSupplier" component={AddSupplierScreen} options={{ title: t('screens.addSupplier') }} />
      <Stack.Screen
        name="SupplierDetail"
        component={PartyDetailScreen}
        options={({ route }) => ({ title: route.params?.supplier?.name || t('screens.suppliers') })}
      />
      <Stack.Screen name="Expenses" component={ExpensesScreen} options={{ title: t('screens.expenses') }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('screens.settings') }} />
      <Stack.Screen name="Credits" component={CreditsScreen} options={{ title: t('screens.credit') }} />
      <Stack.Screen name="Invoice" component={InvoiceScreen} options={{ title: t('screens.invoice') }} />
    </Stack.Navigator>
  );
}

export default function MainTabs() {
  const theme = useTheme();
  const t = useLanguageStore((s) => s.t);
  const locale = useLanguageStore((s) => s.locale);

  return (
    <Tab.Navigator
      key={locale}
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: tabIcon('view-dashboard'), headerShown: true, title: t('tabs.dashboard') }}
      />
      <Tab.Screen name="Sale" component={SaleStack} options={{ tabBarIcon: tabIcon('cart-plus'), title: t('tabs.sale'), headerShown: false }} />
      <Tab.Screen name="Stock" component={StockStack} options={{ tabBarIcon: tabIcon('package-variant'), title: t('tabs.stock'), headerShown: false }} />
      <Tab.Screen name="History" component={HistoryStack} options={{ tabBarIcon: tabIcon('history'), title: t('tabs.history'), headerShown: false }} />
      <Tab.Screen name="More" component={MoreStack} options={{ tabBarIcon: tabIcon('menu'), title: t('tabs.more'), headerShown: false }} />
    </Tab.Navigator>
  );
}
