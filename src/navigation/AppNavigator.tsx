import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import HomeScreen from '../screens/Home/HomeScreen';
import MapViewScreen from '../screens/Map/MapViewScreen';
import FavoritesScreen from '../screens/Favorites/FavoritesScreen';
import MyEventsScreen from '../screens/MyEvents/MyEventsScreen';
import CreateSessionScreen from '../screens/CreateSession/CreateSessionScreen';
import SessionDetailScreen from '../screens/SessionDetail/SessionDetailScreen';
import EnhancedChatScreen from '../screens/Chat/EnhancedChatScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import RateUserScreen from '../screens/RateUser/RateUserScreen';
import EditProfileScreen from '../screens/Profile/EditProfileScreen';
import ProfileStatsScreen from '../screens/Profile/ProfileStatsScreen';
import AchievementsScreen from '../screens/Achievements/AchievementsScreen';
import FriendsScreen from '../screens/Friends/FriendsScreen';
import BlockedUsersScreen from '../screens/Blocked/BlockedUsersScreen';
import ReportUserScreen from '../screens/Report/ReportUserScreen';
import UserProfileScreen from '../screens/Profile/UserProfileScreen';
import ProfileDetailScreen from '../screens/ProfileDetail/ProfileDetailScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import LanguageSelectionScreen from '../screens/Settings/LanguageSelectionScreen';
import NotificationSettingsScreen from '../screens/Settings/NotificationSettingsScreen';

export type MainTabParamList = {
  Home: undefined;
  MapView: undefined;
  MyEvents: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  SessionDetail: { sessionId: number };
  Chat: { sessionId: number };
  RateUser: { sessionId: number; userId: string; userName: string };
  Favorites: undefined;
  CreateSession: undefined;
  EditProfile: undefined;
  ProfileStats: undefined;
  Achievements: undefined;
  Friends: undefined;
  BlockedUsers: undefined;
  ReportUser: { userId: string; userName: string };
  UserProfile: { userId: string };
  ProfileDetail: { userId: string };
  Settings: undefined;
  LanguageSelection: undefined;
  NotificationSettings: undefined;
};

const MainTab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

function MainTabNavigator() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: theme.dark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 85 : 70,
          paddingBottom: Platform.OS === 'ios' ? 25 : 12,
          paddingTop: 8,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;
          let iconSize = focused ? 32 : 26;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MapView') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'MyEvents') {
            iconName = focused ? 'calendar-check' : 'calendar-check-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account-circle' : 'account-circle-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return (
            <View style={[
              styles.iconContainer,
              focused && {
                backgroundColor: theme.dark ? 'rgba(98, 0, 238, 0.2)' : 'rgba(98, 0, 238, 0.1)',
              }
            ]}>
              <MaterialCommunityIcons
                name={iconName as any}
                size={iconSize}
                color={focused ? '#6200ee' : color}
              />
            </View>
          );
        },
      })}
    >
      <MainTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: t('navigation.sessions'),
        }}
      />
      <MainTab.Screen
        name="MapView"
        component={MapViewScreen}
        options={{
          title: t('navigation.map'),
        }}
      />
      <MainTab.Screen
        name="MyEvents"
        component={MyEventsScreen}
        options={{
          title: t('navigation.myEvents'),
        }}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('navigation.profile'),
        }}
      />
    </MainTab.Navigator>
  );
}

export default function AppNavigator() {
  const { t } = useTranslation();

  return (
    <RootStack.Navigator>
      <RootStack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{
          headerShown: false,
          title: t('navigation.home')
        }}
      />
      <RootStack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{ title: t('session.detail') }}
      />
      <RootStack.Screen
        name="Chat"
        component={EnhancedChatScreen}
        options={{ title: t('navigation.chat') }}
      />
      <RootStack.Screen
        name="RateUser"
        component={RateUserScreen}
        options={{ title: t('rating.rateUser') }}
      />
      <RootStack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: t('navigation.favorites') }}
      />
      <RootStack.Screen
        name="CreateSession"
        component={CreateSessionScreen}
        options={{ title: t('session.create') }}
      />
      <RootStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: t('profile.editProfile') }}
      />
      <RootStack.Screen
        name="ProfileStats"
        component={ProfileStatsScreen}
        options={{ title: t('profile.statistics') }}
      />
      <RootStack.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{ title: t('navigation.achievements') }}
      />
      <RootStack.Screen
        name="Friends"
        component={FriendsScreen}
        options={{ title: t('navigation.friends') }}
      />
      <RootStack.Screen
        name="BlockedUsers"
        component={BlockedUsersScreen}
        options={{ title: t('settings.blockedUsers') }}
      />
      <RootStack.Screen
        name="ReportUser"
        component={ReportUserScreen}
        options={{ title: t('report.title') }}
      />
      <RootStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: t('profile.viewProfile') }}
      />
      <RootStack.Screen
        name="ProfileDetail"
        component={ProfileDetailScreen}
        options={{ title: t('profile.viewProfile') }}
      />
      <RootStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('navigation.settings') }}
      />
      <RootStack.Screen
        name="LanguageSelection"
        component={LanguageSelectionScreen}
        options={{ title: t('language.title') }}
      />
      <RootStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: t('notifications.settings') }}
      />
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
