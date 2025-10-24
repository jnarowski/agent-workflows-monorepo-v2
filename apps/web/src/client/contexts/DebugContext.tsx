import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

interface DebugContextType {
  debugMode: boolean;
  toggleDebugMode: () => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function DebugProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize debug mode from URL parameter
  const [debugMode, setDebugMode] = useState(() => {
    return searchParams.get('debug') === 'true';
  });

  // Sync with URL parameter when it changes externally
  useEffect(() => {
    const urlDebugMode = searchParams.get('debug') === 'true';
    if (urlDebugMode !== debugMode) {
      setDebugMode(urlDebugMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const toggleDebugMode = () => {
    setDebugMode((prev) => {
      const newValue = !prev;

      // Update URL parameter
      setSearchParams((params) => {
        const newParams = new URLSearchParams(params);
        if (newValue) {
          newParams.set('debug', 'true');
        } else {
          newParams.delete('debug');
        }
        return newParams;
      }, { replace: true });

      return newValue;
    });
  };

  return (
    <DebugContext.Provider value={{ debugMode, toggleDebugMode }}>
      {children}
    </DebugContext.Provider>
  );
}

// Export hook separately to satisfy fast refresh requirements
// eslint-disable-next-line react-refresh/only-export-components
export function useDebug() {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}
