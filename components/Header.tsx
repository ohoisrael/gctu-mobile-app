import React, { useState } from "react";
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useUser } from "@/context/UserContext";

const Header = () => {
  const { user } = useUser();

  // Check if it's the user's birthday
  const isUserBirthday = () => {
    if (!user?.dateOfBirth) return false;
    const today = new Date();
    const dob = new Date(user.dateOfBirth);
    return (
      today.getDate() === dob.getDate() &&
      today.getMonth() === dob.getMonth()
    );
  };


  return (
    <View style={styles.container}>
      <View style={styles.userInfo}>
        {user?.profilePicture && (
          <Image
            source={{
              uri: user.profilePicture,
            }}
            style={styles.userImg}
          />
        )}
        <View style={{ gap: 3 }}>
        <Text style={styles.welcomeTxt}>
            {isUserBirthday() ? "Happy Birthday" : "Welcome"}
          </Text>
          <Text style={styles.userName}>
            {user?.firstName} {user?.lastName}
          </Text>
        </View>
      </View>

      
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userImg: {
    width: 50,
    height: 50,
    borderRadius: 30,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  welcomeTxt: {
    fontSize: 12,
    color: Colors.darkGrey,
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.black,
  },
  donationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.gtcolor,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  donationText: {
    color: Colors.white,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: Colors.white,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    color: Colors.darkGrey,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 10,
  },
  modalValue: {
    fontSize: 14,
    color: Colors.black,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.black,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    borderRadius: 5,
    padding: 10,
    color: Colors.black,
    marginBottom: 10,
  },
  payButton: {
    backgroundColor: Colors.gtcolor,
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  payButtonText: {
    color: Colors.white,
    fontWeight: "bold",
    fontSize: 16,
  },
});
