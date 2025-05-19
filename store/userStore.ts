import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { EXPO_API_URL } from '@env';

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

interface UserStore {
  user: User | null;
  token: string | null;
  loading: boolean;
  expoPushToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: FormData) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfilePicture: (imageUri: string) => Promise<void>;
  initializeNotifications: () => Promise<void>;
  clearNotifications: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false, // Changed to false
      expoPushToken: null,

      login: async (email: string, password: string) => {
        set({ loading: true });
        try {
          const response = await axios.post(`${EXPO_API_URL}/api/auth/signin`, {
            email,
            password,
          });
          const data = response.data;
          if (response.status === 200) {
            const { user, token } = data;
            set({
              user: {
                ...user,
                profilePicture: user.profilePicture || '',
                dateOfBirth: user.dateOfBirth || '',
              },
              token,
            });
            console.log('Login Success:', { userId: user.id, email });
          } else {
            throw new Error(data.error || 'Failed to login');
          }
        } catch (error: any) {
          console.error('Error during login:', error);
          throw new Error(error.response?.data?.error || 'Failed to login');
        } finally {
          set({ loading: false });
        }
      },

      logout: async () => {
        set({ loading: true });
        const { user, token } = get();
        try {
          await axios.post(`${EXPO_API_URL}/api/auth/signout`, {}, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (user?.id) {
            await axios.put(
              `${EXPO_API_URL}/api/users/clear-push-token/${user.id}`,
              { userId: user.id },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
          }
          set({ user: null, token: null, expoPushToken: null });
          console.log('Logout Success');
        } catch (error) {
          console.error('Error logging out:', error);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updateProfile: async (data: FormData) => {
        set({ loading: true });
        const { user, token } = get();
        try {
          const response = await axios.put(`${EXPO_API_URL}/api/users/edit/${user?.id}`, data, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          });
          if (response.status === 200) {
            const updatedUser = response.data.user;
            set({
              user: {
                ...updatedUser,
                profilePicture: updatedUser.profilePicture || '',
                dateOfBirth: updatedUser.dateOfBirth || '',
              },
            });
            console.log('Profile Updated:', updatedUser);
          }
        } catch (error: any) {
          console.error('Error updating profile:', error);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updatePassword: async (currentPassword: string, newPassword: string) => {
        set({ loading: true });
        const { user, token } = get();
        try {
          const response = await axios.put(
            `${EXPO_API_URL}/api/users/edit/${user?.id}/password`,
            { currentPassword, newPassword },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (response.status === 200) {
            console.log('Password Updated');
          }
        } catch (error: any) {
          console.error('Error updating password:', error);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updateProfilePicture: async (imageUri: string) => {
        set({ loading: true });
        const { user, token } = get();
        const formData = new FormData();
        formData.append('profilePicture', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'profile.jpg',
        } as any);
        try {
          const response = await axios.put(
            `${EXPO_API_URL}/api/users/edit/${user?.id}/picture`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
              },
            }
          );
          if (response.status === 200) {
            const updatedUser = response.data.user;
            set({
              user: {
                ...updatedUser,
                profilePicture: updatedUser.profilePicture || '',
                dateOfBirth: updatedUser.dateOfBirth || '',
              },
            });
            console.log('Profile Picture Updated:', updatedUser.profilePicture);
          }
        } catch (error: any) {
          console.error('Error updating profile picture:', error);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      initializeNotifications: async () => {
        if (!Device.isDevice) {
          console.log('Non-physical device, skipping notifications');
          return;
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
            return;
          }
          const token = (await Notifications.getExpoPushTokenAsync()).data;
          const currentPushToken = get().expoPushToken;
          if (token !== currentPushToken) {
            set({ expoPushToken: token });
            console.log('Expo Push Token:', token);

            const { user, token: authToken } = get();
            if (user?.id && authToken) {
              await axios.put(
                `${EXPO_API_URL}/api/users/update-push-token`,
                { userId: user.id, pushToken: token },
                {
                  headers: { Authorization: `Bearer ${authToken}` },
                }
              );
              console.log('Push Token Saved:', { userId: user.id });
            }
          }

          const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
            console.log('Notification received:', notification);
          });

          const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
            const newsId = response.notification.request.content.data.newsId;
            if (newsId) {
              console.log('Navigating to news:', newsId);
              router.push(`/news/${newsId}`);
            }
          });

          set({ notificationListener, responseListener });
        } catch (error) {
          console.error('Error setting up push notifications:', error);
        }
      },

      clearNotifications: () => {
        const { notificationListener, responseListener } = get();
        if (notificationListener) {
          Notifications.removeNotificationSubscription(notificationListener);
        }
        if (responseListener) {
          Notifications.removeNotificationSubscription(responseListener);
        }
        set({ notificationListener: null, responseListener: null, expoPushToken: null });
        console.log('Notifications Cleared');
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Error rehydrating user store:', error);
          }
          if (state) {
            state.loading = false; // Ensure loading is false after rehydration
            console.log('User Store Rehydrated:', { user: state.user, token: state.token });
          }
        };
      },
    }
  )
);