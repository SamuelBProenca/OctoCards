import config from './config/octoConfig';
import { createApp } from './app';

const app = createApp();

app.listen(config.port, () => {
    console.log('Servidor rodando na porta ' + config.port);
});