import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const DEFAULT_ALLOWED_REGIONS = ["us-west-2", "ca-central-1"];

export interface SecureBucketArgs {
    customerName: pulumi.Input<string>;
    owner?: pulumi.Input<string>;
    tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
    kmsKeyArn?: pulumi.Input<string>;
    environment?: pulumi.Input<string>;
    projectName?: string;
    allowedRegions?: string[];
}

export class SecureBucket extends pulumi.ComponentResource {
    public readonly bucketName: pulumi.Output<string>;
    public readonly bucketArn: pulumi.Output<string>;
    public readonly bucketId: pulumi.Output<string>;
    public readonly kmsKeyArn: pulumi.Output<string>;
    public readonly kmsKeyId: pulumi.Output<string>;

    constructor(name: string, args: SecureBucketArgs, opts?: pulumi.ComponentResourceOptions) {
        super("pulumi:secure-bucket:SecureBucket", name, args, {
            ...opts,
            aliases: [...(opts?.aliases ?? []), { type: "datacorp:storage:SecureBucket" }],
        });

        const projectName = args.projectName ?? "datacorp";
        const allowedRegions = args.allowedRegions ?? DEFAULT_ALLOWED_REGIONS;

        const region = aws.getRegionOutput();
        region.name.apply(r => {
            if (!allowedRegions.includes(r)) {
                throw new Error(
                    `Region "${r}" is not allowed. Allowed regions: ${allowedRegions.join(", ")}`,
                );
            }
        });

        const callerIdentity = aws.getCallerIdentityOutput();
        const owner = args.owner ?? callerIdentity.arn;
        const environment = args.environment ?? "production";

        const commonTags = pulumi.output(args.tags ?? {}).apply(extra => ({
            Project: projectName,
            Customer: pulumi.output(args.customerName),
            ManagedBy: "pulumi",
            Stack: pulumi.getStack(),
            Environment: pulumi.output(environment),
            Owner: pulumi.output(owner),
            ...extra,
        }));

        // --- KMS Key ---
        let kmsKeyArn: pulumi.Output<string>;
        let kmsKeyId: pulumi.Output<string>;

        if (args.kmsKeyArn) {
            kmsKeyArn = pulumi.output(args.kmsKeyArn);
            kmsKeyId = kmsKeyArn;
        } else {
            const kmsKey = new aws.kms.Key(`${name}-key`, {
                description: pulumi.interpolate`${projectName} encryption key for customer: ${args.customerName}`,
                enableKeyRotation: true,
                rotationPeriodInDays: 365,
                tags: commonTags,
            }, { parent: this, aliases: [{ name: "customer-key", parent: pulumi.rootStackResource }] });

            new aws.kms.Alias(`${name}-key-alias`, {
                name: pulumi.interpolate`alias/${projectName}-${args.customerName}`,
                targetKeyId: kmsKey.id,
            }, { parent: this, aliases: [{ name: "customer-key-alias", parent: pulumi.rootStackResource }] });

            kmsKeyArn = kmsKey.arn;
            kmsKeyId = kmsKey.id;
        }

        // --- S3 Bucket ---
        const bucketResourceName = pulumi.all([region.name, args.customerName]).apply(([r, customer]) => `${projectName}-${customer}-data-${r}`);

        const bucket = new aws.s3.BucketV2(`${name}-bucket`, {
            bucket: bucketResourceName,
            forceDestroy: false,
            tags: commonTags,
        }, { parent: this, aliases: [{ name: "customer-bucket", parent: pulumi.rootStackResource }] });

        // --- Versioning ---
        new aws.s3.BucketVersioningV2(`${name}-versioning`, {
            bucket: bucket.id,
            versioningConfiguration: {
                status: "Enabled",
            },
        }, { parent: this, aliases: [{ name: "customer-bucket-versioning", parent: pulumi.rootStackResource }] });

        // --- Server-Side Encryption (KMS) ---
        new aws.s3.BucketServerSideEncryptionConfigurationV2(`${name}-encryption`, {
            bucket: bucket.id,
            rules: [{
                applyServerSideEncryptionByDefault: {
                    sseAlgorithm: "aws:kms",
                    kmsMasterKeyId: kmsKeyArn,
                },
                bucketKeyEnabled: true,
            }],
        }, { parent: this, aliases: [{ name: "customer-bucket-encryption", parent: pulumi.rootStackResource }] });

        // --- Public Access Block ---
        new aws.s3.BucketPublicAccessBlock(`${name}-public-access-block`, {
            bucket: bucket.id,
            blockPublicAcls: true,
            blockPublicPolicy: true,
            ignorePublicAcls: true,
            restrictPublicBuckets: true,
        }, { parent: this, aliases: [{ name: "customer-bucket-public-access-block", parent: pulumi.rootStackResource }] });

        // --- Bucket Policy (TLS-only) ---
        new aws.s3.BucketPolicy(`${name}-policy`, {
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
        }, { parent: this, aliases: [{ name: "customer-bucket-policy", parent: pulumi.rootStackResource }] });

        // --- Outputs ---
        this.bucketName = bucket.bucket;
        this.bucketArn = bucket.arn;
        this.bucketId = bucket.id;
        this.kmsKeyArn = kmsKeyArn;
        this.kmsKeyId = kmsKeyId;

        this.registerOutputs({
            bucketName: this.bucketName,
            bucketArn: this.bucketArn,
            bucketId: this.bucketId,
            kmsKeyArn: this.kmsKeyArn,
            kmsKeyId: this.kmsKeyId,
        });
    }
}
