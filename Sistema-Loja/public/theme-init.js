// Tema fixo: modo light (claro) — aplicado antes da hidratação para evitar flash
(function () {
  try {
    document.documentElement.classList.add("light");
    localStorage.setItem("theme", "light");
  } catch (err) {
    /* ignore */
  }
})();
