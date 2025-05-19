import { useColorScheme } from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { icon } from '@/constants/Icons'

const _Layout = () => {
    const colorScheme = useColorScheme();

  return (
    <Tabs
    screenOptions={{
      tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
      tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
      tabBarStyle: {
        backgroundColor: Colors[colorScheme ?? 'light'].background,
        borderTopWidth: 0,
        elevation: 0,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
      },
      headerShown: false,
    }}
  >
    <Tabs.Screen
      name="index" // This is now home.tsx inside (tabs)
      options={{
        title: 'Home',
        tabBarIcon: ({ color, focused }) => icon.index({ color, focused }),
      }}
    />
    <Tabs.Screen
      name="discover"
      options={{
        title: 'Discover',
        tabBarIcon: ({ color, focused }) => icon.discover({ color, focused }),
      }}
    />
    <Tabs.Screen
      name="saved"
      options={{
        title: 'Saved',
        tabBarIcon: ({ color, focused }) => icon.saved({ color, focused }),
      }}
    />
    <Tabs.Screen
      name="settings"
      options={{
        title: 'Settings',
        tabBarIcon: ({ color, focused }) => icon.settings({ color, focused }),
      }}
    />
  </Tabs>
  )
}

export default _Layout