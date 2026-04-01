import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

import { AuthProvider } from "./context/AuthContext.jsx";
import { UserProvider } from "./context/UserContext.jsx";
import { ActiveRoleProvider } from "./context/ActiveRoleContext.jsx";

createRoot(document.getElementById("root")).render(
  <UserProvider>
    <ActiveRoleProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ActiveRoleProvider>
  </UserProvider>,
);
