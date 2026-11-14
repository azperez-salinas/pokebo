import { CfnOutput, Fn, RemovalPolicy, Stack, StackProps, Validations } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { AI_MODEL, CADDY_IMAGE, CORE_PORT, EDGE_PORT, MONGO_PORT, PARAMS, REDIS_PORT, REGION } from './config';
import { DataStack, SECRET_NAMES } from './data-stack';
import { MessagingStack } from './messaging-stack';
import { NetworkStack } from './network-stack';
import { RegistryStack } from './registry-stack';

export interface ComputeStackProps extends StackProps {
  readonly network: NetworkStack;
  readonly data: DataStack;
  readonly messaging: MessagingStack;
  readonly registry: RegistryStack;
}

// Core (privado) y Edge (público con IP elástica + Caddy). Cada EC2 corre su contenedor desde ECR.
// La etiqueta de imagen se lee de SSM en cada arranque del servicio `pokebo-app`, así que actualizar
// la app no reemplaza la máquina (ni reemite el certificado de Edge): ver infra/scripts/release.sh.
export class ComputeStack extends Stack {
  public readonly core: ec2.Instance;
  public readonly edge: ec2.Instance;
  public readonly edgeIp: ec2.CfnEIP;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);
    const { network, data, messaging, registry } = props;

    const paramArn = (name: string) => `arn:${this.partition}:ssm:${this.region}:${this.account}:parameter${name}`;
    const logGroup = (name: string) => new logs.LogGroup(this, `Logs-${name}`, {
      logGroupName: `/pokebo/demo/${name}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const instanceRole = (id: string, description: string) => {
      const role = new iam.Role(this, id, {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        description,
        managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')],
      });
      // El token de ECR no admite restringir por recurso (la descarga sí: grantPull por repositorio)
      role.addToPolicy(new iam.PolicyStatement({ actions: ['ecr:GetAuthorizationToken'], resources: ['*'] }));
      Validations.of(role).acknowledge({
        id: 'AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonSSMManagedInstanceCore]',
        reason: 'Politica administrada estandar para Session Manager (sin SSH).',
      });
      Validations.of(role).acknowledge({
        id: 'AwsSolutions-IAM5[Resource::*]',
        reason: 'ecr:GetAuthorizationToken no admite permisos a nivel de recurso; la descarga de imagenes esta limitada a un repositorio.',
      });
      return role;
    };

    const baseInstance = (id: string, o: {
      subnets: ec2.SubnetSelection; sg: ec2.ISecurityGroup; type: string; role: iam.IRole; userData: ec2.UserData;
    }) => {
      const instance = new ec2.Instance(this, id, {
        vpc: network.vpc,
        vpcSubnets: o.subnets,
        securityGroup: o.sg,
        instanceType: new ec2.InstanceType(o.type),
        machineImage: ec2.MachineImage.latestAmazonLinux2023({ cpuType: ec2.AmazonLinuxCpuType.X86_64 }),
        role: o.role,
        userData: o.userData,
        userDataCausesReplacement: true, // la instancia no guarda estado: si cambia su arranque, se recrea
        associatePublicIpAddress: false,
        creditSpecification: ec2.CpuCredits.STANDARD,
        detailedMonitoring: false,
        blockDevices: [{
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(12, { volumeType: ec2.EbsDeviceVolumeType.GP3, encrypted: true, deleteOnTermination: true }),
        }],
      });
      (instance.node.defaultChild as ec2.CfnInstance).addPropertyOverride('MetadataOptions', {
        HttpTokens: 'required', HttpPutResponseHopLimit: 2, HttpEndpoint: 'enabled',
      });
      Validations.of(instance).acknowledge({ id: 'AwsSolutions-EC28', reason: 'Monitoreo detallado tiene costo; el basico alcanza para la demo.' });
      Validations.of(instance).acknowledge({ id: 'AwsSolutions-EC29', reason: 'Demo con una instancia por servicio; sin Auto Scaling en esta etapa.' });
      return instance;
    };

    // ======================= Core (subred privada) =======================
    const coreLogs = logGroup('core-api');
    const coreRole = instanceRole('CoreRole', 'Core: imagen de ECR, sus secretos, colas SQS y logs');
    registry.coreRepo.grantPull(coreRole);
    for (const key of ['mongoApp', 'redisAuth', 'jwtPrivateKey', 'registrationPepper', 'loginPepper', 'aiProviderKey'] as const) {
      data.secrets[key].grantRead(coreRole);
    }
    messaging.otpEmailQueue.grantSendMessages(coreRole);
    messaging.pushQueue.grantSendMessages(coreRole);
    messaging.pushFeedbackQueue.grantConsumeMessages(coreRole);
    coreLogs.grantWrite(coreRole);
    coreRole.addToPolicy(new iam.PolicyStatement({ actions: ['ssm:GetParameter'], resources: [paramArn(PARAMS.coreImageTag)] }));

    const coreUserData = ec2.UserData.forLinux();
    coreUserData.addCommands(
      'set -euxo pipefail',
      'dnf install -y docker',
      'systemctl enable --now docker',
      'mkdir -p /opt/pokebo',
      'cat > /opt/pokebo/start.sh <<\'SCRIPT\'',
      ...coreStartScript({
        repoUri: registry.coreRepo.repositoryUri,
        mongoHost: data.mongoInstance.instancePrivateIp,
        redisHost: data.redis.attrPrimaryEndPointAddress,
        otpQueueUrl: messaging.otpEmailQueue.queueUrl,
        pushQueueUrl: messaging.pushQueue.queueUrl,
        feedbackQueueUrl: messaging.pushFeedbackQueue.queueUrl,
        logGroup: coreLogs.logGroupName,
      }),
      'SCRIPT',
      ...serviceUnitCommands(),
    );
    this.core = baseInstance('Core', {
      subnets: network.appSubnets, sg: network.coreSg, type: 't3.small', role: coreRole, userData: coreUserData,
    });

    // Edge lee la URL del Core de SSM al arrancar: si Core se recrea (otra IP), basta reiniciar el servicio de Edge
    const coreUrlParam = new ssm.StringParameter(this, 'CoreUrl', {
      parameterName: PARAMS.coreUrl,
      stringValue: `http://${this.core.instancePrivateIp}:${CORE_PORT}`,
      description: 'URL privada del Core para Edge (no secreta)',
    });

    // ======================= Edge (subred publica + IP elastica) =======================
    // IP fija: de ella sale el hostname <ip-con-guiones>.sslip.io que usa la app. Se retiene aunque se borre el stack.
    this.edgeIp = new ec2.CfnEIP(this, 'EdgeIp', { domain: 'vpc', tags: [{ key: 'Name', value: 'pokebo-demo-edge' }] });
    this.edgeIp.applyRemovalPolicy(RemovalPolicy.RETAIN);
    const edgeIpParam = new ssm.StringParameter(this, 'EdgePublicIpParam', {
      parameterName: PARAMS.edgePublicIp,
      stringValue: this.edgeIp.attrPublicIp,
      description: 'IP elastica de Edge (no secreta)',
    });

    const edgeLogs = logGroup('edge-api');
    const caddyLogs = logGroup('caddy');
    const edgeRole = instanceRole('EdgeRole', 'Edge: imagen de ECR, parametros publicos y logs (sin secretos)');
    registry.edgeRepo.grantPull(edgeRole);
    edgeLogs.grantWrite(edgeRole);
    caddyLogs.grantWrite(edgeRole);
    edgeRole.addToPolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [PARAMS.jwtPublicKey, PARAMS.coreUrl, PARAMS.edgePublicIp, PARAMS.edgeImageTag].map(paramArn),
    }));

    const edgeUserData = ec2.UserData.forLinux();
    edgeUserData.addCommands(
      'set -euxo pipefail',
      // La salida a internet aparece cuando se asocia la IP elastica (instantes despues de crear la instancia)
      'for i in $(seq 1 60); do curl -s -m 5 -o /dev/null https://ssm.' + REGION + '.amazonaws.com && break; sleep 5; done',
      'dnf install -y docker',
      'systemctl enable --now docker',
      'mkdir -p /opt/pokebo /var/lib/caddy',
      'cat > /opt/pokebo/start.sh <<\'SCRIPT\'',
      ...edgeStartScript({
        repoUri: registry.edgeRepo.repositoryUri,
        edgeLogGroup: edgeLogs.logGroupName,
        caddyLogGroup: caddyLogs.logGroupName,
      }),
      'SCRIPT',
      ...serviceUnitCommands(),
    );
    this.edge = baseInstance('Edge', {
      subnets: network.publicSubnets, sg: network.edgeSg, type: 't3.micro', role: edgeRole, userData: edgeUserData,
    });
    // El arranque de Edge necesita estos parametros ya creados
    this.edge.node.addDependency(coreUrlParam, edgeIpParam);
    new ec2.CfnEIPAssociation(this, 'EdgeIpAssociation', {
      allocationId: this.edgeIp.attrAllocationId,
      instanceId: this.edge.instanceId,
    });

    const host = Fn.join('', [Fn.join('-', Fn.split('.', this.edgeIp.attrPublicIp)), '.sslip.io']);
    new CfnOutput(this, 'EdgeUrl', { value: Fn.join('', ['https://', host]), description: 'EXPO_PUBLIC_API_URL de la app' });
    new CfnOutput(this, 'EdgePublicIp', { value: this.edgeIp.attrPublicIp });
    new CfnOutput(this, 'CorePrivateIp', { value: this.core.instancePrivateIp });
  }
}

// Servicio systemd que ejecuta /opt/pokebo/start.sh en cada arranque (y cuando se reinicia a mano)
function serviceUnitCommands(): string[] {
  return [
    'chmod 700 /opt/pokebo/start.sh',
    'cat > /etc/systemd/system/pokebo-app.service <<\'UNIT\'',
    '[Unit]',
    'Description=PokebO: contenedor de la aplicacion',
    'After=docker.service network-online.target',
    'Requires=docker.service',
    'Wants=network-online.target',
    '[Service]',
    'Type=oneshot',
    'RemainAfterExit=yes',
    'ExecStart=/opt/pokebo/start.sh',
    'TimeoutStartSec=900',
    '[Install]',
    'WantedBy=multi-user.target',
    'UNIT',
    'systemctl daemon-reload',
    'systemctl enable --now pokebo-app.service',
  ];
}

// Bloque común: espera la etiqueta de imagen publicada por release.sh, se autentica en ECR y descarga la imagen.
// (Sin "${...}" de bash: el texto pasa por plantillas de TypeScript.)
function pullImageLines(repoUri: string, tagParam: string): string[] {
  return [
    '#!/bin/bash',
    'set -euo pipefail',
    `REGION=${REGION}`,
    `REPO=${repoUri}`,
    'REGISTRY=$(echo "$REPO" | cut -d/ -f1)',
    'TAG=""',
    `for i in $(seq 1 90); do TAG=$(aws ssm get-parameter --region "$REGION" --name ${tagParam} --query Parameter.Value --output text 2>/dev/null || true); [ -n "$TAG" ] && break; sleep 10; done`,
    '[ -n "$TAG" ] || { echo "No hay etiqueta de imagen publicada"; exit 1; }',
    'aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"',
    'docker pull "$REPO:$TAG"',
    'umask 077',
    'mkdir -p /run/pokebo',
  ];
}

const awslogs = (group: string, stream: string) =>
  `--log-driver awslogs --log-opt awslogs-region=${REGION} --log-opt awslogs-group=${group} --log-opt awslogs-stream=${stream}`;

// Core: arma su configuración con secretos leídos en el momento (archivo en memoria, 600, borrado al terminar)
function coreStartScript(o: {
  repoUri: string; mongoHost: string; redisHost: string;
  otpQueueUrl: string; pushQueueUrl: string; feedbackQueueUrl: string; logGroup: string;
}): string[] {
  const get = (name: string) => `$(aws secretsmanager get-secret-value --region "$REGION" --secret-id ${name} --query SecretString --output text)`;
  return [
    ...pullImageLines(o.repoUri, PARAMS.coreImageTag),
    '{',
    `  echo "PORT=${CORE_PORT}"`,
    '  echo "NODE_ENV=production"',
    '  echo "AWS_REGION=$REGION"',
    `  echo "MONGO_URI=mongodb://pokebo_app:${get(SECRET_NAMES.mongoApp)}@${o.mongoHost}:${MONGO_PORT}/pokebo?authSource=pokebo"`,
    `  echo "REDIS_URI=rediss://:${get(SECRET_NAMES.redisAuth)}@${o.redisHost}:${REDIS_PORT}"`,
    // PEM en una línea con \n escapados (formato que espera core-api/src/config)
    `  printf 'JWT_PRIVATE_KEY=%s\\n' "$(aws secretsmanager get-secret-value --region "$REGION" --secret-id ${SECRET_NAMES.jwtPrivateKey} --query SecretString --output text | awk 'NF {sub(/\\r/, ""); printf "%s\\\\n", $0}')"`,
    `  echo "REGISTRATION_CODE_PEPPER=${get(SECRET_NAMES.registrationPepper)}"`,
    `  echo "LOGIN_CODE_PEPPER=${get(SECRET_NAMES.loginPepper)}"`,
    `  echo "AI_PROVIDER_API_KEY=${get(SECRET_NAMES.aiProviderKey)}"`,
    `  echo "AI_MODEL=${AI_MODEL}"`,
    `  echo "OTP_EMAIL_QUEUE_URL=${o.otpQueueUrl}"`,
    `  echo "PUSH_QUEUE_URL=${o.pushQueueUrl}"`,
    `  echo "PUSH_FEEDBACK_QUEUE_URL=${o.feedbackQueueUrl}"`,
    '} > /run/pokebo/core.env',
    'docker rm -f core-api 2>/dev/null || true',
    `docker run -d --name core-api --restart unless-stopped --env-file /run/pokebo/core.env -p ${CORE_PORT}:${CORE_PORT} ` +
      `--health-cmd "wget -qO- http://127.0.0.1:${CORE_PORT}/health || exit 1" --health-interval 30s --health-timeout 5s --health-retries 3 ` +
      `${awslogs(o.logGroup, 'core-api')} "$REPO:$TAG"`,
    'shred -u /run/pokebo/core.env',
    'docker image prune -af --filter "until=24h" || true',
  ];
}

// Edge: sin secretos. Caddy termina HTTPS para <ip-con-guiones>.sslip.io y reenvía al contenedor del Edge.
function edgeStartScript(o: { repoUri: string; edgeLogGroup: string; caddyLogGroup: string }): string[] {
  const param = (name: string) => `$(aws ssm get-parameter --region "$REGION" --name ${name} --query Parameter.Value --output text)`;
  return [
    ...pullImageLines(o.repoUri, PARAMS.edgeImageTag),
    `docker pull ${CADDY_IMAGE}`,
    `HOST="$(echo "${param(PARAMS.edgePublicIp)}" | tr . -).sslip.io"`,
    '{',
    `  echo "PORT=${EDGE_PORT}"`,
    '  echo "NODE_ENV=production"',
    `  echo "CORE_API_URL=${param(PARAMS.coreUrl)}"`,
    `  printf 'JWT_PUBLIC_KEY=%s\\n' "$(aws ssm get-parameter --region "$REGION" --name ${PARAMS.jwtPublicKey} --query Parameter.Value --output text | awk 'NF {sub(/\\r/, ""); printf "%s\\\\n", $0}')"`,
    '} > /run/pokebo/edge.env',
    'cat > /opt/pokebo/Caddyfile <<CADDY',
    '$HOST {',
    '  encode gzip',
    '  header {',
    '    Strict-Transport-Security "max-age=31536000"',
    '    X-Content-Type-Options "nosniff"',
    '    Referrer-Policy "no-referrer"',
    '    -Server',
    '  }',
    `  reverse_proxy edge-api:${EDGE_PORT}`,
    '}',
    'CADDY',
    'docker network create pokebo 2>/dev/null || true',
    'docker rm -f edge-api caddy 2>/dev/null || true',
    // El Edge no publica puertos en la máquina: solo Caddy (80/443) lo alcanza por la red Docker
    `docker run -d --name edge-api --restart unless-stopped --network pokebo --env-file /run/pokebo/edge.env ` +
      `--health-cmd "wget -qO- http://127.0.0.1:${EDGE_PORT}/health || exit 1" --health-interval 30s --health-timeout 5s --health-retries 3 ` +
      `${awslogs(o.edgeLogGroup, 'edge-api')} "$REPO:$TAG"`,
    // /var/lib/caddy persiste el certificado entre reinicios
    `docker run -d --name caddy --restart unless-stopped --network pokebo -p 80:80 -p 443:443 ` +
      `-v /opt/pokebo/Caddyfile:/etc/caddy/Caddyfile:ro -v /var/lib/caddy:/data ${awslogs(o.caddyLogGroup, 'caddy')} ${CADDY_IMAGE}`,
    'shred -u /run/pokebo/edge.env',
    'echo "Edge publicado en https://$HOST"',
    'docker image prune -af --filter "until=24h" || true',
  ];
}
