import { OctoCardRepos } from "./src/utils/getRepos";

(async () => {
  const repos = ['repo1', 'repo2'];
  const results = await OctoCardRepos(repos);
  console.log(JSON.stringify(results, null, 2));
})();
