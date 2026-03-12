import React, { createContext, useContext, useState, useCallback } from 'react';

export const MascotaContext = createContext(null);

export const MascotaProvider = ({ children }) => {
  const [ctx, setCtx] = useState({ pantalla: 'home', datos: {} });
  const update = useCallback((patch) => setCtx(prev => ({ ...prev, ...patch })), []);
  return (
    <MascotaContext.Provider value={{ ctx, update }}>
      {children}
    </MascotaContext.Provider>
  );
};

/** Screens call this to set their context */
export const useMascotaUpdate = () => useContext(MascotaContext)?.update;

/** Internal — used by useMascotaContext hook */
export const useMascotaCtx = () => useContext(MascotaContext)?.ctx ?? { pantalla: 'home', datos: {} };
