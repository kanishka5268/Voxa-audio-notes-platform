export interface LanguageOption {
  code: string;
  label: string;
  nativeLabel?: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en-IN", label: "English (India)", nativeLabel: "English" },
  { code: "hi-IN", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "bn-IN", label: "Bengali", nativeLabel: "বাংলা" },
  { code: "kn-IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { code: "ml-IN", label: "Malayalam", nativeLabel: "മലയാളം" },
  { code: "mr-IN", label: "Marathi", nativeLabel: "मराठी" },
  { code: "ta-IN", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "te-IN", label: "Telugu", nativeLabel: "తెలుగు" },
];

export function getLanguageLabel(code?: string | null): string {
  if (!code) return "English (India)";
  
  // If single code
  const match = SUPPORTED_LANGUAGES.find((lang) => lang.code.toLowerCase() === code.toLowerCase());
  if (match) return match.label;

  // If multiple codes separated by commas (auto-detect)
  if (code.includes(",")) {
    const codes = code.split(",").map((c) => c.trim());
    const labels = codes
      .map((c) => SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === c.toLowerCase())?.label || c)
      .join(", ");
    return `Auto (${labels})`;
  }

  return code;
}
