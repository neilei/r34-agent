"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

// Define the session context type
type SessionContextType = {
  sessionId: string | null;
};

// Create context with default values
const SessionContext = createContext<SessionContextType>({
  sessionId: null,
});

// Custom hook to use session context
export const useSession = () => useContext(SessionContext);

export function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Check if a session ID already exists in local storage
    let storedSessionId = localStorage.getItem("sessionId");
    
    // If no session ID exists, generate a new one and store it
    if (!storedSessionId) {
      storedSessionId = uuidv4();
      localStorage.setItem("sessionId", storedSessionId);
    }
    
    setSessionId(storedSessionId);
  }, []);

  return (
    <SessionContext.Provider value={{ sessionId }}>
      {children}
    </SessionContext.Provider>
  );
}
