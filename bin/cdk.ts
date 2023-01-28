#!/usr/bin/env node
import 'source-map-support/register';
import {App} from 'aws-cdk-lib';
import { AwsCdkV2StaticSiteStack } from '../lib/cdk-stack';

const app = new App();
new AwsCdkV2StaticSiteStack(app, 'AwsCdkV2StaticSiteStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION // 'us-east-1'
  },
});