import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  Settings: undefined;
  LanguageSelection: undefined;
  NotificationSettings: undefined;
};

const MainTab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

function MainTabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginTop: 5,
        },
      }}
    >
      <MainTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Seanslar',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-list" size={28} color={color} />
          ),
        }}
      />
      <MainTab.Screen
        name="MapView"
        component={MapViewScreen}
        options={{
          title: 'Harita',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map" size={28} color={color} />
          ),
        }}
      />
      <MainTab.Screen
        name="MyEvents"
        component={MyEventsScreen}
        options={{
          title: 'Seanslarım',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-check" size={28} color={color} />
          ),
        }}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={28} color={color} />
          ),
        }}
      />
    </MainTab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <RootStack.Navigator>
      <RootStack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{
          headerShown: false,
          title: 'Ana Ekran'
        }}
      />
      <RootStack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{ title: 'Seans Detayı' }}
      />
      <RootStack.Screen
        name="Chat"
        component={EnhancedChatScreen}
        options={{ title: 'Sohbet' }}
      />
      <RootStack.Screen
        name="RateUser"
        component={RateUserScreen}
        options={{ title: 'Kullanıcıyı Değerlendir' }}
      />
      <RootStack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: 'Favorilerim' }}
      />
      <RootStack.Screen
        name="CreateSession"
        component={CreateSessionScreen}
        options={{ title: 'Seans Oluştur' }}
      />
      <RootStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Profili Düzenle' }}
      />
      <RootStack.Screen
        name="ProfileStats"
        component={ProfileStatsScreen}
        options={{ title: 'İstatistiklerim' }}
      />
      <RootStack.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{ title: 'Başarılarım' }}
      />
      <RootStack.Screen
        name="Friends"
        component={FriendsScreen}
        options={{ title: 'Arkadaşlarım' }}
      />
      <RootStack.Screen
        name="BlockedUsers"
        component={BlockedUsersScreen}
        options={{ title: 'Engellenenler' }}
      />
      <RootStack.Screen
        name="ReportUser"
        component={ReportUserScreen}
        options={{ title: 'Kullanıcıyı Şikayet Et' }}
      />
      <RootStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: 'Kullanıcı Profili' }}
      />
      <RootStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Ayarlar' }}
      />
      <RootStack.Screen
        name="LanguageSelection"
        component={LanguageSelectionScreen}
        options={{ title: 'Dil Seçimi' }}
      />
      <RootStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: 'Bildirim Ayarları' }}
      />
    </RootStack.Navigator>
  );
}
