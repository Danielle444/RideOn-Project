import { createContext, useContext, useState } from "react";
import {
  saveActiveRole,
  removeActiveRole,
} from "../services/storageService";

const ActiveRoleContext = createContext(null);

export function ActiveRoleProvider(props) {
  const [activeRole, setActiveRole] = useState(null);

  async function setActiveRoleAndPersist(nextActiveRole) {
    await saveActiveRole(nextActiveRole);
    setActiveRole(nextActiveRole);
  }

  async function clearActiveRole() {
    await removeActiveRole();
    setActiveRole(null);
  }

  return (
    <ActiveRoleContext.Provider
      value={{
        activeRole,
        setActiveRole,
        setActiveRoleAndPersist,
        clearActiveRole,
      }}
    >
      {props.children}
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