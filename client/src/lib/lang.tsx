import { createContext, useContext, useState, ReactNode } from "react";
import { getLang, setLang, tr, type Lang } from "./i18n";

interface LangContextType {
  lang: Lang;
  t: (key: string) => string;
  setLanguage: (l: Lang) => void;
}

const LangContext = createContext<LangContextType | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang());

  const setLanguage = (l: Lang) => {
    setLang(l);
    setLangState(l);
  };

  const t = (key: string) => tr(lang, key);

  return <LangContext.Provider value={{ lang, t, setLanguage }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be inside LangProvider");
  return ctx;
}
