import { createContext, useContext, useEffect, useRef } from "react";

export const RefreshContext = createContext(0);
export const useRefreshKey = () => useContext(RefreshContext);

export function useStaggerLoad(load, refreshKey, initialDelay = 0) {
  const isInitial = useRef(true);
  useEffect(() => {
    const delay = isInitial.current ? initialDelay : 0;
    isInitial.current = false;
    if (!delay) { load(); return; }
    const t = setTimeout(load, delay);
    return () => clearTimeout(t);
  }, [load, refreshKey]);
}
