# aws-cdk-v2-s3-cloudfront-route53-acm
Host static site with user defined domain on AWS.    
Depends on S3, CloudFront, Route53, AWS Certificate Manager.  

## Usage
- node: 18.x
- npm: 8.x

## Getting started

### Preparation

**Route53**  
Create domain such as a `example.com`.（Only set this domain, subdomains available like `www.example.com`） 

### Setup
**Install dependencies**

```bash
npm install
```
  
**cdk.json**  
Overwrite below property.

```json
{
  "params": {
    "rootDomain": "example.com",
    "assetsDomain": "foo.example.com"
  }
}
```

| property | description |
| ------------ | ------------ |
| rootDomain | Host zone on Route53 |
| assetsDomain | FQDN of assets domain |

### Deploy

**on first deploy**

```bash
npx cdk bootstrap
```

**command**  
```bash
npm run deploy
```

## destroy

```bash
npx cdk destroy
```
