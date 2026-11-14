import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ComputeStack } from '../lib/compute-stack';
import { DataStack, SECRET_NAMES } from '../lib/data-stack';
import { MessagingStack } from '../lib/messaging-stack';
import { NetworkStack } from '../lib/network-stack';
import { RegistryStack } from '../lib/registry-stack';

const env = { account: '111111111111', region: 'us-east-2' };
const app = new App();
const network = new NetworkStack(app, 'Net', { env });
const data = new DataStack(app, 'Data', { env, network });
const messaging = new MessagingStack(app, 'Msg', { env, data });
const registry = new RegistryStack(app, 'Reg', { env });
const compute = new ComputeStack(app, 'Compute', { env, network, data, messaging, registry });
const template = Template.fromStack(compute);
const registryTemplate = Template.fromStack(registry);

const instances = () => Object.entries(template.findResources('AWS::EC2::Instance')) as [string, any][];
const instanceById = (prefix: string) => instances().find(([id]) => id.startsWith(prefix))![1];
const policiesOfRole = (rolePrefix: string) =>
  (Object.values(template.findResources('AWS::IAM::Policy')) as any[])
    .filter((p) => JSON.stringify(p.Properties.Roles).includes(rolePrefix))
    .flatMap((p) => p.Properties.PolicyDocument.Statement);
const json = JSON.stringify(template.toJSON());

test('ECR: dos repositorios con tags inmutables, escaneo al subir y lifecycle', () => {
  registryTemplate.resourceCountIs('AWS::ECR::Repository', 2);
  registryTemplate.allResourcesProperties('AWS::ECR::Repository', {
    ImageTagMutability: 'IMMUTABLE',
    ImageScanningConfiguration: { ScanOnPush: true },
    LifecyclePolicy: Match.objectLike({ LifecyclePolicyText: Match.stringLikeRegexp('imageCountMoreThan') }),
  });
});

test('Core t3.small y Edge t3.micro, créditos standard, IMDSv2 y sin IP pública automática', () => {
  expect(instances()).toHaveLength(2);
  for (const [prefix, type] of [['Core', 't3.small'], ['Edge', 't3.micro']]) {
    const i = instanceById(prefix);
    expect(i.Properties.InstanceType).toBe(type);
    expect(i.Properties.CreditSpecification).toEqual({ CPUCredits: 'standard' });
    expect(i.Properties.MetadataOptions).toEqual({ HttpTokens: 'required', HttpPutResponseHopLimit: 2, HttpEndpoint: 'enabled' });
    expect(i.Properties.NetworkInterfaces[0].AssociatePublicIpAddress).toBe(false);
  }
});

test('solo Edge recibe la IP elástica, que se retiene si se borra el stack', () => {
  template.resourceCountIs('AWS::EC2::EIP', 1);
  template.hasResource('AWS::EC2::EIP', { DeletionPolicy: 'Retain' });
  const association = Object.values(template.findResources('AWS::EC2::EIPAssociation'))[0] as any;
  expect(JSON.stringify(association.Properties.InstanceId)).toContain('Edge');
});

test('Core lee exactamente sus 6 secretos; Edge no lee ningún secreto', () => {
  const coreSecrets = policiesOfRole('CoreRole').filter((s: any) => JSON.stringify(s.Action).includes('secretsmanager:'));
  const coreSecretRefs = JSON.stringify(coreSecrets);
  for (const name of ['mongo-app', 'redis-auth', 'jwt-private-key', 'registration-code-pepper', 'login-code-pepper', 'ai-provider-key']) {
    expect(coreSecretRefs).toMatch(new RegExp(name.replace(/-/g, '-?') + '|' + name.replace(/-/g, ''), 'i'));
  }
  expect(coreSecretRefs).not.toMatch(/mongo-?root|fcm/i);
  const edgeStatements = JSON.stringify(policiesOfRole('EdgeRole'));
  expect(edgeStatements).not.toContain('secretsmanager:');
  expect(edgeStatements).not.toContain('sqs:');
});

test('Core publica en correo y push, consume feedback; Edge solo lee sus parámetros públicos', () => {
  const core = JSON.stringify(policiesOfRole('CoreRole'));
  expect(core).toContain('sqs:SendMessage');
  expect(core).toContain('sqs:ReceiveMessage');
  const edgeParams = policiesOfRole('EdgeRole').filter((s: any) => s.Action === 'ssm:GetParameter');
  expect(edgeParams).toHaveLength(1);
  expect(JSON.stringify(edgeParams[0].Resource)).not.toContain('*');
});

test('ningún secreto ni clave aparece en la plantilla; los valores se leen en el arranque', () => {
  expect(json).not.toMatch(/BEGIN (RSA )?PRIVATE KEY/);
  expect(json).toContain(`--secret-id ${SECRET_NAMES.jwtPrivateKey}`);
  expect(json).toContain('shred -u /run/pokebo/core.env');
  expect(json).toContain('shred -u /run/pokebo/edge.env');
});

test('Edge no publica su puerto: solo Caddy expone 80 y 443', () => {
  expect(json).toMatch(/docker run -d --name edge-api [^"]*--network pokebo/);
  expect(json).not.toMatch(/--name edge-api[^\n]*-p 3000/);
  expect(json).toContain('-p 80:80 -p 443:443');
});

test('logs de contenedores con retención de 7 días y salida https con sslip.io', () => {
  const groups = Object.values(template.findResources('AWS::Logs::LogGroup')) as any[];
  expect(groups).toHaveLength(3);
  expect(groups.every((g) => g.Properties.RetentionInDays === 7)).toBe(true);
  template.hasOutput('EdgeUrl', Match.anyValue());
  expect(json).toContain('.sslip.io');
});
