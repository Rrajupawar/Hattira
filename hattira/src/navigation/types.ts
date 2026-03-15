// src/navigation/types.ts
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type AppTabParamList = {
  Nearby: undefined;
  Matches: undefined;
  ChatList: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  Chat: { matchId: string; userId: string; userName: string };
  EditProfile: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

// Convenience nav types
export type AppNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<AppStackParamList>,
  BottomTabNavigationProp<AppTabParamList>
>;