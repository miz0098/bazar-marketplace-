import { readConfig } from './config.js';
import { createLogger } from './logger.js';
import { createApiServer } from './server.js';

async function main() {
  const config = readConfig(process.env);
  const logger = createLogger(config.logLevel);
  const app = createApiServer(config, logger);
  await new Promise<void>((resolve, reject) => { app.server.once('error', reject); app.server.listen(config.port, config.host, resolve); });
  app.server.on('error', () => logger.write({ event: 'server_error' }));
  const address = app.server.address();
  logger.write({ event: 'startup', port: typeof address === 'object' && address ? address.port : config.port });
  const stop = () => { app.shutdown().catch(() => { logger.write({ event: 'server_error' }); process.exitCode = 1; }); };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}

main().catch(() => { createLogger('error').write({ event: 'configuration_error' }); process.exitCode = 1; });
