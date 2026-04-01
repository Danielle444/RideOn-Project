import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import { useAuth } from "../../context/AuthContext";
import SecretaryTopBar from "./SecretaryTopBar";
import SecretarySidebarGeneral from "./SecretarySidebarGeneral";
import SecretarySidebarCompetition from "./SecretarySidebarCompetition";

export default function SecretaryLayout(props) {
  const navigate = useNavigate();

  const { user } = useUser();
  const { activeRole } = useActiveRole();
  const { logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function handleNotificationsClick() {
    alert("מסך התראות יתחבר כאן בהמשך");
  }

  function handleGeneralNavigate(itemKey) {
    if (itemKey === "competitions-board") {
      navigate("/competitions");
      return;
    }

    alert("המסך יתחבר כאן בהמשך");
  }

  function handleCompetitionNavigate() {
    alert("המסך יתחבר כאן בהמשך");
  }

  function handleBackToCompetitions() {
    navigate("/competitions");
  }

  const SidebarComponent =
    props.sidebarMode === "competition"
      ? SecretarySidebarCompetition
      : SecretarySidebarGeneral;

  return (
    <div dir="rtl" className="min-h-screen bg-[#F5F1EE]">
      <SecretaryTopBar
        onLogout={handleLogout}
        onNotificationsClick={handleNotificationsClick}
      />

      <div className="min-h-[calc(100vh-48px)] flex">
        <SidebarComponent
          userName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
          roleName={activeRole?.roleName || ""}
          ranchName={activeRole?.ranchName || "לא נבחרה חווה"}
          activeItemKey={props.activeItemKey}
          onNavigate={
            props.sidebarMode === "competition"
              ? handleCompetitionNavigate
              : handleGeneralNavigate
          }
          onBackToCompetitions={handleBackToCompetitions}
        />

        <main className="flex-1 p-6">{props.children}</main>
      </div>
    </div>
  );
}