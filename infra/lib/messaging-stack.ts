import { Duration, RemovalPolicy, Stack, StackProps, Validations } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import * as path from 'path';
import { DataStack } from './data-stack';

export interface MessagingStackProps extends StackProps {
  readonly data: DataStack;
}

// Remitente verificado en SES (identidad ya creada; ver runbook)
export const SES_FROM_ADDRESS = 'pokebouru@gmail.com';

const LAMBDA_TIMEOUT = Duration.seconds(30);
// Regla del documento: visibility timeout >= 6 veces el timeout de la Lambda
const VISIBILITY_TIMEOUT = Duration.seconds(LAMBDA_TIMEOUT.toSeconds() * 6);
const LOG_RETENTION = logs.RetentionDays.ONE_WEEK;

// Correo y push asíncronos (secciones 10 y 11): Core publica, una Lambda consume con reintentos, DLQ e idempotencia.
export class MessagingStack extends Stack {
  public readonly otpEmailQueue: sqs.Queue;
  public readonly pushQueue: sqs.Queue;
  public readonly pushFeedbackQueue: sqs.Queue;
  public readonly idempotencyTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: MessagingStackProps) {
    super(scope, id, props);

    // Cola con DLQ, cifrada y que rechaza conexiones sin TLS
    const makeQueue = (name: string, visibility: Duration) => {
      const dlq = new sqs.Queue(this, `${name}Dlq`, {
        queueName: `pokebo-demo-${name}-dlq`,
        encryption: sqs.QueueEncryption.SQS_MANAGED,
        enforceSSL: true,
        retentionPeriod: Duration.days(4),
        removalPolicy: RemovalPolicy.DESTROY,
      });
      Validations.of(dlq).acknowledge({ id: 'AwsSolutions-SQS3', reason: 'Es la propia cola de mensajes fallidos (DLQ).' });
      const queue = new sqs.Queue(this, `${name}Queue`, {
        queueName: `pokebo-demo-${name}`,
        encryption: sqs.QueueEncryption.SQS_MANAGED,
        enforceSSL: true,
        visibilityTimeout: visibility,
        retentionPeriod: Duration.hours(4), // un OTP o aviso viejo ya no sirve
        deadLetterQueue: { queue: dlq, maxReceiveCount: 5 },
        removalPolicy: RemovalPolicy.DESTROY,
      });
      return { queue, dlq };
    };

    const email = makeQueue('otp-email', VISIBILITY_TIMEOUT);
    const push = makeQueue('push', VISIBILITY_TIMEOUT);
    const feedback = makeQueue('push-feedback', Duration.seconds(60)); // la lee Core, no una Lambda
    this.otpEmailQueue = email.queue;
    this.pushQueue = push.queue;
    this.pushFeedbackQueue = feedback.queue;

    // Idempotencia de los workers: una marca por entrega, que expira sola (atributo expiresAt)
    this.idempotencyTable = new dynamodb.Table(this, 'Idempotency', {
      tableName: 'pokebo-demo-idempotency',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: RemovalPolicy.DESTROY,
    });
    Validations.of(this.idempotencyTable).acknowledge({
      id: 'AwsSolutions-DDB3',
      reason: 'Marcas temporales que expiran en 7 dias: no hace falta recuperacion a un punto en el tiempo.',
    });

    const idempotencyAccess = (fn: lambda.Function) => fn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem'],
      resources: [this.idempotencyTable.tableArn],
    }));

    const workerDefaults = (workerDir: string) => ({
      runtime: lambda.Runtime.NODEJS_26_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'src/handler.handler',
      // El runtime ya incluye el AWS SDK v3: se publica solo el codigo, sin node_modules
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'workers', workerDir), {
        exclude: ['node_modules', 'test', 'package.json', 'package-lock.json'],
      }),
      memorySize: 256,
      timeout: LAMBDA_TIMEOUT,
      logGroup: new logs.LogGroup(this, `${workerDir}-logs`, { retention: LOG_RETENTION, removalPolicy: RemovalPolicy.DESTROY }),
    });
    const sqsSource = (queue: sqs.Queue) => new SqsEventSource(queue, {
      batchSize: 10,
      maxConcurrency: 2, // concurrencia limitada (minimo permitido por SQS)
      reportBatchItemFailures: true,
    });

    // ---------- Correo OTP: SQS -> Lambda -> SES ----------
    const emailFn = new lambda.Function(this, 'EmailSender', {
      ...workerDefaults('email-sender'),
      description: 'Envia el OTP por SES',
      environment: { IDEMPOTENCY_TABLE_NAME: this.idempotencyTable.tableName, SES_FROM_ADDRESS },
    });
    idempotencyAccess(emailFn);
    // En sandbox SES autoriza tambien sobre la identidad del destinatario: se limita por remitente con una condicion
    emailFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail'],
      resources: [`arn:${this.partition}:ses:${this.region}:${this.account}:identity/*`],
      conditions: { StringEquals: { 'ses:FromAddress': SES_FROM_ADDRESS } },
    }));
    emailFn.addEventSource(sqsSource(this.otpEmailQueue));

    // ---------- Push: SQS -> Lambda -> FCM (Android) ----------
    const pushFn = new lambda.Function(this, 'PushSender', {
      ...workerDefaults('push-sender'),
      description: 'Envia el push por FCM y devuelve los tokens invalidos',
      environment: {
        IDEMPOTENCY_TABLE_NAME: this.idempotencyTable.tableName,
        PUSH_FEEDBACK_QUEUE_URL: this.pushFeedbackQueue.queueUrl,
        FCM_SECRET_ID: props.data.secrets.fcmServiceAccount.secretName,
      },
    });
    idempotencyAccess(pushFn);
    props.data.secrets.fcmServiceAccount.grantRead(pushFn); // solo esta Lambda lee la credencial de FCM
    this.pushFeedbackQueue.grantSendMessages(pushFn);
    pushFn.addEventSource(sqsSource(this.pushQueue));

    for (const fn of [emailFn, pushFn]) {
      Validations.of(fn).acknowledge({
        id: 'AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole]',
        reason: 'Politica administrada estandar de logs de Lambda.',
      });
    }
    Validations.of(emailFn).acknowledge({
      id: `AwsSolutions-IAM5[Resource::arn:<AWS::Partition>:ses:${this.region}:${this.account}:identity/*]`,
      reason: 'En sandbox SES autoriza sobre la identidad del remitente y del destinatario; el envio queda limitado por la condicion ses:FromAddress.',
    });

    // ---------- Alarmas: cualquier mensaje en una DLQ o error de Lambda (sin accion: el equipo las mira en CloudWatch) ----------
    for (const [name, dlq] of [['otp-email', email.dlq], ['push', push.dlq], ['push-feedback', feedback.dlq]] as const) {
      new cloudwatch.Alarm(this, `${name}-dlq-alarm`, {
        alarmName: `pokebo-demo-${name}-dlq-no-vacia`,
        metric: dlq.metricApproximateNumberOfMessagesVisible({ period: Duration.minutes(1) }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
    }
    for (const [name, fn] of [['email', emailFn], ['push', pushFn]] as const) {
      new cloudwatch.Alarm(this, `${name}-errors-alarm`, {
        alarmName: `pokebo-demo-${name}-lambda-errores`,
        metric: fn.metricErrors({ period: Duration.minutes(5) }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
    }
  }
}
