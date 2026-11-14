import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export const REPOSITORY_NAMES = {
  core: 'pokebo-demo/core-api',
  edge: 'pokebo-demo/edge-api',
} as const;

// Repositorios de imágenes de Core y Edge (sección 13): tags inmutables, escaneo al subir y solo las últimas versiones.
// Va en un stack aparte porque las imágenes tienen que existir antes de crear las EC2 que las usan.
export class RegistryStack extends Stack {
  public readonly coreRepo: ecr.Repository;
  public readonly edgeRepo: ecr.Repository;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const repo = (id: string, repositoryName: string) => new ecr.Repository(this, id, {
      repositoryName,
      imageTagMutability: ecr.TagMutability.IMMUTABLE, // una etiqueta publicada no se puede pisar (y no se usa `latest`)
      imageScanOnPush: true,
      lifecycleRules: [{ description: 'Conservar solo las 5 imagenes mas recientes', maxImageCount: 5 }],
      removalPolicy: RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    this.coreRepo = repo('CoreRepo', REPOSITORY_NAMES.core);
    this.edgeRepo = repo('EdgeRepo', REPOSITORY_NAMES.edge);
  }
}
