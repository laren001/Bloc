import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Platform, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PostScreen from './src/screens/PostScreen';
import DMInboxScreen from './src/screens/DMInboxScreen';
import ChatScreen from './src/screens/ChatScreen';
import LoadingBricks from './src/components/LoadingBricks';
import Avatar from './src/components/Avatar';

const Tab = createBottomTabNavigator();
const HomeStackNav = createNativeStackNavigator();
const ProfileStackNav = createNativeStackNavigator();
const DMStackNav = createNativeStackNavigator();

const ACTIVE_BG = '#CC5500';
const ACTIVE_ICON = '#FFFFFF';
const INACTIVE_ICON = '#888888';

const TAB_ICONS = {
  Home: 'home-outline',
  Search: 'search-outline',
  Notifications: 'notifications-outline',
};

const TAB_LABELS = {
  Home: 'Home',
  Search: 'Search',
  DM: 'Messages',
  Notifications: 'Alerts',
  Profile: 'Profile',
};

function useGlobalScrollbarStyle() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const styleId = 'bloc-scrollbar-style';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      * {
        scrollbar-width: none;
      }
      *::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }
      .bloc-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: #000000 transparent;
      }
      .bloc-scrollbar::-webkit-scrollbar {
        display: block;
        width: 6px;
        background: transparent;
      }
      .bloc-scrollbar::-webkit-scrollbar-thumb {
        background-color: #000000;
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);
  }, []);
}

function DMIcon({ size = 24, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Path
        d="M 50 12
           C 74 12 92 28 92 49
           C 92 70 74 86 50 86
           C 43 86 36.5 84.7 31 82.3
           C 25 88 17 90 10 90
           C 15 84 18 77.5 18.5 71.5
           C 12 64.5 8 57 8 49
           C 8 28 26 12 50 12 Z"
        fill={color}
      />
      <Circle cx="34" cy="49" r="5.5" fill={color === ACTIVE_ICON ? ACTIVE_BG : 'white'} />
      <Circle cx="50" cy="49" r="5.5" fill={color === ACTIVE_ICON ? ACTIVE_BG : 'white'} />
      <Circle cx="66" cy="49" r="5.5" fill={color === ACTIVE_ICON ? ACTIVE_BG : 'white'} />
    </Svg>
  );
}

function PlaceholderScreen({ label, scrollable }) {
  const { theme } = useTheme();
  const content = (
    <View style={{ flex: 1, minHeight: 600, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.textSecondary }}>{label} — coming soon</Text>
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        {...(Platform.OS === 'web' ? { className: 'bloc-scrollbar' } : {})}
      >
        {content}
      </ScrollView>
    );
  }

  return content;
}

function NotificationDot({ theme }) {
  return (
    <View
      style={{
        position: 'absolute',
        top: -2,
        right: -6,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#8B3A00',
        borderWidth: 1.5,
        borderColor: theme.surface,
      }}
    />
  );
}

function ProfileIcon({ color, size }) {
  const { profile } = useAuth();
  const dim = (size ?? 22) * 1.15;

  return (
    <Avatar
      avatarUrl={profile?.avatar_url}
      displayName={profile?.display_name}
      username={profile?.username}
      size={dim}
      borderWidth={color === ACTIVE_ICON ? 2 : 0}
      borderColor={ACTIVE_ICON}
    />
  );
}

function TabPill({ focused, label, children }) {
  return (
    <View style={[pillStyles.button, focused && pillStyles.activeButton]}>
      {children}
      <Text style={[pillStyles.labelText, focused && pillStyles.activeText]}>{label}</Text>
    </View>
  );
}

function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <HomeStackNav.Screen name="FeedHome" component={HomeScreen} />
      <HomeStackNav.Screen name="UserProfile" component={ProfileScreen} />
    </HomeStackNav.Navigator>
  );
}

function ProfileStack() {
  return (
    <ProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStackNav.Screen name="MyProfile" component={ProfileScreen} />
      <ProfileStackNav.Screen name="AccountSettings" component={SettingsScreen} />
      <ProfileStackNav.Screen name="UserProfile" component={ProfileScreen} />
    </ProfileStackNav.Navigator>
  );
}

// DM tab is now a stack: the inbox list, plus a pushed Chat screen for an
// individual conversation. Reachable either from the inbox or from tapping
// "Message" on someone's profile.
function DMStack() {
  return (
    <DMStackNav.Navigator screenOptions={{ headerShown: false }}>
      <DMStackNav.Screen name="Inbox" component={DMInboxScreen} />
      <DMStackNav.Screen name="Chat" component={ChatScreen} />
      <DMStackNav.Screen name="UserProfile" component={ProfileScreen} />
    </DMStackNav.Navigator>
  );
}

function MainTabs() {
  const { theme } = useTheme();
  useGlobalScrollbarStyle();

  const [unread, setUnread] = React.useState({ notifications: false, dm: false });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          height: 64,
          paddingTop: 8,
        },
        tabBarIcon: ({ focused, size }) => {
          const iconColor = focused ? ACTIVE_ICON : INACTIVE_ICON;
          const label = TAB_LABELS[route.name];

          let icon;
          if (route.name === 'DM') {
            icon = <DMIcon color={iconColor} size={size ?? 22} />;
          } else if (route.name === 'Profile') {
            icon = <ProfileIcon color={iconColor} size={size ?? 22} />;
          } else {
            icon = <Ionicons name={TAB_ICONS[route.name]} size={size ?? 22} color={iconColor} />;
          }

          const showDot =
            (route.name === 'Notifications' && unread.notifications) ||
            (route.name === 'DM' && unread.dm);

          return (
            <TabPill focused={focused} label={label}>
              <View>
                {icon}
                {showDot && <NotificationDot theme={theme} />}
              </View>
            </TabPill>
          );
        },
      })}
      screenListeners={({ route }) => ({
        tabPress: () => {
          if (route.name === 'Notifications') {
            setUnread((u) => ({ ...u, notifications: false }));
          } else if (route.name === 'DM') {
            setUnread((u) => ({ ...u, dm: false }));
          }
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Search" children={() => <PlaceholderScreen label="Search" />} />
      <Tab.Screen name="DM" component={DMStack} />
      <Tab.Screen name="Notifications" children={() => <PlaceholderScreen label="Alerts" scrollable />} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { theme } = useTheme();
  const { session, loading } = useAuth();

  const navTheme = {
    ...(theme.mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      card: theme.surface,
      text: theme.textPrimary,
      border: theme.border,
      primary: theme.accent,
    },
  };

  if (loading) {
    return <LoadingBricks />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      {session ? <MainTabs /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

function WebPhoneFrame({ children }) {
  const { theme } = useTheme();

  if (Platform.OS !== 'web') {
    return children;
  }

  return (
    <View style={[webStyles.backdrop, { backgroundColor: theme.mode === 'dark' ? '#000' : '#e5e5e5' }]}>
      <View style={[webStyles.phone, { backgroundColor: theme.background }]}>
        {children}
      </View>
    </View>
  );
}

const webStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: {
    width: '100%',
    maxWidth: 430,
    height: '100vh',
    maxHeight: 932,
    overflow: 'hidden',
    borderRadius: 24,
    boxShadow: '0 0 40px rgba(0,0,0,0.35)',
  },
});

const pillStyles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 25,
    backgroundColor: 'transparent',
  },
  activeButton: {
    backgroundColor: '#CC5500',
  },
  labelText: {
    color: '#888888',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 11,
  },
  activeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WebPhoneFrame>
          <AppNavigator />
        </WebPhoneFrame>
      </AuthProvider>
    </ThemeProvider>
  );
}