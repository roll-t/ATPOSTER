import { MongoClient } from 'mongodb';
import { Resolver } from 'dns/promises';
import { DATABASE_CONFIG } from '../../config/database.config.js';

export async function resolveMongodbUri(rawUri) {
  if (!rawUri || typeof rawUri !== 'string') return DATABASE_CONFIG.DEFAULT_URI;
  const uri = rawUri.trim();
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    return DATABASE_CONFIG.DEFAULT_URI;
  }
  if (!uri.startsWith('mongodb+srv://')) {
    return uri;
  }
  try {
    const match = uri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/);
    if (!match) return uri;
    const [, username, password, hostname, database = '', options = ''] = match;
    const resolver = new Resolver();
    resolver.setServers(DATABASE_CONFIG.DNS_SERVERS);
    const addresses = await resolver.resolveSrv('_mongodb._tcp.' + hostname);
    if (!addresses || addresses.length === 0) return uri;
    const hosts = addresses.map(addr => `${addr.name}:${addr.port}`).join(',');
    const optParams = new URLSearchParams(options);
    if (!optParams.has('ssl')) optParams.set('ssl', 'true');
    if (!optParams.has('authSource')) optParams.set('authSource', 'admin');
    return `mongodb://${username}:${password}@${hosts}/${database}?${optParams.toString()}`;
  } catch (error) {
    console.error('[DNS SRV Resolve Error] Fallback URI:', error);
    return uri;
  }
}

export async function createMongoClient(rawUri) {
  const uri = await resolveMongodbUri(rawUri || DATABASE_CONFIG.DEFAULT_URI);
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: DATABASE_CONFIG.SERVER_SELECTION_TIMEOUT_MS,
  });
  return client.connect();
}

export default {
  resolveMongodbUri,
  createMongoClient,
};
