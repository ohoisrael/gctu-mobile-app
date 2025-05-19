import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '@/context/UserContext';
import { Colors } from '@/constants/Colors';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';

const ProfileScreen = () => {
  const { user, updatePassword, updateProfilePicture, logout, isLoading: contextLoading, uploadProgress } = useUser();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Use React Query to fetch user profile data
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      // Return the user data from context as it's already managed there
      return user;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const currentYear: string = new Date().getFullYear().toString();

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', "New passwords don't match.");
      return;
    }

    try {
      await updatePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update password');
    }
  };

  const handleChooseProfilePicture = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your photos to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const uri = result.assets[0].uri;
      try {
        await updateProfilePicture(uri);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to update profile picture');
      }
    }
  };

  const renderProfileImage = () => {
    console.log('ProfileScreen: renderProfileImage', { contextLoading, uploadProgress, profilePicture: user?.profilePicture });
    if (uploadProgress !== null && user?.profilePicture) {
      return (
        <View style={styles.profileImageContainer}>
          <Image
            source={{ uri: user.profilePicture }}
            style={[styles.profileImage, { opacity: 0.5 }]}
          />
          <Text style={styles.progressText}>{`${uploadProgress}%`}</Text>
        </View>
      );
    }
    if (user?.profilePicture) {
      return <Image source={{ uri: user.profilePicture }} style={styles.profileImage} />;
    }
    return (
      <View style={styles.profileImagePlaceholder}>
        {contextLoading || profileLoading ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Ionicons name="person" size={40} color={Colors.white} />
        )}
      </View>
    );
  };

  const openLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', `Cannot open URL: ${url}`);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleChooseProfilePicture} style={styles.imageWrapper}>
            {renderProfileImage()}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={20} color={Colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{profileData?.firstName + ' ' + profileData?.lastName}</Text>
          <Text style={styles.userEmail}>{profileData?.email}</Text>
        </View>

        {/* Profile Information Section */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('profile')}
          activeOpacity={0.8}
        >
          <View style={styles.sectionHeaderContent}>
            <MaterialIcons name="person-outline" size={24} color={Colors.primary} />
            <Text style={styles.sectionHeaderText}>Profile Information</Text>
          </View>
          <Ionicons
            name={activeSection === 'profile' ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={Colors.primary}
          />
        </TouchableOpacity>

        {activeSection === 'profile' && (
          <View style={styles.sectionContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{profileData?.firstName + ' ' + profileData?.lastName}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profileData?.email}</Text>
            </View>
          </View>
        )}

        {/* Password Update Section */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('password')}
          activeOpacity={0.8}
        >
          <View style={styles.sectionHeaderContent}>
            <MaterialIcons name="lock-outline" size={24} color={Colors.primary} />
            <Text style={styles.sectionHeaderText}>Password Settings</Text>
          </View>
          <Ionicons
            name={activeSection === 'password' ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={Colors.primary}
          />
        </TouchableOpacity>

        {activeSection === 'password' && (
          <View style={styles.sectionContent}>
            <TextInput
              style={styles.input}
              placeholder="Current Password"
              placeholderTextColor={Colors.placeholderText}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor={Colors.placeholderText}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor={Colors.placeholderText}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={[
                styles.button,
                (!currentPassword || !newPassword || !confirmPassword || contextLoading) &&
                  styles.buttonDisabled,
              ]}
              onPress={handleUpdatePassword}
              disabled={!currentPassword || !newPassword || !confirmPassword || contextLoading}
            >
              {contextLoading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.buttonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, contextLoading && styles.buttonDisabled]}
          onPress={() => {
            Alert.alert('Logout', 'Are you sure you want to logout?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await logout();
                    Alert.alert('Success', 'Logout successful');
                  } catch (error: any) {
                    Alert.alert('Error', error.message || 'Failed to logout');
                  }
                },
              },
            ]);
          }}
          disabled={contextLoading}
        >
          {contextLoading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <MaterialIcons name="logout" size={20} color={Colors.white} />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Social Media Links */}
        <View style={styles.socialLinksContainer}>
          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() => openLink('https://www.facebook.com/GCTUniversity')}
          >
            <Ionicons name="logo-facebook" size={30} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() => openLink('https://x.com/gctu_gh')}
          >
            <Ionicons name="logo-twitter" size={30} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() => openLink('https://www.instagram.com/gctu_gh')}
          >
            <Ionicons name="logo-instagram" size={30} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() => openLink('https://gctu.edu.gh')}
          >
            <Ionicons name="globe-outline" size={30} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          © {currentYear} Ghana Communication Technology University (GCTU)
        </Text>
        <Text style={styles.footerSubText}>All Rights Reserved</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  imageWrapper: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    position: 'absolute',
    color: Colors.white,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.black,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: Colors.darkGrey,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 15,
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.black,
    marginLeft: 10,
  },
  sectionContent: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: Colors.darkGrey,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.black,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.lightGrey,
    marginVertical: 10,
  },
  input: {
    backgroundColor: Colors.lightGrey,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: Colors.black,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: Colors.lightGrey,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: Colors.tint,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoutButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 10,
  },
  socialLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  socialIcon: {
    marginHorizontal: 15,
  },
  footerText: {
    fontSize: 14,
    color: Colors.darkGrey,
    textAlign: 'center',
    marginBottom: 5,
  },
  footerSubText: {
    fontSize: 12,
    color: Colors.placeholderText,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default ProfileScreen;