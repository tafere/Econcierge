import { createContext, useContext, useState, ReactNode } from "react";
import { getLang, setLang, tr, type Lang } from "./i18n";

interface LangContextType {
  lang: Lang;
  t: (key: string) => string;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextType | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang());

  const toggleLang = () => {
    const next: Lang = lang === "en" ? "am" : "en";
    setLang(next);
    setLangState(next);
  };

  const t = (key: string) => tr(lang, key);

  return <LangContext.Provider value={{ lang, t, toggleLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be inside LangProvider");
  return ctx;
}
