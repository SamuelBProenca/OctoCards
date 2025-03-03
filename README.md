# OctoCards

**OctoCards** is an API that simplifies the creation of portfolios for developers by transforming raw data from GitHub repositories into structured and display-ready "cards". With it, you can automatically showcase relevant information—such as description (README), languages, stars, forks, and images.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Contributions](#contributions)
- [License](#license)

---

## Features

- **GitHub Integration**: Fetches repository information via API.
- **Formatted Data**: Transforms raw data into JSON objects following the `PropsGitCard` interface.
- **Multiple Repositories Support**: Allows fetching data from multiple repositories in a single request.
- **Flexible Configuration**: Define a default owner via environment variable, with the possibility to override.
- **Security**: Tokens and sensitive configurations are stored in the backend, protecting your credentials.
- **Modularity**: Code is divided into controllers, services, routes, types, utils, and config for easier maintenance.

---

## Installation

To install the package via npm, run the following command:

```bash
npm install octocards@latest
```

Or, if you prefer to clone the repository:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/OctoCards.git
   cd OctoCards/backend
   ```

2. **Install the dependencies:**
   ```bash
   npm install
   ```

---

## Configuration

Create a `.env` file in the root of the `backend` directory with the following variables:
```env
OWNER=YourGitHubUsername
PORT=3000 or your preferred port
TOKEN=your_optional_github_token
```

Configurations are centralized in `config/octoConfig.ts`, which imports the variables from `.env` to be used throughout the application.

---

## Usage

### Running the Server in Development

To run the API locally, use:
```bash
npm run dev
```
The API will be available at:  
```
http://localhost:3000/api/cards
```

### Quick Test

You can test the functionality for multiple repositories using the `testOctoCardRepos.ts` file (in the root or a tests folder):
```bash
npx ts-node testOctoCardRepos.ts
```

---

## API Endpoints

### 1. Get Data from a Single Repository

- **Endpoint:**  
  `GET /api/cards/:repo`
- **Parameters:**  
  - `:repo` (path) – Repository name.
  - `owner` (optional query) – To override the default owner.
- **Example:**  
  ```bash
  GET http://localhost:3000/api/cards/OctoCards?owner=your_username
  ```
- **Description:**  
  Returns a JSON object containing formatted repository data according to the `PropsGitCard` interface.

### 2. Get Data from Multiple Repositories

- **Endpoint:**  
  `GET /api/cards`
- **Query Parameters:**  
  - `repos` (required) – Comma-separated list of repository names (e.g., `repos=repo1,repo2`).
  - `owner` (optional query) – To override the default owner.
- **Example:**  
  ```bash
  GET http://localhost:3000/api/cards?repos=repo1,repo2&owner=your_username
  ```
- **Description:**  
  Returns an array of JSON objects, each representing the data of a repository.

---

## Project Structure

```
backend/
├── config/
│   └── octoConfig.ts       // Environment variables (OWNER, PORT, TOKEN)
├── controllers/
│   └── gitCardController.ts // Functions handling HTTP requests
├── routes/
│   └── gitCardRoutes.ts     // Definition of API endpoints
├── services/
│   └── gitCardService.ts    // Logic for fetching and formatting GitHub data
├── types/
│   └── gitCardType.ts       // PropsGitCard interface
├── utils/
│   └── getRepos.ts          // Function to fetch data from multiple repositories
├── index.ts                 // Application entry point
├── package.json             // Dependencies and scripts
├── tsconfig.json            // TypeScript configuration
└── .env                     // Environment variables (not committed)
```

---

## Contributions

Contributions are welcome!  
- Fork the repository.
- Create a branch for your feature: `git checkout -b my-feature`.
- Commit your changes: `git commit -m 'My new feature'`.
- Push your branch: `git push origin my-feature`.
- Open a Pull Request.

Please follow coding best practices and keep the documentation updated.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

With this README, we hope users and developers understand how to use and contribute to the **OctoCards** API. If you need any more modifications or additions, let me know!

---
