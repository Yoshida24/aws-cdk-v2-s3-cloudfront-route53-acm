import { Construct } from 'constructs';
import {
  Stack,
  StackProps,
  aws_s3,
  aws_cloudfront,
  aws_cloudfront_origins,
  aws_s3_deployment,
  aws_iam,
  aws_route53,
  aws_certificatemanager,
  aws_route53_targets,
  RemovalPolicy,
  Tags,
  Duration,
} from 'aws-cdk-lib';
import path = require('path');

export class AwsCdkV2StaticSiteStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const assetsDomain: string = this.node.tryGetContext('assetsDomain');
    if (!assetsDomain) {
      throw new Error('Set the fully qualified domain of Route53 in the context of cdk.json.');
    }

    const rootDomain: string = this.node.tryGetContext('rootDomain');
    if (!rootDomain) {
      throw new Error('Set the Route53 root domain to context in cdk.json.');
    }

    const websiteBucket = new aws_s3.Bucket(this, 'WebsiteBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      versioned: true,
      bucketName: assetsDomain
    });

    const originAccessIdentity = new aws_cloudfront.OriginAccessIdentity(
      this,
      'OriginAccessIdentity',
      {
        comment: 'website-distribution-originAccessIdentity',
      }
    );

    const hostedZone = aws_route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: `${rootDomain}.`,
    });
    
    const cert = new aws_certificatemanager.DnsValidatedCertificate(this, 'Certificate', {
      // Anything is free, so get certificates for example.com and *.example.com for now
      // Change them if you use domains like a.b.example.com
      domainName: rootDomain,
      subjectAlternativeNames: [`*.${rootDomain}`],
      // Use Route 53 host zone for DNS authentication
      hostedZone: hostedZone,
      // For certificates used with CloudFront, override the region specified in props, and
      // Always specify the us-east-1 region.
      // Be careful not to use other regions such as ap-northeast-1 as this will result in an error.
      region: 'us-east-1',
    })
    
    const webSiteBucketPolicyStatement = new aws_iam.PolicyStatement({
      actions: ['s3:GetObject'],
      effect: aws_iam.Effect.ALLOW,
      principals: [
        new aws_iam.CanonicalUserPrincipal(
          originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
        ),
      ],
      resources: [`${websiteBucket.bucketArn}/*`],
    });

    websiteBucket.addToResourcePolicy(webSiteBucketPolicyStatement);

    const distribution = new aws_cloudfront.Distribution(this, 'distribution', {
      comment: 'website-distribution',
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          ttl: Duration.seconds(300),
          httpStatus: 403,
          responseHttpStatus: 403,
          responsePagePath: '/error.html',
        },
        {
          ttl: Duration.seconds(300),
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/error.html',
        },
      ],
      defaultBehavior: {
        allowedMethods: aws_cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: aws_cloudfront.CachedMethods.CACHE_GET_HEAD,
        cachePolicy: aws_cloudfront.CachePolicy.CACHING_OPTIMIZED,
        viewerProtocolPolicy:
          aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        origin: new aws_cloudfront_origins.S3Origin(websiteBucket, {
          originAccessIdentity,
        }),
      },
      priceClass: aws_cloudfront.PriceClass.PRICE_CLASS_ALL,
      certificate: aws_certificatemanager.Certificate.fromCertificateArn(
        this,
        'customDomainCertificate',
        cert.certificateArn
      ),
      domainNames: [assetsDomain],
      minimumProtocolVersion: aws_cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    const propsForRoute53ARecords = {
      zone: hostedZone,
      recordName: assetsDomain,
      target: aws_route53.RecordTarget.fromAlias(new aws_route53_targets.CloudFrontTarget(distribution)),
    }

    new aws_route53.ARecord(this, 'ARecord', propsForRoute53ARecords)

    new aws_s3_deployment.BucketDeployment(this, 'WebsiteDeploy', {
      sources: [
        aws_s3_deployment.Source.asset(path.join(__dirname, "../public"))
      ],
      destinationBucket: websiteBucket,
      distribution: distribution,
      distributionPaths: ['/*'],
    });

    Tags.of(scope).add('App', 'AwsCdkS3Cloudfront');
    Tags.of(scope).add('Stage', 'Production');
  }
}
