#!/usr/bin/env node
import { App, Tags, Validations } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { REGION, TAGS } from '../lib/config';
import { ComputeStack } from '../lib/compute-stack';
import { DataStack } from '../lib/data-stack';
import { RegistryStack } from '../lib/registry-stack';
import { MessagingStack } from '../lib/messaging-stack';
import { NetworkStack } from '../lib/network-stack';

const app = new App();

// Cuenta tomada de la identidad autenticada; la Región queda fija (regla del proyecto: solo us-east-2).
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: REGION };

const network = new NetworkStack(app, 'PokeboNetwork', { env, description: 'PokebO demo: VPC, subredes, NAT y Security Groups' });
const data = new DataStack(app, 'PokeboData', { env, network, description: 'PokebO demo: secretos, MongoDB 7 (EC2 + EBS) y ElastiCache Redis' });
const messaging = new MessagingStack(app, 'PokeboMessaging', { env, data, description: 'PokebO demo: SQS, DynamoDB y Lambdas de correo (SES) y push (FCM)' });
const registry = new RegistryStack(app, 'PokeboRegistry', { env, description: 'PokebO demo: repositorios ECR de Core y Edge' });
new ComputeStack(app, 'PokeboCompute', {
  env, network, data, messaging, registry,
  description: 'PokebO demo: EC2 de Core (privada) y Edge (publica con IP elastica y Caddy)',
});

for (const [key, value] of Object.entries(TAGS)) Tags.of(app).add(key, value);
Validations.of(app).addPlugins(new AwsSolutionsChecks(app, { verbose: true }));
