// Shared bits for every page: background graffiti tags + footer links.
(function () {
  const cfg = window.VTS_CONFIG || {};

  // Scatter faint spray tags across the background
  const tags = document.querySelector(".tags");
  if (tags) {
    const words = ["VTS", "INK", "VTS INK", "★", "BEN", "CUSTOM", "✖", "VTS", "INK", "☠"];
    const n = window.innerWidth < 700 ? 8 : 16;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.textContent = words[i % words.length];
      s.style.left = Math.random() * 95 + "%";
      s.style.top = Math.random() * 95 + "%";
      s.style.fontSize = 40 + Math.random() * 110 + "px";
      s.style.transform = `rotate(${-25 + Math.random() * 50}deg)`;
      if (i % 4 === 0) s.style.color = "#b6ff1a";
      tags.appendChild(s);
    }
  }

  // Footer: year + optional Instagram
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  document.querySelectorAll("[data-instagram]").forEach((el) => {
    if (cfg.instagram) el.href = cfg.instagram;
    else (el.closest("[data-instagram-wrap]") || el).remove();
  });
})();
