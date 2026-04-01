import { createContext, useContext, useState } from "react";
import { saveActiveRole, getRememberMe } from "../services/storageService";

const ActiveRoleContext = createContext(null);

export function ActiveRoleProvider({ children }) {
  const [activeRole, setActiveRole] = useState(null);

  function setActiveRoleAndPersist(role) {
    const rememberMe = getRememberMe();
    saveActiveRole(role, rememberMe);
    setActiveRole(role);
  }

  return (
    <ActiveRoleContext.Provider
      value={{
        activeRole,
        setActiveRole,
        setActiveRoleAndPersist,
      }}
    >
      {children}
    </ActiveRoleContext.Provider>
  );
}

export function useActiveRole() {
  const context = useContext(ActiveRoleContext);

  if (!context) {
    throw new Error("useActiveRole must be used inside ActiveRoleProvider");
  }

  return context;
}