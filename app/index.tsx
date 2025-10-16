import { Text, View, StyleSheet } from "react-native";
import { Image } from "expo-image";

// AI NOTE: Update this screen when you want to show your real app.

export default function Index() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/icon.png")}
        style={styles.icon}
        contentFit="contain"
      />
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>Your app template is ready.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 32,
  },
  icon: {
    width: 96,
    height: 96,
    marginBottom: 16,
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
});
