import type { ReactNode } from "react";

export default function TransfersLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        .transfers-ui .text-\\[9px\\] { font-size: 14px !important; line-height: 1.55 !important; }
        .transfers-ui .text-\\[10px\\] { font-size: 15px !important; line-height: 1.55 !important; }
        .transfers-ui .text-\\[11px\\] { font-size: 16px !important; line-height: 1.55 !important; }
        .transfers-ui .text-xs { font-size: 16px !important; line-height: 1.6 !important; }
        .transfers-ui .text-sm { font-size: 18px !important; line-height: 1.6 !important; }
        .transfers-ui input,
        .transfers-ui select,
        .transfers-ui textarea,
        .transfers-ui button { font-size: max(14px, 0.875rem); }
        .transfers-ui table { font-size: 15px; }
        .transfers-ui table thead { font-size: 14px; }
      `}</style>
      {children}
    </>
  );
}
