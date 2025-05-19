import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { StatusBar } from 'expo-status-bar';
import { useUser } from '@/context/UserContext';

export default function Index() {
  const router = useRouter();
  const { user, token, isLoading } = useUser();

  console.log('Index Render:', { user: user?.id, token: !!token, isLoading });

  if (isLoading) {
    return null; // Wait for UserContext to load
  }

  if (user && token) {
    return null; // RootLayout will redirect
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={require('@/assets/images/gtlog.jpg')}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <View style={styles.wrapper}>
          <Animated.Text
            style={styles.title}
            entering={FadeInRight.delay(300).duration(500)}
          >
            Stay Updated!
          </Animated.Text>
          <Animated.Text
            style={styles.description}
            entering={FadeInRight.delay(700).duration(500)}
          >
            Get breaking news and stories from the school directly here.
          </Animated.Text>
          <Animated.View entering={FadeInDown.delay(1200).duration(500)}>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => router.replace('/sign-in')}
            >
              <Text style={styles.btnText}>Get Started</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 50,
    paddingHorizontal: 30,
    gap: 10,
  },
  title: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: 1.5,
    lineHeight: 36,
    textAlign: 'center',
  },
  description: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 1.2,
    lineHeight: 22,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: Colors.gtyellow,
    paddingVertical: 15,
    marginVertical: 20,
    alignItems: 'center',
    borderRadius: 10,
  },
  btnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});