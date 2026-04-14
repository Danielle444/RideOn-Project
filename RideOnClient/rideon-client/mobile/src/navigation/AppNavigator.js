import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MobileEntryGateScreen from "../screens/navigation/MobileEntryGateScreen";
import SelectActiveRoleScreen from "../screens/role-selection/SelectActiveRoleScreen";
import ChangePasswordScreen from "../screens/auth/ChangePasswordScreen";

import AdminHomeScreen from "../screens/roles/admin/screens/AdminHomeScreen";
import AdminCompetitionsBoardScreen from "../screens/roles/admin/screens/AdminCompetitionsBoardScreen";
import AdminProfileScreen from "../screens/roles/admin/screens/AdminProfileScreen";
import AdminPayersScreen from "../screens/roles/admin/screens/AdminPayersScreen";


import AdminCompetitionDetailsScreen from "../screens/roles/admin/screens/AdminCompetitionDetailsScreen";
import AdminCompetitionRegistrationsScreen from "../screens/roles/admin/screens/AdminCompetitionRegistrationsScreen";
import AdminCompetitionRidersScreen from "../screens/roles/admin/screens/AdminCompetitionRidersScreen";
import AdminCompetitionHorsesScreen from "../screens/roles/admin/screens/AdminCompetitionHorsesScreen";
import AdminCompetitionPayersScreen from "../screens/roles/admin/screens/AdminCompetitionPayersScreen";
import AdminCompetitionTrainersScreen from "../screens/roles/admin/screens/AdminCompetitionTrainersScreen";
import AdminCompetitionClassesScreen from "../screens/roles/admin/screens/AdminCompetitionClassesScreen";
import AdminCompetitionStallsShavingsScreen from "../screens/roles/admin/screens/AdminCompetitionStallsShavingsScreen";
import AdminCompetitionPaidTimesScreen from "../screens/roles/admin/screens/AdminCompetitionPaidTimesScreen";
import AdminCompetitionHealthCertificatesScreen from "../screens/roles/admin/screens/AdminCompetitionHealthCertificatesScreen";
import AdminAddPayerScreen from "../screens/roles/admin/screens/AdminAddPayerScreen";
import AdminEditPayerScreen from "../screens/roles/admin/screens/AdminEditPayerScreen";
import AdminCompetitionPayerAccountScreen from "../screens/roles/admin/screens/AdminCompetitionPayerAccountScreen";

import PayerHomeScreen from "../screens/roles/payer/screens/PayerHomeScreen";
import PayerCompetitionsBoardScreen from "../screens/roles/payer/screens/PayerCompetitionsBoardScreen";
import PayerCompetitionAccountScreen from "../screens/roles/payer/screens/PayerCompetitionAccountScreen";
import PayerCompetitionClassesScreen from "../screens/roles/payer/screens/PayerCompetitionClassesScreen";
import PayerCompetitionPaidTimesScreen from "../screens/roles/payer/screens/PayerCompetitionPaidTimesScreen";
import PayerCompetitionStallsScreen from "../screens/roles/payer/screens/PayerCompetitionStallsScreen";
import PayerProfileScreen from "../screens/roles/payer/screens/PayerProfileScreen";

import WorkerHomeScreen from "../screens/roles/worker/screens/WorkerHomeScreen";
import WorkerShavingsOrdersScreen from "../screens/roles/worker/screens/WorkerShavingsOrdersScreen";
import WorkerCompetitionsBoardScreen from "../screens/roles/worker/screens/WorkerCompetitionsBoardScreen";
import WorkerCompetitionShavingsOrdersScreen from "../screens/roles/worker/screens/WorkerCompetitionShavingsOrdersScreen";
import WorkerCompetitionStallMapScreen from "../screens/roles/worker/screens/WorkerCompetitionStallMapScreen";
import WorkerCompetitionMessagesScreen from "../screens/roles/worker/screens/WorkerCompetitionMessagesScreen";
import WorkerProfileScreen from "../screens/roles/worker/screens/WorkerProfileScreen";

import GuardedScreen from "./GuardedScreen";

const Stack = createNativeStackNavigator();

function withGuard(screenProps, allowedRoles, element) {
  return (
    <GuardedScreen
      navigation={screenProps.navigation}
      allowedRoles={allowedRoles}
    >
      {element}
    </GuardedScreen>
  );
}

export default function AppNavigator(props) {
  return (
    <Stack.Navigator
      initialRouteName="MobileEntryGate"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MobileEntryGate" component={MobileEntryGateScreen} />

      <Stack.Screen name="SelectActiveRole">
        {function (screenProps) {
          return (
            <SelectActiveRoleScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="ChangePassword">
        {function (screenProps) {
          return (
            <ChangePasswordScreen {...screenProps} onLogout={props.onLogout} />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminHome">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["אדמין חווה"],
            <AdminHomeScreen {...screenProps} onLogout={props.onLogout} />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminCompetitionsBoard">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["אדמין חווה"],
            <AdminCompetitionsBoardScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminProfile">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["אדמין חווה"],
            <AdminProfileScreen {...screenProps} onLogout={props.onLogout} />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminPayers">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["אדמין חווה"],
            <AdminPayersScreen {...screenProps} onLogout={props.onLogout} />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminAddPayer">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["אדמין חווה"],
            <AdminAddPayerScreen {...screenProps} onLogout={props.onLogout} />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminEditPayer">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["אדמין חווה"],
            <AdminEditPayerScreen {...screenProps} onLogout={props.onLogout} />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminCompetitionDetails">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["אדמין חווה"],
            <AdminCompetitionDetailsScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminCompetitionRegistrations">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["אדמין חווה"],
            <AdminCompetitionRegistrationsScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminCompetitionRiders">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["אדמין חווה"],
            <AdminCompetitionRidersScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminCompetitionHorses">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["אדמין חווה"],
            <AdminCompetitionHorsesScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminCompetitionPayers">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["אדמין חווה"],
            <AdminCompetitionPayersScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminCompetitionPayerAccount">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["אדמין חווה"],
            <AdminCompetitionPayerAccountScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminCompetitionTrainers">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["אדמין חווה"],
            <AdminCompetitionTrainersScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminCompetitionClasses">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["אדמין חווה"],
            <AdminCompetitionClassesScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminCompetitionStallsShavings">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["אדמין חווה"],
            <AdminCompetitionStallsShavingsScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminCompetitionPaidTimes">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["אדמין חווה"],
            <AdminCompetitionPaidTimesScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminCompetitionHealthCertificates">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["אדמין חווה"],
            <AdminCompetitionHealthCertificatesScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="PayerHome">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["משלם"],
            <PayerHomeScreen {...screenProps} onLogout={props.onLogout} />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="PayerCompetitionsBoard">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["משלם"],
            <PayerCompetitionsBoardScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="PayerProfile">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["משלם"],
            <PayerProfileScreen {...screenProps} onLogout={props.onLogout} />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="PayerCompetitionAccount">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["משלם"],
            <PayerCompetitionAccountScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="PayerCompetitionClasses">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["משלם"],
            <PayerCompetitionClassesScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="PayerCompetitionPaidTimes">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["משלם"],
            <PayerCompetitionPaidTimesScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="PayerCompetitionStalls">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["משלם"],
            <PayerCompetitionStallsScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="WorkerHome">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["עובד חווה"],
            <WorkerHomeScreen {...screenProps} onLogout={props.onLogout} />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="WorkerCompetitionsBoard">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["עובד חווה"],
            <WorkerCompetitionsBoardScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="WorkerProfile">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["עובד חווה"],
            <WorkerProfileScreen {...screenProps} onLogout={props.onLogout} />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="WorkerShavingsOrders">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["עובד חווה"],
            <WorkerShavingsOrdersScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="WorkerCompetitionShavingsOrders">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["עובד חווה"],
            <WorkerCompetitionShavingsOrdersScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="WorkerCompetitionStallMap">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["עובד חווה"],
            <WorkerCompetitionStallMapScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="WorkerCompetitionMessages">
        {function (screenProps) {
          return withGuard(
            screenProps,
            ["עובד חווה"],
            <WorkerCompetitionMessagesScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>
    </Stack.Navigator>
  );
}