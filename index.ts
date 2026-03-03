import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const customerName = config.require("customerName");

const region = aws.getRegionOutput();
const callerIdentity = aws.getCallerIdentityOutput();

const commonTags = {
    Project: "datacorp",
    Customer: customerName,
    ManagedBy: "pulumi",
    Stack: pulumi.getStack(),
    Environment: "production",
    Owner: "dperlovsky@pulumi.com",
};

// --- KMS Key (customer-dedicated) ---
const kmsKey = new aws.kms.Key("customer-key", {
    description: `DataCorp encryption key for customer: ${customerName}`,
    enableKeyRotation: true,
    rotationPeriodInDays: 365,
    tags: commonTags,
});

const kmsAlias = new aws.kms.Alias("customer-key-alias", {
    name: `alias/datacorp-${customerName}`,
    targetKeyId: kmsKey.id,
});

// --- S3 Bucket ---
const bucketName = region.name.apply(r => `datacorp-${customerName}-data-${r}`);

const bucket = new aws.s3.BucketV2("customer-bucket", {
    bucket: bucketName,
    forceDestroy: false,
    tags: commonTags,
});

// --- Versioning ---
const versioning = new aws.s3.BucketVersioningV2("customer-bucket-versioning", {
    bucket: bucket.id,
    versioningConfiguration: {
        status: "Enabled",
    },
});

// --- Server-Side Encryption (KMS) ---
const encryption = new aws.s3.BucketServerSideEncryptionConfigurationV2("customer-bucket-encryption", {
    bucket: bucket.id,
    rules: [{
        applyServerSideEncryptionByDefault: {
            sseAlgorithm: "aws:kms",
            kmsMasterKeyId: kmsKey.arn,
        },
        bucketKeyEnabled: true,
    }],
});

// --- Public Access Block ---
const publicAccessBlock = new aws.s3.BucketPublicAccessBlock("customer-bucket-public-access-block", {
    bucket: bucket.id,
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
});

// --- Bucket Policy (TLS-only) ---
const bucketPolicy = new aws.s3.BucketPolicy("customer-bucket-policy", {
    bucket: bucket.id,
    policy: pulumi.jsonStringify({
        Version: "2012-10-17",
        Statement: [{
            Sid: "DenyNonTLSAccess",
            Effect: "Deny",
            Principal: "*",
            Action: "s3:*",
            Resource: [
                bucket.arn,
                pulumi.interpolate`${bucket.arn}/*`,
            ],
            Condition: {
                Bool: {
                    "aws:SecureTransport": "false",
                },
            },
        }],
    }),
});

// --- Outputs ---
export const bucketNameOutput = bucket.bucket;
export const bucketArn = bucket.arn;
export const kmsKeyArn = kmsKey.arn;
export const kmsKeyAlias = kmsAlias.name;
