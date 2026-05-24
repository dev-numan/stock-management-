import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { stackScreenOptions } from '../theme/paperTheme';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import NewSaleScreen from '../screens/sales/NewSaleScreen';
import InvoiceScreen from '../screens/sales/InvoiceScreen';
import ProductsScreen from '../screens/products/ProductsScreen';
import AddEditProductScreen from '../screens/products/AddEditProductScreen';
import SalesHistoryScreen from '../screens/sales/SalesHistoryScreen';
import MoreScreen from '../screens/more/MoreScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import PurchasesScreen from '../screens/purchases/PurchasesScreen';
import AddPurchaseScreen from '../screens/purchases/AddPurchaseScreen';
import CustomersScreen from '../screens/customers/CustomersScreen';
import AddCustomerScreen from '../screens/customers/AddCustomerScreen';
import CustomerDetailScreen from '../screens/customers/CustomerDetailScreen';
import SuppliersScreen from '../screens/suppliers/SuppliersScreen';
import ExpensesScreen from '../screens/expenses/ExpensesScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import CreditsScreen from '../screens/credits/CreditsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabIcon = (name) =>
  ({ color, size }) => <MaterialCommunityIcons name={name} color={color} size={size} />;

function SaleStack() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(theme)}>
      <Stack.Screen name="NewSale" component={NewSaleScreen} options={{ title: 'New Sale' }} />
      <Stack.Screen name="Invoice" component={InvoiceScreen} options={{ title: 'Invoice' }} />
    </Stack.Navigator>
  );
}

function StockStack() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(theme)}>
      <Stack.Screen name="ProductsList" component={ProductsScreen} options={{ title: 'Stock' }} />
      <Stack.Screen name="AddEditProduct" component={AddEditProductScreen} options={{ title: 'Product' }} />
    </Stack.Navigator>
  );
}

function HistoryStack() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(theme)}>
      <Stack.Screen name="SalesHistory" component={SalesHistoryScreen} options={{ title: 'Sales History' }} />
      <Stack.Screen name="Invoice" component={InvoiceScreen} options={{ title: 'Invoice' }} />
    </Stack.Navigator>
  );
}

function MoreStack() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(theme)}>
      <Stack.Screen name="MoreMenu" component={MoreScreen} options={{ title: 'More' }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
      <Stack.Screen name="Purchases" component={PurchasesScreen} options={{ title: 'Purchases' }} />
      <Stack.Screen name="AddPurchase" component={AddPurchaseScreen} options={{ title: 'Add Purchase' }} />
      <Stack.Screen name="Customers" component={CustomersScreen} options={{ title: 'Customers' }} />
      <Stack.Screen name="AddCustomer" component={AddCustomerScreen} options={{ title: 'Add Customer' }} />
      <Stack.Screen
        name="CustomerDetail"
        component={CustomerDetailScreen}
        options={({ route }) => ({ title: route.params?.customer?.name || 'Customer' })}
      />
      <Stack.Screen name="Suppliers" component={SuppliersScreen} options={{ title: 'Suppliers' }} />
      <Stack.Screen name="Expenses" component={ExpensesScreen} options={{ title: 'Expenses' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="Credits" component={CreditsScreen} options={{ title: 'Credit' }} />
      <Stack.Screen name="Invoice" component={InvoiceScreen} options={{ title: 'Invoice' }} />
    </Stack.Navigator>
  );
}

export default function MainTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
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
        options={{ tabBarIcon: tabIcon('view-dashboard'), headerShown: true, title: 'Dashboard' }}
      />
      <Tab.Screen name="Sale" component={SaleStack} options={{ tabBarIcon: tabIcon('cart-plus'), title: 'Sale', headerShown: false }} />
      <Tab.Screen name="Stock" component={StockStack} options={{ tabBarIcon: tabIcon('package-variant'), title: 'Stock', headerShown: false }} />
      <Tab.Screen name="History" component={HistoryStack} options={{ tabBarIcon: tabIcon('history'), title: 'History', headerShown: false }} />
      <Tab.Screen name="More" component={MoreStack} options={{ tabBarIcon: tabIcon('menu'), title: 'More', headerShown: false }} />
    </Tab.Navigator>
  );
}
