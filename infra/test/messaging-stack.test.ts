import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { DataStack } from '../lib/data-stack';
import { MessagingStack, SES_FROM_ADDRESS } from '../lib/messaging-stack';
import { NetworkStack } from '../lib/network-stack';

const env = { account: '111111111111', region: 'us-east-2' };
const app = new App();
const network = new NetworkStack(app, 'Net', { env });
const data = new DataStack(app, 'Data', { env, network });
const stack = new MessagingStack(app, 'Msg', { env, data });
const template = Template.fromStack(stack);
const json = JSON.stringify(template.toJSON());

test('tres colas con su DLQ, cifradas y con TLS obligatorio', () => {
  template.resourceCountIs('AWS::SQS::Queue', 6);
  const queues = Object.values(template.findResources('AWS::SQS::Queue')) as any[];
  expect(queues.every((q) => q.Properties.SqsManagedSseEnabled === true)).toBe(true);
  const policies = Object.values(template.findResources('AWS::SQS::QueuePolicy')) as any[];
  expect(policies).toHaveLength(6);
  expect(JSON.stringify(policies)).toContain('aws:SecureTransport');
});

test('las colas de trabajo reintentan 5 veces y luego van a su DLQ; visibility >= 6x el timeout de Lambda', () => {
  const workQueues = (Object.values(template.findResources('AWS::SQS::Queue')) as any[])
    .filter((q) => q.Properties.RedrivePolicy);
  expect(workQueues).toHaveLength(3);
  for (const q of workQueues) expect(q.Properties.RedrivePolicy.maxReceiveCount).toBe(5);
  for (const name of ['pokebo-demo-otp-email', 'pokebo-demo-push']) {
    template.hasResourceProperties('AWS::SQS::Queue', { QueueName: name, VisibilityTimeout: 180 });
  }
});

test('DynamoDB de idempotencia bajo demanda con TTL', () => {
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    BillingMode: 'PAY_PER_REQUEST',
    TimeToLiveSpecification: { AttributeName: 'expiresAt', Enabled: true },
  });
});

test('las Lambdas usan ReportBatchItemFailures, concurrencia limitada, timeout 30 s y logs con retención', () => {
  const mappings = Object.values(template.findResources('AWS::Lambda::EventSourceMapping')) as any[];
  expect(mappings).toHaveLength(2);
  for (const m of mappings) {
    expect(m.Properties.FunctionResponseTypes).toEqual(['ReportBatchItemFailures']);
    expect(m.Properties.ScalingConfig).toEqual({ MaximumConcurrency: 2 });
  }
  const functions = Object.values(template.findResources('AWS::Lambda::Function')) as any[];
  expect(functions.every((f) => f.Properties.Timeout === 30)).toBe(true);
  const groups = Object.values(template.findResources('AWS::Logs::LogGroup')) as any[];
  expect(groups.every((g) => g.Properties.RetentionInDays === 7)).toBe(true);
});

test('SES: solo con el remitente verificado como condición', () => {
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Action: 'ses:SendEmail',
          Condition: { StringEquals: { 'ses:FromAddress': SES_FROM_ADDRESS } },
        }),
      ]),
    },
  });
});

test('solo la Lambda de push puede leer la credencial de FCM y ninguna otra lee secretos', () => {
  const policies = Object.values(template.findResources('AWS::IAM::Policy')) as any[];
  const withSecrets = policies.filter((p) => JSON.stringify(p.Properties.PolicyDocument).includes('secretsmanager:'));
  expect(withSecrets).toHaveLength(1);
  expect(JSON.stringify(withSecrets[0].Properties.Roles)).toContain('PushSender');
});

test('ninguna Lambda recibe secretos en variables de entorno', () => {
  expect(json).not.toMatch(/PRIVATE KEY|private_key/);
  const functions = Object.values(template.findResources('AWS::Lambda::Function')) as any[];
  for (const f of functions) {
    expect(Object.keys(f.Properties.Environment.Variables).sort()).not.toContain('FCM_SERVICE_ACCOUNT');
  }
});

test('hay una alarma por cada DLQ y por cada Lambda', () => {
  template.resourceCountIs('AWS::CloudWatch::Alarm', 5);
});
