let toastContainer: HTMLElement | null = null;

function getContainer(): HTMLElement {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "branchly-toast-container";
    Object.assign(toastContainer.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: "10001",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      pointerEvents: "none",
    });
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(
  message: string,
  type: "success" | "error" | "info" = "info",
  duration = 4000
) {
  const container = getContainer();

  const colors = {
    success: { bg: "#059669", border: "#34d399" },
    error: { bg: "#dc2626", border: "#f87171" },
    info: { bg: "#6366f1", border: "#a5b4fc" },
  };

  const toast = document.createElement("div");
  Object.assign(toast.style, {
    background: colors[type].bg,
    border: `1px solid ${colors[type].border}`,
    color: "white",
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    pointerEvents: "auto",
    opacity: "0",
    transform: "translateY(10px)",
    transition: "opacity 0.2s, transform 0.2s",
    maxWidth: "320px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  });

  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";
  toast.innerHTML = `<span style="font-weight:bold">${icon}</span> ${message}`;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  // Remove after duration
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 200);
  }, duration);
}
