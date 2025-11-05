import { createContext, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type BusyState = { visible: boolean; message?: string };
type BusyApi = {
  show: (message?: string) => void;
  hide: () => void;
  run: <T>(fn: () => Promise<T>, message?: string) => Promise<T>;
};

const BusyCtx = createContext<BusyApi | null>(null);

export function useBusy() {
  const ctx = useContext(BusyCtx);
  if (!ctx) throw new Error("useBusy must be used within <BusyProvider>");
  return ctx;
}

export function BusyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BusyState>({ visible: false });

  const api: BusyApi = {
    show: (message) => setState({ visible: true, message }),
    hide: () => setState({ visible: false }),
    run: async (fn, message) => {
      setState({ visible: true, message });
      try {
        const res = await fn();
        return res;
      } finally {
        setState({ visible: false });
      }
    },
  };

  return (
    <BusyCtx.Provider value={api}>
      {children}
      {state.visible &&
        createPortal(
          <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/40 backdrop-blur-sm">
            <div className="rounded-2xl bg-white p-6 shadow-xl w-[320px] text-center">
              <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
              <p className="text-sm text-neutral-700">
                {state.message ?? "Processando..."}
              </p>
            </div>
          </div>,
          document.body
        )}
    </BusyCtx.Provider>
  );
}
