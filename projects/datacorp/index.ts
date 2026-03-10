import * as pulumi from "@pulumi/pulumi";
import { SecureBucket } from "@pulumi/secure-bucket";

const config = new pulumi.Config();
const customerName = config.require("customerName");

const storage = new SecureBucket("customer-storage", {
    customerName,
}, {
    aliases: [{ type: "datacorp:storage:SecureBucket" }],
});

export const bucketNameOutput = storage.bucketName;
export const bucketArn = storage.bucketArn;
export const kmsKeyArn = storage.kmsKeyArn;
export const kmsKeyId = storage.kmsKeyId;
