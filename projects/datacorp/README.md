# DataCorp — Multi-Tenant Customer Storage Provisioning

Deploys isolated, encrypted S3 storage buckets per customer with data residency compliance.

## What Gets Created (Per Customer)

- **S3 Bucket** — `datacorp-{customer}-data-{region}`, versioning enabled, force-destroy disabled
- **KMS Key** — Customer-dedicated CMK with annual auto-rotation
- **Encryption** — SSE-KMS with bucket keys enabled (lower KMS API costs)
- **Public Access Block** — All four flags enabled
- **Bucket Policy** — Denies non-TLS (HTTP) access

## For Engineers

### Prerequisites

- Node.js 18+
- Pulumi CLI
- AWS credentials configured (or use `pulumi-dev-sandbox` ESC environment)

### Deploy a Customer Stack

```bash
npm install
pulumi stack init acme-corp
pulumi config set customerName acme-corp
pulumi config set aws:region us-west-2
pulumi up
```

### Destroy a Customer Stack

```bash
pulumi stack select acme-corp
pulumi destroy
pulumi stack rm acme-corp
```

## For Non-Technical Users (Sales / Customer-Facing)

1. Go to **Pulumi Cloud** > **datacorp** project > **New Stack**
2. Enter the **customer name** and select a **region** from the dropdown
3. Click **Deploy** — Pulumi Deployments handles everything automatically
4. Monitor progress in the console; outputs (bucket name, ARN, KMS key) appear on completion

## Allowed Regions

| Region | Location |
|--------|----------|
| `us-west-2` | Oregon (default) |
| `us-east-1` | N. Virginia |
| `eu-west-1` | Ireland |
| `eu-central-1` | Frankfurt |
| `ap-southeast-1` | Singapore |

## Stack Outputs

| Output | Description |
|--------|-------------|
| `bucketNameOutput` | Full S3 bucket name |
| `bucketArn` | Bucket ARN |
| `kmsKeyArn` | KMS key ARN |
| `kmsKeyAlias` | KMS key alias |
