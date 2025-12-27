// Native storage using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async getItem(key: string): Promise<string | null> {
    const value = await AsyncStorage.getItem(key);
    console.log(`[Storage] getItem("${key}"):`, value ? "found" : "null");
    return value;
  },

  async setItem(key: string, value: string): Promise<void> {
    console.log(`[Storage] setItem("${key}"):`, value.substring(0, 50) + "...");
    await AsyncStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    console.log(`[Storage] removeItem("${key}")`);
    await AsyncStorage.removeItem(key);
  },
};
