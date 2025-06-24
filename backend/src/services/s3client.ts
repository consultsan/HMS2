import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import crypto from "crypto";

class S3 {
    private bucketName: string;
    private region: string;
    private s3: S3Client;
    private accessKeyId: string;
    private secretAccessKey: string;

    constructor() {
        this.bucketName = process.env.AWS_BUCKET!;
        this.region = process.env.AWS_REGION!;
        this.accessKeyId = process.env.AWS_ACCESS_KEY_ID!;
        this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY!;

        this.s3 = new S3Client({
            region: this.region,
            credentials: {
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey
            }
        });
    }

    async uploadStream(
        stream: any,
        originalname: string,
        mimetype: string,
        bucketName = this.bucketName
    ) {
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString("hex");
        const fileExtension = originalname.split(".").pop();
        const uniqueFileName = `${timestamp}-${randomString}.${fileExtension}`;
        const s3Key = `uploads/${uniqueFileName}`;

        try {
            const parallelUploads3 = new Upload({
                client: this.s3,
                params: {
                    Bucket: bucketName,
                    Key: s3Key,
                    Body: stream,
                    ContentType: mimetype
                }
            });

            await parallelUploads3.done();
            return `https://${bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;
        } catch (error) {
            console.error("Error uploading stream to S3:", error);
            throw error;
        }
    }

    async deleteFile(s3KeyOrUrl: string, bucketName = this.bucketName) {
        try {
            let s3Key = s3KeyOrUrl;
            if (s3KeyOrUrl.startsWith("http")) {
                s3Key = this.extractS3KeyFromUrl(s3KeyOrUrl);
            }

            const command = new DeleteObjectCommand({
                Bucket: bucketName,
                Key: s3Key
            });

            await this.s3.send(command);
            console.log(`Successfully deleted file: ${s3Key}`);
        } catch (error) {
            console.error("Error deleting file from S3:", error);
            throw error;
        }
    }

    private extractS3KeyFromUrl(url: string) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;

            return pathname.substring(1);
        } catch (error) {
            throw new Error("Invalid S3 URL format");
        }
    }
}
export default new S3();