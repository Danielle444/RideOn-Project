import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MobileEntryGateScreen from "../screens/navigation/MobileEntryGateScreen";
import SelectActiveRoleScreen from "../screens/role-selection/SelectActiveRoleScreen";
import ChangePasswordScreen from "../screens/auth/ChangePasswordScreen";
import AdminHomeScreen from "../screens/roles/admin/screens/AdminHomeScreen";
import AdminCompetitionsBoardScreen from "../screens/roles/admin/screens/AdminCompetitionsBoardScreen";
import AdminProfileScreen from "../screens/roles/admin/screens/AdminProfileScreen";
import PayerHomeScreen from "../screens/roles/payer/screens/PayerHomeScreen";
import PayerCompetitionsBoardScreen from "../screens/roles/payer/screens/PayerCompetitionsBoardScreen";
import WorkerShavingsOrdersScreen from "../screens/roles/worker/screens/WorkerShavingsOrdersScreen";

const Stack = createNativeStackNavigator();

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
          return <AdminHomeScreen {...screenProps} onLogout={props.onLogout} />;
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminCompetitionsBoard">
        {function (screenProps) {
          return (
            <AdminCompetitionsBoardScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="AdminProfile">
        {function (screenProps) {
          return (
            <AdminProfileScreen {...screenProps} onLogout={props.onLogout} />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="PayerHome">
        {function (screenProps) {
          return <PayerHomeScreen {...screenProps} onLogout={props.onLogout} />;
        }}
      </Stack.Screen>

      <Stack.Screen name="PayerCompetitionsBoard">
        {function (screenProps) {
          return (
            <PayerCompetitionsBoardScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="WorkerShavingsOrders">
        {function (screenProps) {
          return (
            <WorkerShavingsOrdersScreen
              {...screenProps}
              onLogout={props.onLogout}
            />
          );
        }}
      </Stack.Screen>
    </Stack.Navigator>
  );
}