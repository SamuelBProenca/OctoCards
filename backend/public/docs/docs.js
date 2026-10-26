(() => {
  const status = document.querySelector("#copy-status");
  let statusTimer = 0;

  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // Fall back when clipboard permission is unavailable.
      }
    }

    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    if (!copied) throw new Error("Não foi possível copiar neste navegador.");
  };

  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", async () => {
      const code = document.getElementById(button.dataset.copyTarget);
      if (!code || !status) return;
      try {
        await copyText(code.innerText || code.textContent || "");
        button.textContent = "Copiado";
        status.textContent = "Exemplo copiado para a área de transferência.";
        status.classList.add("is-visible");
        window.clearTimeout(statusTimer);
        statusTimer = window.setTimeout(() => {
          button.textContent = "Copiar";
          status.classList.remove("is-visible");
        }, 1800);
      } catch (error) {
        status.textContent = error.message;
        status.classList.add("is-visible");
      }
    });
  });
})();
