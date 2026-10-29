"use client";

import { createContext, useContext, type ReactNode } from "react";

type AccessProfileContextValue = {
  isSalesEmployee: boolean;
  isAccountant: boolean;
};

const AccessProfileContext = createContext<AccessProfileContextValue>({ isSalesEmployee: false, isAccountant: false });

export function AccessProfileProvider({ isSalesEmployee, isAccountant = false, children }: { isSalesEmployee: boolean; isAccountant?: boolean; children: ReactNode }) {
  return <AccessProfileContext.Provider value={{ isSalesEmployee, isAccountant }}>{children}</AccessProfileContext.Provider>;
}

export function useAccessProfile() {
  return useContext(AccessProfileContext);
}
