import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { NetworkStack } from '../lib/network-stack';

const stack = new NetworkStack(new App(), 'Test', { env: { account: '111111111111', region: 'us-east-2' } });
const template = Template.fromStack(stack);

const groupIdOf = (description: string) => {
  const found = Object.entries(template.findResources('AWS::EC2::SecurityGroup'))
    .find(([, resource]) => (resource as any).Properties.GroupDescription === description);
  if (!found) throw new Error(`No existe el Security Group "${description}"`);
  return found[0];
};

test('una sola AZ, una subred pública y una privada, y un único NAT', () => {
  template.resourceCountIs('AWS::EC2::Subnet', 2);
  template.resourceCountIs('AWS::EC2::NatGateway', 1);
  template.resourceCountIs('AWS::EC2::InternetGateway', 1);
  const zones = new Set(Object.values(template.findResources('AWS::EC2::Subnet')).map((s: any) => s.Properties.AvailabilityZone));
  expect(zones).toEqual(new Set(['us-east-2a']));
});

test('solo la subred pública enruta al Internet Gateway y ninguna asigna IP pública por defecto', () => {
  template.resourceCountIs('AWS::EC2::Route', 2); // 1 hacia el IGW + 1 hacia el NAT
  const subnets = Object.values(template.findResources('AWS::EC2::Subnet')) as any[];
  expect(subnets.every((s) => s.Properties.MapPublicIpOnLaunch === false)).toBe(true);
  template.resourceCountIs('AWS::EC2::EIP', 1); // la del NAT; la de Edge irá en el stack de cómputo
});

test('solo Edge acepta tráfico de internet (80 y 443); ningún otro grupo lo hace', () => {
  const open = Object.values(template.findResources('AWS::EC2::SecurityGroup'))
    .flatMap((r: any) => r.Properties.SecurityGroupIngress ?? [])
    .filter((rule: any) => rule.CidrIp === '0.0.0.0/0');
  expect(open.map((rule: any) => rule.FromPort).sort()).toEqual([443, 80]);
  // Las únicas otras reglas son las de grupo a grupo: Edge->Core, Core->MongoDB y Core->Redis
  const groupRules = Object.values(template.findResources('AWS::EC2::SecurityGroupIngress')) as any[];
  expect(groupRules).toHaveLength(3);
  expect(groupRules.every((rule) => rule.Properties.SourceSecurityGroupId && !rule.Properties.CidrIp)).toBe(true);
});

test.each([
  ['Core: solo desde Edge', 4000, 'Edge: HTTPS desde internet'],
  ['MongoDB: solo desde Core', 27017, 'Core: solo desde Edge'],
  ['ElastiCache Redis: solo desde Core', 6379, 'Core: solo desde Edge'],
])('%s acepta únicamente el puerto %i desde el grupo de origen', (target, port, source) => {
  const rules = Object.values(template.findResources('AWS::EC2::SecurityGroupIngress')) as any[];
  const matching = rules.filter((r) => r.Properties.GroupId?.['Fn::GetAtt']?.[0] === groupIdOf(target));
  expect(matching).toHaveLength(1);
  expect(matching[0].Properties).toEqual(expect.objectContaining({
    FromPort: port,
    ToPort: port,
    IpProtocol: 'tcp',
    SourceSecurityGroupId: { 'Fn::GetAtt': [groupIdOf(source), 'GroupId'] },
  }));
});

test('Redis no tiene salida y el Security Group por defecto de la VPC queda cerrado', () => {
  const redis: any = template.findResources('AWS::EC2::SecurityGroup')[groupIdOf('ElastiCache Redis: solo desde Core')];
  expect(redis.Properties.SecurityGroupEgress).toEqual([
    expect.objectContaining({ CidrIp: '255.255.255.255/32' }),
  ]);
  template.hasResourceProperties('Custom::VpcRestrictDefaultSG', Match.objectLike({ Account: Match.anyValue() }));
});
