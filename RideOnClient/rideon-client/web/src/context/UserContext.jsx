import { createContext, useContext, useState } from "react";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isUserHydrated, setIsUserHydrated] = useState(false);

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        isUserHydrated,
        setIsUserHydrated,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used inside UserProvider");
  }

  return context;
}