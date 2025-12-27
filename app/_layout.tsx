import { Stack } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { ChatProvider } from "@/providers/ChatProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AuthScreen from "@/components/AuthScreen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#191919' }}>
        <ActivityIndicator size="large" color="#D97757" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ChatProvider>
            <RootLayoutNav />
          </ChatProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
