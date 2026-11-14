import { Stack, StackProps, Validations } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { AVAILABILITY_ZONE, CORE_PORT, MONGO_PORT, REDIS_PORT, VPC_CIDR } from './config';

// Red de la demo (sección 5 del documento): una AZ, una subred pública (Edge + NAT) y una privada
// compartida por Core, MongoDB y ElastiCache (decisión del equipo 2026-11-14). Sin SSH: se administra con Session Manager.
export class NetworkStack extends Stack {
  public readonly vpc: ec2.Vpc;
  public readonly edgeSg: ec2.SecurityGroup;
  public readonly coreSg: ec2.SecurityGroup;
  public readonly mongoSg: ec2.SecurityGroup;
  public readonly redisSg: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr(VPC_CIDR),
      availabilityZones: [AVAILABILITY_ZONE],
      natGateways: 1, // la salida de las privadas (SQS, Secrets Manager, IA, docker pull) pasa por un único NAT
      restrictDefaultSecurityGroup: true,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24, mapPublicIpOnLaunch: false },
        // Core, MongoDB y Redis comparten la subred privada; el aislamiento entre ellos lo dan los Security Groups.
        // MongoDB necesita salida (NAT) para bajar la imagen y hablar con SSM/Secrets Manager.
        { name: 'app', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
      ],
    });

    const group = (name: string, description: string, allowAllOutbound: boolean) =>
      new ec2.SecurityGroup(this, name, { vpc: this.vpc, description, allowAllOutbound });

    // Edge: único punto de entrada público
    this.edgeSg = group('EdgeSg', 'Edge: HTTPS desde internet', true);
    this.edgeSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS publico');
    this.edgeSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Redireccion a HTTPS y validacion ACME');

    // Decisiones aprobadas por el equipo (2026-11-14), justificadas para cdk-nag:
    Validations.of(this.edgeSg).acknowledge({
      id: 'AwsSolutions-EC23',
      reason: 'Edge es el unico punto de entrada publico por diseno: solo 443 y 80 (redireccion HTTPS y validacion ACME).',
    });
    Validations.of(this.vpc).acknowledge({
      id: 'AwsSolutions-VPC7',
      reason: 'Demo academica temporal: el equipo decidio no registrar el trafico de red (Flow Logs). Se puede activar si hace falta diagnosticar.',
    });

    // Core: solo acepta al grupo de Edge
    this.coreSg = group('CoreSg', 'Core: solo desde Edge', true);
    this.coreSg.addIngressRule(this.edgeSg, ec2.Port.tcp(CORE_PORT), 'Edge a Core');

    // MongoDB: solo desde Core
    this.mongoSg = group('MongoSg', 'MongoDB: solo desde Core', true);
    this.mongoSg.addIngressRule(this.coreSg, ec2.Port.tcp(MONGO_PORT), 'Core a MongoDB');

    // Redis: solo desde Core, sin salida
    this.redisSg = group('RedisSg', 'ElastiCache Redis: solo desde Core', false);
    this.redisSg.addIngressRule(this.coreSg, ec2.Port.tcp(REDIS_PORT), 'Core a Redis');
  }

  public get publicSubnets(): ec2.SubnetSelection {
    return { subnetGroupName: 'public' };
  }
  public get appSubnets(): ec2.SubnetSelection {
    return { subnetGroupName: 'app' };
  }
}
