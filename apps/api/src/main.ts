import {createOfferService} from './catalog/offers.js';
import {createCatalogV2} from './catalog/service.js';
import { createCatalog } from './business/catalog.js';
import { readConfig } from './config.js';
import { createLogger } from './logger.js';
import { createApiServer } from './server.js';
import { createDatabase } from './database/connection.js';

async function main() {
  const config = readConfig(process.env);
  const logger = createLogger(config.logLevel);
  const database = config.database ? createDatabase(config.database, () => logger.write({ event: 'server_error' })) : undefined;
  const app = createApiServer(config, logger, { isReady: () => database?.check() ?? false, catalog: database ? createCatalog(database.pool) : undefined, catalogV2:database?createCatalogV2(database.pool):undefined,offers:database?createOfferService(database.pool):undefined });
  try {
    await new Promise<void>((resolve, reject) => { app.server.once('error', reject); app.server.listen(config.port, config.host, resolve); });
  } catch { await database?.close(); throw new Error('API startup failed'); }
  app.server.on('error', () => logger.write({ event: 'server_error' }));
  const address = app.server.address();
  logger.write({ event: 'startup', port: typeof address === 'object' && address ? address.port : config.port });
  const stop = () => { app.shutdown().finally(() => database?.close()).catch(() => { logger.write({ event: 'server_error' }); process.exitCode = 1; }); };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}

main().catch(() => { createLogger('error').write({ event: 'configuration_error' }); process.exitCode = 1; });
