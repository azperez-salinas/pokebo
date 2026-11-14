// Valores fijos de la demostración (ver AWS_MIGRATION_AGENT.md). Nada secreto vive acá.
export const REGION = 'us-east-2';
export const AVAILABILITY_ZONE = 'us-east-2a'; // una sola AZ: es una demo temporal, no producción

export const VPC_CIDR = '10.20.0.0/16';

// Puerto en el que escucha el Core API (PORT en docker-compose.yml)
export const CORE_PORT = 4000;
// Puerto interno del Edge API (solo dentro de la red Docker de la instancia; Caddy publica 80/443)
export const EDGE_PORT = 3000;
// Modelo de IA (no es secreto)
export const AI_MODEL = 'gemini-3.5-flash-lite';
// Imagen de Caddy (proxy HTTPS delante del Edge)
export const CADDY_IMAGE = 'caddy:2.8';

// Parámetros SSM (no secretos). Las etiquetas de imagen las escribe infra/scripts/release.sh.
export const PARAMS = {
  jwtPublicKey: '/pokebo/demo/jwt-public-key',
  coreUrl: '/pokebo/demo/core-url',
  edgePublicIp: '/pokebo/demo/edge-public-ip',
  coreImageTag: '/pokebo/demo/image-tag/core-api',
  edgeImageTag: '/pokebo/demo/image-tag/edge-api',
} as const;
export const MONGO_PORT = 27017;
export const REDIS_PORT = 6379;

export const TAGS = {
  Project: 'Pokebo',
  Environment: 'demo',
  ManagedBy: 'CDK',
} as const;
