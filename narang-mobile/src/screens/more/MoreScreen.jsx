import React from 'react';
import { View } from 'react-native';
import { Card, Text, List, Divider, useTheme } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import AppButton from '../../components/common/AppButton';
import AppLogo from '../../components/common/AppLogo';
import ScreenContainer from '../../components/common/ScreenContainer';
import { APP_NAME } from '../../constants/branding';

const menuItems = [
  { title: 'Profit', screen: 'Profit', icon: 'cash-plus', adminOnly: true },
  { title: 'Reports', screen: 'Reports', icon: 'chart-bar', adminOnly: true },
  { title: 'Customers', screen: 'Customers', icon: 'account-group' },
  { title: 'Suppliers', screen: 'Suppliers', icon: 'store' },
  { title: 'Expenses', screen: 'Expenses', icon: 'cash-minus' },
  { title: 'Settings', screen: 'Settings', icon: 'cog', adminOnly: true },
];

export default function MoreScreen({ navigation }) {
  const theme = useTheme();
  const { user, logout, isAdmin } = useAuth();
  const items = menuItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <ScreenContainer>
      <Card mode="elevated" style={{ marginBottom: 16, borderRadius: theme.roundness }}>
        <Card.Content style={{ alignItems: 'center', paddingVertical: 16 }}>
          <AppLogo size={72} style={{ marginBottom: 8 }} />
          <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: '700' }}>
            {APP_NAME}
          </Text>
          <Text variant="bodyLarge" style={{ marginTop: 4 }}>
            {user?.name}
          </Text>
          {user?.email ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              {user.email}
            </Text>
          ) : null}
        </Card.Content>
      </Card>

      <Card mode="elevated" style={{ borderRadius: theme.roundness }}>
        <List.Section>
          {items.map((item, index) => (
            <React.Fragment key={item.screen}>
              {index > 0 ? <Divider /> : null}
              <List.Item
                title={item.title}
                left={(props) => <List.Icon {...props} icon={item.icon} color={theme.colors.primary} />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => navigation.navigate(item.screen)}
                style={{ paddingVertical: 4 }}
              />
            </React.Fragment>
          ))}
        </List.Section>
      </Card>

      <View style={{ marginTop: 24, marginBottom: 16 }}>
        <AppButton title="Logout" variant="danger" onPress={logout} icon="logout" />
      </View>
    </ScreenContainer>
  );
}
