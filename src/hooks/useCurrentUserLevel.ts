import { useLevel } from '../context/LevelContext';

export const useCurrentUserLevel = () => {
  return useLevel();
};
