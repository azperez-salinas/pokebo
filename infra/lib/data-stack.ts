import { CfnOutput, RemovalPolicy, Size, Stack, StackProps, Validations } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';
import { AVAILABILITY_ZONE, MONGO_PORT, REDIS_PORT, REGION } from './config';
import { NetworkStack } from './network-stack';

export interface DataStackProps extends StackProps {
  readonly network: NetworkStack;
}

const SECRET_PREFIX = 'pokebo/demo';
export const SECRET_NAMES = {
  mongoRoot: `${SECRET_PREFIX}/mongo-root`,
  mongoApp: `${SECRET_PREFIX}/mongo-app`,
  redisAuth: `${SECRET_PREFIX}/redis-auth`,
  registrationPepper: `${SECRET_PREFIX}/registration-code-pepper`,
  loginPepper: `${SECRET_PREFIX}/login-code-pepper`,
  jwtPrivateKey: `${SECRET_PREFIX}/jwt-private-key`,
  aiProviderKey: `${SECRET_PREFIX}/ai-provider-key`,
  fcmServiceAccount: `${SECRET_PREFIX}/fcm-service-account`,
} as const;

// Recursos con estado de la demo (sección 8 y 9 del documento): secretos, MongoDB 7 en Docker sobre su propia EC2
// y ElastiCache Redis. Va en un stack aparte, con termination protection, para no perder datos por error.
export class DataStack extends Stack {
  public readonly secrets: Record<keyof typeof SECRET_NAMES, secretsmanager.ISecret>;
  public readonly mongoInstance: ec2.Instance;
  public readonly redis: elasticache.CfnReplicationGroup;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, { ...props, terminationProtection: true });
    const { network } = props;

    // ---------- Secretos ----------
    // Generados por Secrets Manager: el valor nunca pasa por Git, la plantilla ni los outputs.
    const generated = (name: string, length: number) =>
      new secretsmanager.Secret(this, `Secret-${name}`, {
        secretName: name,
        removalPolicy: RemovalPolicy.DESTROY,
        generateSecretString: { passwordLength: length, excludePunctuation: true },
      });
    const mongoRoot = generated(SECRET_NAMES.mongoRoot, 32);
    const mongoApp = generated(SECRET_NAMES.mongoApp, 32);
    const redisAuth = generated(SECRET_NAMES.redisAuth, 32);
    const registrationPepper = generated(SECRET_NAMES.registrationPepper, 48);
    const loginPepper = generated(SECRET_NAMES.loginPepper, 48);

    // Los que aporta una persona se crean vacíos: el valor se carga después con `aws secretsmanager put-secret-value`.
    const external = (key: 'jwtPrivateKey' | 'aiProviderKey' | 'fcmServiceAccount', description: string) => {
      new secretsmanager.CfnSecret(this, `Secret-${key}`, { name: SECRET_NAMES[key], description });
      return secretsmanager.Secret.fromSecretNameV2(this, `Ref-${key}`, SECRET_NAMES[key]);
    };
    const jwtPrivateKey = external('jwtPrivateKey', 'Clave privada JWT (PEM). Solo Core.');
    const aiProviderKey = external('aiProviderKey', 'API key del proveedor de IA. Solo Core.');
    const fcmServiceAccount = external('fcmServiceAccount', 'Cuenta de servicio de Firebase (JSON). Solo Lambda push.');

    this.secrets = {
      mongoRoot, mongoApp, redisAuth, registrationPepper, loginPepper, jwtPrivateKey, aiProviderKey, fcmServiceAccount,
    };
    Validations.of(this).acknowledge({
      id: 'AwsSolutions-SMG4',
      reason: 'Demo temporal de pocos dias: sin rotacion automatica. Los secretos se destruyen con el entorno.',
    });

    // ---------- MongoDB 7 + GridFS en su propia EC2 ----------
    const initAssets = new Asset(this, 'MongoInit', { path: path.join(__dirname, '..', '..', 'mongo-init') });

    const role = new iam.Role(this, 'MongoRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'MongoDB: Session Manager y lectura de sus dos secretos',
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')],
    });
    mongoRoot.grantRead(role);
    mongoApp.grantRead(role);
    // Solo el zip exacto con los scripts de inicializacion (sin comodines de bucket)
    role.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [initAssets.bucket.arnForObjects(initAssets.s3ObjectKey)],
    }));

    const userData = ec2.UserData.forLinux();
    this.mongoInstance = new ec2.Instance(this, 'Mongo', {
      vpc: network.vpc,
      vpcSubnets: network.appSubnets,
      securityGroup: network.mongoSg,
      // El plan FREE solo admite tipos elegibles para Free Tier (t3.medium fue rechazado); t3.small = 2 GiB
      instanceType: new ec2.InstanceType('t3.small'),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({ cpuType: ec2.AmazonLinuxCpuType.X86_64 }),
      role,
      userData,
      associatePublicIpAddress: false,
      creditSpecification: ec2.CpuCredits.STANDARD, // sin cobro por CPU surplus
      detailedMonitoring: false,
      disableApiTermination: true,
      blockDevices: [{
        deviceName: '/dev/xvda',
        volume: ec2.BlockDeviceVolume.ebs(16, { volumeType: ec2.EbsDeviceVolumeType.GP3, encrypted: true, deleteOnTermination: true }),
      }],
    });
    // IMDSv2 obligatorio; hop limit 2 para que los contenedores puedan obtener credenciales del rol
    const cfnInstance = this.mongoInstance.node.defaultChild as ec2.CfnInstance;
    cfnInstance.addPropertyOverride('MetadataOptions', { HttpTokens: 'required', HttpPutResponseHopLimit: 2, HttpEndpoint: 'enabled' });

    // Disco de datos aparte, cifrado y retenido aunque se borre el stack
    const dataVolume = new ec2.Volume(this, 'MongoData', {
      availabilityZone: AVAILABILITY_ZONE,
      size: Size.gibibytes(30),
      volumeType: ec2.EbsDeviceVolumeType.GP3,
      encrypted: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const attachment = new ec2.CfnVolumeAttachment(this, 'MongoDataAttachment', {
      device: '/dev/sdf',
      instanceId: this.mongoInstance.instanceId,
      volumeId: dataVolume.volumeId,
    });
    attachment.node.addDependency(this.mongoInstance);

    userData.addS3DownloadCommand({ bucket: initAssets.bucket, bucketKey: initAssets.s3ObjectKey, localFile: '/tmp/mongo-init.zip' });
    userData.addCommands(...mongoBootstrapScript({
      volumeId: dataVolume.volumeId,
      rootSecret: SECRET_NAMES.mongoRoot,
      appSecret: SECRET_NAMES.mongoApp,
    }));

    // ---------- ElastiCache Redis (motor Redis, no Valkey) ----------
    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnets', {
      description: 'PokebO demo: subred privada',
      subnetIds: network.vpc.selectSubnets(network.appSubnets).subnetIds,
    });
    this.redis = new elasticache.CfnReplicationGroup(this, 'Redis', {
      replicationGroupDescription: 'PokebO demo Redis (nodo unico)',
      engine: 'redis',
      engineVersion: '7.1',
      cacheNodeType: 'cache.t4g.micro',
      numCacheClusters: 1,
      automaticFailoverEnabled: false,
      multiAzEnabled: false,
      preferredCacheClusterAZs: [AVAILABILITY_ZONE],
      cacheSubnetGroupName: subnetGroup.ref,
      securityGroupIds: [network.redisSg.securityGroupId],
      port: REDIS_PORT,
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      // Referencia dinámica {{resolve:secretsmanager:...}}: CloudFormation la resuelve al desplegar, el valor no queda en la plantilla
      authToken: redisAuth.secretValue.unsafeUnwrap(),
      snapshotRetentionLimit: 0, // datos temporales: sin snapshots
      autoMinorVersionUpgrade: true,
    });

    Validations.of(this.redis).acknowledge({
      id: 'AwsSolutions-AEC4',
      reason: 'Nodo unico por diseno (demo en una sola AZ, sin failover): los datos son temporales.',
    });
    Validations.of(this.redis).acknowledge({
      id: 'AwsSolutions-AEC5',
      reason: 'El acceso esta limitado por Security Group al grupo de Core; cambiar el puerto no suma control.',
    });
    Validations.of(role).acknowledge({
      id: 'AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonSSMManagedInstanceCore]',
      reason: 'AmazonSSMManagedInstanceCore es la politica administrada estandar para Session Manager (sin SSH).',
    });
    Validations.of(this.mongoInstance).acknowledge({
      id: 'AwsSolutions-EC28',
      reason: 'Monitoreo detallado (1 min) tiene costo; el basico alcanza para la demo.',
    });
    Validations.of(this.mongoInstance).acknowledge({
      id: 'AwsSolutions-EC29',
      reason: 'Instancia unica con datos: un Auto Scaling Group no aplica a MongoDB en esta etapa.',
    });

    // Solo datos de conexion no secretos
    new CfnOutput(this, 'MongoPrivateIp', { value: this.mongoInstance.instancePrivateIp });
    new CfnOutput(this, 'RedisEndpoint', { value: this.redis.attrPrimaryEndPointAddress });
  }
}

// Arranque de MongoDB: ninguna credencial se escribe acá, el script las lee de Secrets Manager con el rol de la instancia.
function mongoBootstrapScript(o: { volumeId: string; rootSecret: string; appSecret: string }): string[] {
  return [
    'set -euxo pipefail',
    'dnf install -y docker unzip',
    // Docker debe esperar al disco de datos antes de relanzar el contenedor tras un reinicio
    'mkdir -p /data/mongo /opt/pokebo /etc/systemd/system/docker.service.d',
    'printf "[Unit]\\nRequiresMountsFor=/data/mongo\\n" > /etc/systemd/system/docker.service.d/mongo-mount.conf',
    // Disco de datos: se busca por id de volumen (los /dev/nvmeXn1 cambian de orden)
    `VOL_ID="${o.volumeId}"`,
    'DEV="/dev/disk/by-id/nvme-Amazon_Elastic_Block_Store_${VOL_ID//-/}"',
    'for i in $(seq 1 60); do [ -e "$DEV" ] && break; sleep 5; done',
    '[ -e "$DEV" ] || { echo "no aparecio el disco de datos"; exit 1; }',
    'blkid "$DEV" || mkfs.xfs "$DEV"',
    'UUID=$(blkid -s UUID -o value "$DEV")',
    'echo "UUID=$UUID /data/mongo xfs defaults,nofail 0 2" >> /etc/fstab',
    'mount -a',
    'systemctl daemon-reload',
    // 2 GiB de swap en el disco raíz: colchón ante picos de memoria con solo 2 GiB de RAM
    'fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile',
    'echo "/swapfile none swap sw 0 0" >> /etc/fstab',
    'systemctl enable --now docker',
    // Scripts de inicialización (usuario de la app + catálogo de especies), los mismos de docker-compose
    'mkdir -p /opt/pokebo/mongo-init && unzip -o /tmp/mongo-init.zip -d /opt/pokebo/mongo-init && chmod -R a+rX /opt/pokebo/mongo-init',
    // Credenciales: solo en un archivo temporal en memoria (tmpfs) con permisos 600
    'mkdir -p /run/pokebo && chmod 700 /run/pokebo',
    `get() { aws secretsmanager get-secret-value --region ${REGION} --secret-id "$1" --query SecretString --output text; }`,
    `{ echo "MONGO_INITDB_ROOT_USERNAME=root"; echo "MONGO_INITDB_ROOT_PASSWORD=$(get ${o.rootSecret})";` +
      ' echo "MONGO_INITDB_DATABASE=pokebo"; echo "MONGO_APP_USER=pokebo_app";' +
      ` echo "MONGO_APP_PASSWORD=$(get ${o.appSecret})"; } > /run/pokebo/mongo.env`,
    'chmod 600 /run/pokebo/mongo.env',
    'docker rm -f mongo 2>/dev/null || true',
    `docker run -d --name mongo --restart unless-stopped --env-file /run/pokebo/mongo.env -p ${MONGO_PORT}:${MONGO_PORT} ` +
      '-v /data/mongo:/data/db -v /opt/pokebo/mongo-init:/docker-entrypoint-initdb.d:ro ' +
      '--health-cmd "mongosh --quiet --eval \\"db.adminCommand(\'ping\').ok\\"" --health-interval 10s --health-timeout 5s --health-retries 10 ' +
      '--log-driver json-file --log-opt max-size=10m --log-opt max-file=3 mongo:7',
    // Catálogo de especies (upsert, idempotente). Se reintenta mientras Mongo termina su inicialización.
    'for i in $(seq 1 30); do ' +
      'docker exec --env-file /run/pokebo/mongo.env mongo sh -c \'exec mongosh --quiet --username "$MONGO_APP_USER" --password "$MONGO_APP_PASSWORD" --authenticationDatabase pokebo --file /docker-entrypoint-initdb.d/seed/import-species.js\' && break; sleep 10; done',
    'shred -u /run/pokebo/mongo.env',
  ];
}
