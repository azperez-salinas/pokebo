import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { DataStack, SECRET_NAMES } from '../lib/data-stack';
import { NetworkStack } from '../lib/network-stack';

const env = { account: '111111111111', region: 'us-east-2' };
const app = new App();
const network = new NetworkStack(app, 'Net', { env });
const stack = new DataStack(app, 'Data', { env, network });
const template = Template.fromStack(stack);
const json = JSON.stringify(template.toJSON());

test('el stack con estado tiene termination protection', () => {
  expect(stack.terminationProtection).toBe(true);
});

test('MongoDB: EC2 privada t3.small, créditos standard, IMDSv2 obligatorio y protegida contra terminación', () => {
  template.resourceCountIs('AWS::EC2::Instance', 1);
  template.hasResourceProperties('AWS::EC2::Instance', {
    InstanceType: 't3.small',
    CreditSpecification: { CPUCredits: 'standard' },
    DisableApiTermination: true,
    MetadataOptions: { HttpTokens: 'required', HttpPutResponseHopLimit: 2, HttpEndpoint: 'enabled' },
    BlockDeviceMappings: [Match.objectLike({ Ebs: Match.objectLike({ Encrypted: true, VolumeType: 'gp3' }) })],
  });
  const instance = Object.values(template.findResources('AWS::EC2::Instance'))[0] as any;
  expect(instance.Properties.NetworkInterfaces).toHaveLength(1);
  expect(instance.Properties.NetworkInterfaces[0].AssociatePublicIpAddress).toBe(false); // sin IP pública
  expect(instance.Properties.NetworkInterfaces[0].GroupSet).toHaveLength(1);
});

test('el disco de datos de MongoDB es gp3 de 30 GiB, cifrado y se conserva si se borra el stack', () => {
  template.hasResource('AWS::EC2::Volume', {
    Properties: { Size: 30, VolumeType: 'gp3', Encrypted: true, AvailabilityZone: 'us-east-2a' },
    DeletionPolicy: 'Retain',
  });
  template.resourceCountIs('AWS::EC2::VolumeAttachment', 1);
});

test('Redis: motor redis (no Valkey), nodo único cache.t4g.micro, cifrado en tránsito y en reposo, con autenticación', () => {
  template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
    Engine: 'redis',
    CacheNodeType: 'cache.t4g.micro',
    NumCacheClusters: 1,
    TransitEncryptionEnabled: true,
    AtRestEncryptionEnabled: true,
    AuthToken: Match.anyValue(),
    SnapshotRetentionLimit: 0,
  });
  const redis = Object.values(template.findResources('AWS::ElastiCache::ReplicationGroup'))[0] as any;
  // Referencia dinámica de Secrets Manager: el token no está en la plantilla
  expect(JSON.stringify(redis.Properties.AuthToken)).toContain('resolve:secretsmanager');
  expect(json).not.toMatch(/valkey/i);
});

test('los secretos tienen los nombres esperados y los aportados por personas se crean sin valor', () => {
  const names = Object.values(template.findResources('AWS::SecretsManager::Secret')).map((s: any) => s.Properties.Name);
  expect(names.sort()).toEqual(Object.values(SECRET_NAMES).sort());
  for (const key of ['jwtPrivateKey', 'aiProviderKey', 'fcmServiceAccount'] as const) {
    const secret = Object.values(template.findResources('AWS::SecretsManager::Secret'))
      .find((s: any) => s.Properties.Name === SECRET_NAMES[key]) as any;
    expect(secret.Properties.SecretString).toBeUndefined();
    expect(secret.Properties.GenerateSecretString).toBeUndefined();
  }
});

test('ninguna credencial ni clave aparece en la plantilla (user data, outputs, recursos)', () => {
  expect(json).not.toMatch(/BEGIN (RSA |EC )?PRIVATE KEY/);
  expect(json).not.toMatch(/MONGO_INITDB_ROOT_PASSWORD=[A-Za-z0-9]{8,}/); // solo $(get ...), nunca un valor literal
  const outputs = Object.keys(template.toJSON().Outputs ?? {});
  expect(outputs.sort()).toEqual(['MongoPrivateIp', 'RedisEndpoint']);
});

test('el rol de MongoDB lee únicamente sus dos secretos y el zip exacto de inicialización', () => {
  const policies = Object.values(template.findResources('AWS::IAM::Policy')) as any[];
  const statements = policies.flatMap((p) => p.Properties.PolicyDocument.Statement);
  const secretStatements = statements.filter((s: any) => ([] as string[]).concat(s.Action).some((a: string) => a.startsWith('secretsmanager:')));
  const readableSecrets = secretStatements.flatMap((s: any) => ([] as string[]).concat(s.Resource));
  expect(readableSecrets).toHaveLength(2);
  const s3 = statements.filter((s: any) => ([] as string[]).concat(s.Action).includes('s3:GetObject'));
  expect(s3).toHaveLength(1);
  expect(JSON.stringify(s3[0].Resource)).not.toContain('/*');
});

test('Redis queda en el Security Group de Redis y MongoDB en el de MongoDB (no comparten grupo)', () => {
  const redis = Object.values(template.findResources('AWS::ElastiCache::ReplicationGroup'))[0] as any;
  const mongo = Object.values(template.findResources('AWS::EC2::Instance'))[0] as any;
  expect(JSON.stringify(redis.Properties.SecurityGroupIds)).not.toEqual(JSON.stringify(mongo.Properties.NetworkInterfaces[0].GroupSet));
});
