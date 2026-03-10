import * as pulumi from "@pulumi/pulumi";
import { SecureBucket } from "./secureBucket";

const config = new pulumi.Config();
const customerName = config.require("customerName");

const storage = new SecureBucket("customer-storage", { customerName });

export const bucketNameOutput = storage.bucketName;
export const bucketArn = storage.bucketArn;
export const kmsKeyArn = storage.kmsKeyArn;
export const kmsKeyId = storage.kmsKeyId;
