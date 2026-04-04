import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import AppLayout from "../layout/AppLayout";
import superUserMenu from "./superUserMenu";

export default function SuperUserLayout(props) {
  const navigate = useNavigate();
  const { user } = useUser();

  function handleNavigate(key) {
    navigate("/superuser/" + key);
  }

  return (
    <AppLayout
      userName={user?.email || ""}
      subtitle="מנהל מערכת"
      menuItems={superUserMenu}
      activeItemKey={props.activeItemKey}
      onNavigate={handleNavigate}
    >
      {props.children}
    </AppLayout>
  );
}