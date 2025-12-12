import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getMyLevelInfo } from '../services/leveling';

export interface LevelContextType {
  level: number | null;
  loading: boolean;
  refreshLevel: () => Promise<void>;
}

const LevelContext = createContext<LevelContextType | undefined>(undefined);

export const LevelProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [level, setLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLevel = async () => {
    if (!user) {
      setLevel(null);
      setLoading(false);
      return;
    }

    try {
      // Don't set loading to true here to avoid flickering if refreshing
      const info = await getMyLevelInfo(user.username);
      setLevel(info.level);
    } catch (error) {
      console.error('Failed to fetch user level', error);
      // Don't clear level on error if we already have one, or maybe we should?
      // For now, keep it simple.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLevel();
  }, [user]);

  return (
    <LevelContext.Provider value={{ level, loading, refreshLevel: fetchLevel }}>
      {children}
    </LevelContext.Provider>
  );
};

export const useLevel = () => {
  const context = useContext(LevelContext);
  if (context === undefined) {
    throw new Error('useLevel must be used within a LevelProvider');
  }
  return context;
};
