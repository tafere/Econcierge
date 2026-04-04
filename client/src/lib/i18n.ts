export type Lang = "en" | "am";

const translations: Record<Lang, Record<string, string>> = {
  en: {
    howCanWeHelp:        "How can we help you?",
    room:                "Room",
    selectCategory:      "Select a category",
    options:             "options",
    back:                "Back",
    quantity:            "Quantity",
    max:                 "max",
    addInstructions:     "Add special instructions",
    instructionsHint:    "Any special instructions…",
    sendRequest:         "Send Request",
    sending:             "Sending…",
    requestReceived:     "Request Received!",
    teamWillAssist:      "Our team will assist you shortly. Thank you for your patience.",
    makeAnotherRequest:  "Make another request",
    invalidQr:           "This QR code is invalid or has been disabled. Please contact the front desk.",
    myRequests:          "My Requests",
    pending:             "Pending",
    inProgress:          "In Progress",
    done:                "Done",
    upTo:                "up to",
    addToCart:           "Add to Cart",
    yourCart:            "Your Cart",
    cartItems:           "items",
    viewCart:            "Tap to review",
    sendAll:             "Send All",
    cartEmpty:           "Your cart is empty — add items above",
  },
  am: {
    howCanWeHelp:        "እንዴት ልናግዝዎ እንችላለን?",
    room:                "ክፍል",
    selectCategory:      "ምድብ ይምረጡ",
    options:             "አማራጮች",
    back:                "ተመለስ",
    quantity:            "ብዛት",
    max:                 "ከፍተኛ",
    addInstructions:     "ልዩ መመሪያ ያክሉ",
    instructionsHint:    "ልዩ መመሪያ ካለ ይጻፉ…",
    sendRequest:         "ጥያቄ ላክ",
    sending:             "በመላክ ላይ…",
    requestReceived:     "ጥያቄ ተቀብሏል!",
    teamWillAssist:      "ቡድናችን በቅርቡ ይረዳዎታል። ለትዕግስትዎ እናመሰግናለን።",
    makeAnotherRequest:  "ሌላ ጥያቄ ያቅርቡ",
    invalidQr:           "ይህ QR ኮድ ልክ ያልሆነ ወይም ተሰናክሏል። እባክዎ የፊት ጠረጴዛ ሰራተኞችን ያነጋግሩ።",
    myRequests:          "የኔ ጥያቄዎች",
    pending:             "በጥበቃ ላይ",
    inProgress:          "በሂደት ላይ",
    done:                "ተጠናቋል",
    upTo:                "እስከ",
    addToCart:           "ወደ ቅርጫት ጨምር",
    yourCart:            "የእርስዎ ቅርጫት",
    cartItems:           "ዕቃዎች",
    viewCart:            "ለማየት ይጫኑ",
    sendAll:             "ሁሉንም ላክ",
    cartEmpty:           "ቅርጫትዎ ባዶ ነው — ከላይ ዕቃዎችን ይጨምሩ",
  },
};

export function tr(lang: Lang, key: string): string {
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}

export function getLang(): Lang {
  return (localStorage.getItem("eco_lang") as Lang) ?? "en";
}

export function setLang(lang: Lang) {
  localStorage.setItem("eco_lang", lang);
}
