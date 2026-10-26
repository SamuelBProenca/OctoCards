(() => {
  const presets = {
    mine: { owner: "SamuelBProenca", repos: ["OctoCards", "LinkKeeper", "GreatMaker"] },
    akita: { owner: "akitaonrails", repos: ["akitaonrails.github.io", "FrankMD"] },
    lucas: { owner: "lucasmontano", repos: ["lucasmontano.com", "magic-link"] },
    filipe: { owner: "filipedeschamps", repos: ["tabnews.com.br", "video-maker"] },
    octocat: { owner: "octocat", repos: ["Hello-World", "Spoon-Knife"] }
  };
  const artPalettes = [
    { paper: "#dce5d8", ink: "#294232" },
    { paper: "#ead9b8", ink: "#493719" },
    { paper: "#e4cfc8", ink: "#492d28" },
    { paper: "#d5dce5", ink: "#29394d" },
    { paper: "#d9d7c5", ink: "#42442d" }
  ];
  const form = document.querySelector("#request-form");
  const ownerField = document.querySelector("#owner");
  const reposField = document.querySelector("#repos");
  const submitButton = document.querySelector("#submit-button");
  const statusLine = document.querySelector("#request-status");
  const errorPanel = document.querySelector("#error-panel");
  const loadingPanel = document.querySelector("#loading-panel");
  const cardsGrid = document.querySelector("#cards-grid");
  const jsonPanel = document.querySelector("#json-panel");
  const jsonContent = document.querySelector("#json-content");
  const resultToolbar = document.querySelector("#result-toolbar");
  const resultCount = document.querySelector("#result-count");
  const copyAllButton = document.querySelector("#copy-all-button");
  const cardsViewButton = document.querySelector("#cards-view-button");
  const jsonViewButton = document.querySelector("#json-view-button");
  const directApiLink = document.querySelector("#direct-api-link");
  const headerApiLink = document.querySelector("#header-api-link");
  const toast = document.querySelector("#toast");
  let activePayload = null;
  let requestNumber = 0;
  let toastTimer = 0;

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const selectedRepos = () => reposField.value.split(",").map((repo) => repo.trim()).filter(Boolean);
  const makeApiUrl = (owner, repos) => {
    if (repos.length === 1) return "/api/cards/" + encodeURIComponent(repos[0]) + "?owner=" + encodeURIComponent(owner);
    const url = new URL("/api/cards", window.location.origin);
    url.searchParams.set("repos", repos.join(","));
    url.searchParams.set("owner", owner);
    return url.pathname + url.search;
  };
  const updateApiLinks = () => {
    const owner = ownerField.value.trim();
    const repos = selectedRepos();
    const href = owner && repos.length ? makeApiUrl(owner, repos) : "/api/cards";
    directApiLink.href = href;
    headerApiLink.href = href;
  };
  const safeWebUrl = (value) => {
    try {
      const url = new URL(value, window.location.origin);
      return url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  };
  const formatCount = (value) => new Intl.NumberFormat("pt-BR", {
    notation: Number(value) >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(Number(value) || 0);
  const readmeExcerpt = (markdown) => {
    const lines = String(markdown || "")
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !/^(\x60{3}|~~~)/.test(line) && !/^\[?!\[/.test(line))
      .map((line) => line
        .replace(/^#{1,6}\s*/, "")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/<[^>]*>/g, "")
        .replace(/\x60/g, "")
        .replace(/[*_~]/g, "")
        .trim())
      .filter((line) => line && !/^[-=]{3,}$/.test(line));
    const excerpt = lines.find((line) => line.length > 12) || lines[0] || "Este repositório ainda não tem uma descrição disponível.";
    return excerpt.length > 166 ? excerpt.slice(0, 163).trimEnd() + "…" : excerpt;
  };
  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2100);
  };
  const copyText = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch {
        // Use the local fallback when clipboard permissions are not granted.
      }
    }
    const temporary = element("textarea");
    temporary.value = value;
    temporary.setAttribute("readonly", "");
    temporary.style.position = "fixed";
    temporary.style.opacity = "0";
    document.body.append(temporary);
    temporary.select();
    const copied = document.execCommand("copy");
    temporary.remove();
    if (!copied) throw new Error("Não foi possível copiar neste navegador.");
  };
  const setView = (view) => {
    const showJson = view === "json";
    cardsGrid.hidden = showJson || !activePayload;
    jsonPanel.hidden = !showJson || !activePayload;
    cardsViewButton.classList.toggle("is-active", !showJson);
    jsonViewButton.classList.toggle("is-active", showJson);
    cardsViewButton.setAttribute("aria-pressed", String(!showJson));
    jsonViewButton.setAttribute("aria-pressed", String(showJson));
  };
  const createArt = (card, index) => {
    const art = element("div", "repo-card__art");
    const palette = artPalettes[index % artPalettes.length];
    art.style.setProperty("--art-paper", palette.paper);
    art.style.setProperty("--art-ink", palette.ink);
    art.append(
      element("span", "art__eyebrow", "OCTOCARDS  /  PLATE " + String(index + 1).padStart(2, "0")),
      element("span", "art__number", String(index + 1).padStart(2, "0")),
      element("span", "art__repo", card.name || "Repositório")
    );
    const imageUrl = safeWebUrl(card.illustration_image_url);
    if (imageUrl && !imageUrl.includes("placehold.co")) {
      const image = element("img", "repo-card__image");
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("load", () => art.classList.add("has-image"), { once: true });
      image.addEventListener("error", () => image.remove(), { once: true });
      image.src = imageUrl;
      art.prepend(image);
    }
    return art;
  };
  const createMetric = (value, label) => {
    const metric = element("span", "metric");
    metric.append(element("span", "metric__value", formatCount(value)), element("span", "metric__label", label));
    return metric;
  };
  const createCard = (card, owner, index) => {
    const article = element("article", "repo-card");
    article.append(createArt(card, index));
    const body = element("div", "repo-card__body");
    const identity = element("p", "repo-card__owner", owner + " / repository");
    const title = element("a", "repo-card__title", card.name || "Repositório");
    const repositoryUrl = safeWebUrl(card.url) || "https://github.com/" + encodeURIComponent(owner) + "/" + encodeURIComponent(card.name || "");
    title.href = repositoryUrl;
    title.target = "_blank";
    title.rel = "noopener noreferrer";
    const description = element("p", "repo-card__description", readmeExcerpt(card.description));
    const metrics = element("div", "repo-card__metrics");
    metrics.append(createMetric(card.stars, "estrelas"), createMetric(card.forks, "forks"));
    const languages = element("div", "language-list");
    const languageNames = Array.isArray(card.principal_languages) && card.principal_languages.length
      ? card.principal_languages.slice(0, 4)
      : ["Desconhecido"];
    languageNames.forEach((language) => languages.append(element("span", "language-tag", language)));
    const actions = element("div", "repo-card__actions");
    const githubLink = element("a", "repo-card__github", "Ver no GitHub ↗");
    githubLink.href = repositoryUrl;
    githubLink.target = "_blank";
    githubLink.rel = "noopener noreferrer";
    const copyButton = element("button", "repo-card__copy", "Copiar JSON");
    copyButton.type = "button";
    copyButton.addEventListener("click", async () => {
      try {
        await copyText(JSON.stringify(card, null, 2));
        copyButton.textContent = "Copiado";
        showToast("JSON de " + (card.name || "repositório") + " copiado.");
        window.setTimeout(() => { copyButton.textContent = "Copiar JSON"; }, 1500);
      } catch (error) {
        showToast(error.message);
      }
    });
    actions.append(githubLink, copyButton);
    body.append(identity, title, description, metrics, languages, actions);
    article.append(body);
    return article;
  };
  const renderCards = (cards, owner) => {
    const fragment = document.createDocumentFragment();
    cards.forEach((card, index) => fragment.append(createCard(card, owner, index)));
    cardsGrid.replaceChildren(fragment);
  };
  const syncPageAddress = (owner, repos) => {
    const pageUrl = new URL(window.location.href);
    pageUrl.searchParams.set("owner", owner);
    pageUrl.searchParams.set("repos", repos.join(","));
    window.history.replaceState(null, "", pageUrl.pathname + pageUrl.search);
  };
  const loadCards = async () => {
    const owner = ownerField.value.trim();
    const repos = selectedRepos();
    const currentRequest = ++requestNumber;
    updateApiLinks();
    errorPanel.hidden = true;
    cardsGrid.hidden = true;
    jsonPanel.hidden = true;
    loadingPanel.hidden = false;
    resultToolbar.hidden = true;
    resultCount.textContent = "…";
    statusLine.textContent = "Consultando " + repos.length + (repos.length === 1 ? " repositório" : " repositórios") + " em " + owner + "…";
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
    if (!owner || repos.length === 0) {
      loadingPanel.hidden = true;
      errorPanel.textContent = "Informe uma conta do GitHub e ao menos um repositório.";
      errorPanel.hidden = false;
      statusLine.textContent = "A consulta precisa de uma conta e de um repositório.";
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
      return;
    }
    try {
      const response = await fetch(makeApiUrl(owner, repos), { headers: { Accept: "application/json" } });
      const payload = await response.json();
      if (!response.ok) {
        const apiError = payload && payload.error;
        if (apiError && apiError.code === "GITHUB_RATE_LIMITED") {
          throw new Error("A cota do GitHub usada pelo backend foi atingida. Configure TOKEN no servidor ou aguarde a renovação.");
        }
        const message = apiError && apiError.message;
        throw new Error(message || "A API respondeu com HTTP " + response.status + ".");
      }
      if (currentRequest !== requestNumber) return;
      const cards = Array.isArray(payload) ? payload : [payload];
      activePayload = payload;
      renderCards(cards, owner);
      jsonContent.textContent = JSON.stringify(payload, null, 2);
      resultCount.textContent = String(cards.length).padStart(2, "0");
      resultToolbar.hidden = false;
      loadingPanel.hidden = true;
      cardsGrid.hidden = false;
      copyAllButton.disabled = false;
      setView("cards");
      statusLine.textContent = cards.length + (cards.length === 1 ? " cartão recebido" : " cartões recebidos") + " · " + owner;
      syncPageAddress(owner, repos);
    } catch (error) {
      if (currentRequest !== requestNumber) return;
      activePayload = null;
      loadingPanel.hidden = true;
      cardsGrid.hidden = true;
      jsonPanel.hidden = true;
      resultToolbar.hidden = true;
      resultCount.textContent = "00";
      errorPanel.textContent = error.message || "Não foi possível consultar a API.";
      errorPanel.hidden = false;
      statusLine.textContent = "A consulta falhou. Confira os dados e tente novamente.";
    } finally {
      if (currentRequest === requestNumber) {
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
      }
    }
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    document.querySelectorAll(".preset-button").forEach((button) => {
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
    });
    loadCards();
  });
  document.querySelectorAll(".preset-button").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = presets[button.dataset.preset];
      if (!preset) return;
      ownerField.value = preset.owner;
      reposField.value = preset.repos.join(", ");
      document.querySelectorAll(".preset-button").forEach((item) => {
        const selected = item === button;
        item.classList.toggle("is-selected", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      loadCards();
    });
  });
  cardsViewButton.addEventListener("click", () => setView("cards"));
  jsonViewButton.addEventListener("click", () => setView("json"));
  copyAllButton.addEventListener("click", async () => {
    if (activePayload === null) return;
    try {
      await copyText(JSON.stringify(activePayload, null, 2));
      showToast("JSON da coleção copiado.");
    } catch (error) {
      showToast(error.message);
    }
  });
  ownerField.addEventListener("input", updateApiLinks);
  reposField.addEventListener("input", updateApiLinks);
  const params = new URLSearchParams(window.location.search);
  const requestedOwner = params.get("owner");
  const requestedRepos = params.get("repos");
  if (requestedOwner && requestedRepos) {
    ownerField.value = requestedOwner;
    reposField.value = requestedRepos;
    document.querySelectorAll(".preset-button").forEach((button) => {
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
    });
  } else {
    ownerField.value = presets.mine.owner;
    reposField.value = presets.mine.repos.join(", ");
  }
  updateApiLinks();
  loadCards();
})();
