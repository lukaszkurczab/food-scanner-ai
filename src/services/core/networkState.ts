import type { NetInfoState } from "@react-native-community/netinfo";

type NetStateLike = Pick<NetInfoState, "isConnected" | "isInternetReachable">;

export function isOfflineNetState(state: NetStateLike): boolean {
  if (state.isConnected === false) return true;
  if (state.isInternetReachable === false) return true;
  return false;
}

export function isOnlineNetState(state: NetStateLike): boolean {
  return !isOfflineNetState(state);
}
