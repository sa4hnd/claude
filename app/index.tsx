import { Text, View, StyleSheet } from "react-native";

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Hello World!!!!!!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fdf2f8",
    padding: 32,
  },
  heading: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#be185d",
    marginBottom: 8,
  },
});
