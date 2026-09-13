"use client";

import { createContext, useContext, type ReactNode } from "react";

type AccessProfileContextValue = {
  isSalesEmployee: boolean;
};

const AccessProfileContext = createContext<AccessProfileContextValue>({ isSalesEmployee: false });

export function AccessProfileProvider({ isSalesEmployee, children }: { isSalesEmployee: boolean; children: ReactNode }) {
  return <AccessProfileContext.Provider value={{ isSalesEmployee }}>{children}</AccessProfileContext.Provider>;
}

export function useAccessProfile() {
  return useContext(AccessProfileContext);
}
