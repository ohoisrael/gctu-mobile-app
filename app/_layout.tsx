import { useFonts } from 'expo-font';
import { Stack, useRouter, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { UserProvider, useUser } from '@/context/UserContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

SplashScreen.preventAutoHideAsync();

// Initialize QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const RootLayoutInner = () => {
  const { user, token, isLoggingOut, isLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const isMounted = useRef(false);
  const lastNavigated = useRef<string | null>(null);

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      isMounted.current = true;
    }
  }, [loaded]);

  useEffect(() => {
    if (!isMounted.current || isLoading) {
      return;
    }

    const unauthorizedRoutes = ['/index', '/sign-in', '/forgotpassword', '/'];

    const navigateTo = (path: string) => {
      try {
        console.log(`RootLayout: Navigating to ${path}`);
        router.replace(path);
        lastNavigated.current = path;
      } catch (error) {
        console.error(`RootLayout: Navigation error to ${path}:`, error);
      }
    };

    console.log('RootLayout: useEffect triggered', { user: !!user, token: !!token, isLoggingOut, pathname });

    const timer = setTimeout(() => {
      if (user && token && !isLoggingOut) {
        if (unauthorizedRoutes.includes(pathname)) {
          console.log('RootLayout: User logged in, navigating to /(tabs)', { userId: user.id });
          navigateTo('/(tabs)');
        }
      } else if (!user || !token || isLoggingOut) {
        if (!unauthorizedRoutes.includes(pathname)) {
          console.log('RootLayout: User logged out or logging out, navigating to /sign-in');
          navigateTo('/sign-in');
        }
      }
    }, 100); // Debounce navigation by 100ms

    return () => clearTimeout(timer);
  }, [user, token, isLoggingOut, isLoading, router, pathname]);

  useEffect(() => {
    lastNavigated.current = null;
  }, [pathname]);

  if (!loaded) {
    return null; // Only return null while fonts are loading
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="forgotpassword" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="news/[id]" options={{ headerShown: true }} />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <RootLayoutInner />
      </UserProvider>
    </QueryClientProvider>
  );
}