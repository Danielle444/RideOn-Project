import { createContext, useContext, useState } from "react";
import {
  saveActiveCompetition,
  getActiveCompetition,
  clearActiveCompetition,
} from "../services/storageService";

const CompetitionContext = createContext(null);

export function CompetitionProvider(props) {
  const [activeCompetition, setActiveCompetition] = useState(null);

  async function hydrateActiveCompetition() {
    const storedCompetition = await getActiveCompetition();
    setActiveCompetition(storedCompetition);
  }

  async function setActiveCompetitionAndPersist(nextCompetition) {
    await saveActiveCompetition(nextCompetition);
    setActiveCompetition(nextCompetition);
  }

  async function clearCompetition() {
    await clearActiveCompetition();
    setActiveCompetition(null);
  }

  return (
    <CompetitionContext.Provider
      value={{
        activeCompetition,
        setActiveCompetition,
        hydrateActiveCompetition,
        setActiveCompetitionAndPersist,
        clearCompetition,
      }}
    >
      {props.children}
    </CompetitionContext.Provider>
  );
}

export function useCompetition() {
  const context = useContext(CompetitionContext);

  if (!context) {
    throw new Error("useCompetition must be used inside CompetitionProvider");
  }

  return context;
}