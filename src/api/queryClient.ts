import NetInfo from "@react-native-community/netinfo";
import { onlineManager, QueryClient } from "@tanstack/react-query";

let networkSyncConfigured = false;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2
    },
    mutations: {
      retry: 1
    }
  }
});

export function configureQueryNetworkSync(): void {
  if (networkSyncConfigured) {
    return;
  }

  networkSyncConfigured = true;
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected));
    })
  );
}
