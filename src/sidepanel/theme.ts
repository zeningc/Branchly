export interface Theme {
  bg: string;
  bgSecondary: string;
  bgHover: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentLight: string;
  treeLine: string;
  activeNodeBg: string;
  inputBg: string;
  inputBorder: string;
}

export const darkTheme: Theme = {
  bg: "#1a1a2e",
  bgSecondary: "#2a2a4a",
  bgHover: "#2a2a4a",
  text: "#e0e0e0",
  textMuted: "#888",
  border: "#2a2a4a",
  accent: "#6366f1",
  accentLight: "#a5b4fc",
  treeLine: "#3a3a5e",
  activeNodeBg: "rgba(99, 102, 241, 0.15)",
  inputBg: "#2a2a4a",
  inputBorder: "#3a3a5e",
};

export const lightTheme: Theme = {
  bg: "#ffffff",
  bgSecondary: "#f3f4f6",
  bgHover: "#e5e7eb",
  text: "#1f2937",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  accent: "#6366f1",
  accentLight: "#818cf8",
  treeLine: "#d1d5db",
  activeNodeBg: "rgba(99, 102, 241, 0.1)",
  inputBg: "#f9fafb",
  inputBorder: "#d1d5db",
};
