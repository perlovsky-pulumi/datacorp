# Secure Bucket

A Pulumi component for creating secure, encrypted S3 buckets with KMS, versioning, and TLS-only access. Created by Daniel Perlovsky.

## Features

- KMS encryption with automatic key rotation
- S3 bucket versioning enabled
- Public access fully blocked
- TLS-only bucket policy
- Region validation against an allowlist

## Usage

```typescript
import { SecureBucket } from "@pulumi/secure-bucket";

const bucket = new SecureBucket("my-storage", {
    customerName: "acme-corp",
});

export const bucketName = bucket.bucketName;
export const kmsKeyArn = bucket.kmsKeyArn;
```

## Configuration

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `customerName` | `string` | Yes | — | Customer name for bucket naming and tagging |
| `projectName` | `string` | No | `"datacorp"` | Project name for resource naming and tagging |
| `allowedRegions` | `string[]` | No | `["us-west-2", "ca-central-1"]` | Allowed AWS regions |
| `kmsKeyArn` | `string` | No | — | Existing KMS key ARN (creates new key if omitted) |
| `owner` | `string` | No | Caller ARN | Owner ARN for tagging |
| `environment` | `string` | No | `"production"` | Environment tag |
| `tags` | `Record<string, string>` | No | `{}` | Additional tags |

## Outputs

| Output | Description |
|---|---|
| `bucketName` | The name of the S3 bucket |
| `bucketArn` | The ARN of the S3 bucket |
| `bucketId` | The ID of the S3 bucket |
| `kmsKeyArn` | The ARN of the KMS key |
| `kmsKeyId` | The ID of the KMS key |
