// Cliente local de exemplo para consultar a API do OctoCards sem abrir o playground.
// Requer Node.js 18+ (fetch nativo). Não usa nem envia token GitHub.

const API_BASE_URL = process.env.OCTOCARDS_API_URL ?? "http://localhost:3000";

// Edite esta coleção com o owner e os repositórios públicos que deseja consultar.
const collection = {
  owner: "octocat",
  repos: ["Hello-World", "Spoon-Knife"],
};

async function main() {
  const query = new URLSearchParams({
    owner: collection.owner,
    repos: collection.repos.join(","),
  });
  const url = `${API_BASE_URL.replace(/\/$/, "")}/api/cards?${query}`;

  console.log(`Consultando ${collection.repos.length} repositórios em ${API_BASE_URL}`);
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    console.error(`OctoCards respondeu HTTP ${response.status}:`);
    console.error(JSON.stringify(payload, null, 2));
    if (response.status === 429) {
      console.error("Aguarde o tempo indicado pelo cabeçalho Retry-After antes de tentar novamente.");
    }
    process.exitCode = 1;
    return;
  }

  for (const card of payload) {
    console.log(`\n${card.name} — ★ ${card.stars} — forks ${card.forks}`);
    console.log(card.url);
    console.log(`Linguagens: ${card.principal_languages.join(", ")}`);
    console.log(`Imagem: ${card.illustration_image_url}`);
  }

  console.log("\nJSON completo:");
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error("Não foi possível consultar a API do OctoCards:", error.message);
  console.error("Confira se o backend está rodando e se OCTOCARDS_API_URL aponta para a porta correta.");
  process.exitCode = 1;
});
