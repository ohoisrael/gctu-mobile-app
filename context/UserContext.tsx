import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, AppState } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { EXPO_API_URL } from '@env';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  role: string;
  faculty?: string;
  profilePicture: string;
  dateOfBirth: string;
}

interface UserContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: FormData) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfilePicture: (imageUri: string) => Promise<void>;
  isLoading: boolean;
  uploadProgress: number | null;
  isLoggingOut: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const appState = useRef(AppState.currentState);
  const queryClient = useQueryClient();

  // Simulate progress for uploads
  const simulateProgress = async (duration: number = 2000) => {
    const startTime = Date.now();
    const interval = 100;
    return new Promise<void>((resolve) => {
      const intervalId = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(Math.round((elapsed / duration) * 100), 95);
        setUploadProgress(progress);
        console.log('UserContext: Simulated Progress', progress);
        if (elapsed >= duration) {
          clearInterval(intervalId);
          resolve();
        }
      }, interval);
    });
  };

  // Load user and token from AsyncStorage
  const { isLoading: isLoadingUser } = useQuery({
    queryKey: ['user', 'token'],
    queryFn: async () => {
      console.log('UserContext: Loading user from storage');
      const storedUser = await AsyncStorage.getItem('user');
      const storedToken = await AsyncStorage.getItem('token');
      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser);
        const userData = {
          ...parsedUser,
          profilePicture: parsedUser.profilePicture || '',
          dateOfBirth: parsedUser.dateOfBirth || '',
        };
        setUser(userData);
        setToken(storedToken);
        console.log('User Loaded from Storage:', { userId: parsedUser.id, email: parsedUser.email });
        return { user: userData, token: storedToken };
      }
      console.log('UserContext: No user or token found in storage');
      return null;
    },
    retry: false,
  });

  // Save push token mutation
  const saveTokenMutation = useMutation({
    mutationFn: async (expoToken: string) => {
      if (!user?.id || !token || isLoggingOut) {
        throw new Error('User or token not found or logging out');
      }
      await axios.put(
        `${EXPO_API_URL}/api/users/update-push-token`,
        { userId: user.id, pushToken: expoToken },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: (_, expoToken) => {
      console.log('Push Token Saved:', { userId: user?.id });
    },
    onError: (error) => {
      console.error('Error saving token to server:', error);
    },
  });

  // Register for push notifications
  const registerForPushNotificationsAsync = async () => {
    if (!Device.isDevice) {
      console.log('Non-physical device, skipping notifications');
      return null;
    }
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Push notification permissions denied');
        return null;
      }
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo Push Token:', token);
      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  };

  // Notification setup
  useEffect(() => {
    if (!user || !token || isLoggingOut) {
      console.log('UserContext: Skipping notification setup due to missing user, token, or logout');
      return;
    }

    registerForPushNotificationsAsync()
      .then((pushToken) => {
        if (pushToken && pushToken !== expoPushToken) {
          console.log('UserContext: New Expo Push Token:', pushToken);
          setExpoPushToken(pushToken);
          saveTokenMutation.mutate(pushToken);
        }
      })
      .catch((error) => {
        console.error('UserContext: Error setting up push notifications:', error);
      });

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('UserContext: Notification received:', JSON.stringify(notification, null, 2));
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('UserContext: Notification response:', JSON.stringify(response, null, 2));
      const newsId = response.notification.request.content.data?.newsId;
      if (newsId) {
        console.log('UserContext: Attempting navigation to', `/news/${newsId}`);
        router.navigate(`/news/${newsId}`);
      } else {
        console.warn('UserContext: No newsId in notification data:', response.notification.request.content.data);
      }
    });

    return () => {
      console.log('UserContext: Cleaning up notification listeners');
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user, token, expoPushToken, isLoggingOut, saveTokenMutation]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await axios.post(`${EXPO_API_URL}/api/auth/signin`, { email, password });
      if (response.status !== 200) {
        throw new Error(response.data.error || 'Failed to login');
      }
      return response.data;
    },
    onSuccess: async (data) => {
      const { user, token } = data;
      const userData = {
        ...user,
        profilePicture: user.profilePicture || '',
        dateOfBirth: user.dateOfBirth || '',
      };
      setUser(userData);
      setToken(token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('token', token);
      console.log('Login Success:', { userId: user.id, email: user.email });
      queryClient.invalidateQueries({ queryKey: ['user', 'token'] });
    },
    onError: (error: any) => {
      console.error('Error during login:', error);
      Alert.alert('Error', error.message || 'Failed to login');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await axios.post(`${EXPO_API_URL}/api/auth/signout`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (user?.id) {
        await axios.put(
          `${EXPO_API_URL}/api/users/clear-push-token/${user.id}`,
          { userId: user.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    },
    onMutate: () => {
      setIsLoggingOut(true);
      console.log('UserContext: Initiating logout');
    },
    onSuccess: async () => {
      setUser(null);
      setToken(null);
      setExpoPushToken(null);
      await AsyncStorage.multiRemove(['user', 'token']);
      console.log('Logout Success: User and token cleared');
      queryClient.invalidateQueries({ queryKey: ['user', 'token'] });
    },
    onError: (error: any) => {
      console.error('Error logging out:', error);
      Alert.alert('Error', error.message || 'Failed to logout');
    },
    onSettled: () => {
      setIsLoggingOut(false);
      console.log('UserContext: Logout complete');
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await axios.put(`${EXPO_API_URL}/api/users/edit/${user?.id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response.status !== 200) {
        throw new Error('Failed to update profile');
      }
      return response.data.user;
    },
    onSuccess: async (updatedUser) => {
      const userData = {
        ...updatedUser,
        profilePicture: updatedUser.profilePicture || '',
        dateOfBirth: updatedUser.dateOfBirth || '',
      };
      setUser(userData);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      console.log('Profile Updated:', updatedUser);
      queryClient.invalidateQueries({ queryKey: ['user', 'token'] });
    },
    onError: (error: any) => {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const response = await axios.put(
        `${EXPO_API_URL}/api/users/edit/${user?.id}/password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.status !== 200) {
        throw new Error('Failed to update password');
      }
    },
    onSuccess: () => {
      console.log('Password Updated');
      Alert.alert('Success', 'Password updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating password:', error);
      Alert.alert('Error', error.message || 'Failed to update password');
    },
  });

  // Update profile picture mutation
  const updateProfilePictureMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      const formData = new FormData();
      formData.append('profilePicture', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);
      const simulatePromise = simulateProgress(2000);
      const response = await axios.put(
        `${EXPO_API_URL}/api/users/edit/${user?.id}/picture`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            console.log('UserContext: Progress Event', {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
            });
            const percentCompleted = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : Math.round((progressEvent.loaded / (progressEvent.loaded + 1)) * 100);
            setUploadProgress(percentCompleted);
            console.log('UserContext: Upload Progress', percentCompleted);
          },
        }
      );
      await simulatePromise;
      if (response.status !== 200) {
        throw new Error('Failed to update profile picture');
      }
      return response.data.user;
    },
    onMutate: () => {
      setUploadProgress(0);
      console.log('UserContext: Starting profile picture upload');
    },
    onSuccess: async (updatedUser) => {
      setUploadProgress(100);
      const userData = {
        ...updatedUser,
        profilePicture: updatedUser.profilePicture || '',
        dateOfBirth: updatedUser.dateOfBirth || '',
      };
      setUser(userData);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      console.log('UserContext: Profile Picture Updated', updatedUser.profilePicture);
      Alert.alert('Success', 'Profile picture updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user', 'token'] });
    },
    onError: (error: any) => {
      console.error('UserContext: Error updating profile picture', error);
      Alert.alert('Error', error.message || 'Failed to update profile picture');
    },
    onSettled: () => {
      setUploadProgress(null);
      console.log('UserContext: Upload complete', { uploadProgress: null });
    },
  });

  return (
    <UserContext.Provider
      value={{
        user,
        token,
        login: async (email, password) => loginMutation.mutateAsync({ email, password }),
        logout: async () => logoutMutation.mutateAsync(),
        updateProfile: async (data) => updateProfileMutation.mutateAsync(data),
        updatePassword: async (currentPassword, newPassword) =>
          updatePasswordMutation.mutateAsync({ currentPassword, newPassword }),
        updateProfilePicture: async (imageUri) => updateProfilePictureMutation.mutateAsync(imageUri),
        isLoading: isLoadingUser || loginMutation.isPending || logoutMutation.isPending ||
          updateProfileMutation.isPending || updatePasswordMutation.isPending ||
          updateProfilePictureMutation.isPending,
        uploadProgress,
        isLoggingOut,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};