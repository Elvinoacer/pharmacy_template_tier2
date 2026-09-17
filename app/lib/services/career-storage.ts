import "server-only";

import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getR2Config } from "@/app/lib/r2";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const MAX_CV_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);

export async function storeCareerResume(file: File): Promise<{
  cvUrl: string;
  cvFileName: string;
}> {
  if (file.size > MAX_CV_BYTES) {
    throw new Error("File size exceeds 5 MB limit.");
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error("Invalid file type. Please upload a PDF or Word document (.pdf, .doc, .docx).");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const storedFileName = `${randomUUID()}-${sanitizedOriginalName}`;

  const r2 = getR2Config();
  if (r2) {
    const key = `careers/cvs/${storedFileName}`;
    const s3 = new S3Client({
      region: "auto",
      endpoint: r2.endpoint,
      credentials: {
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
      },
      forcePathStyle: true,
    });

    await s3.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    return {
      cvUrl: `${r2.publicUrl}/${key}`,
      cvFileName: file.name,
    };
  }

  // Fallback: Store locally in public/uploads/careers for accessible download
  const uploadDir = path.resolve(process.cwd(), "public", "uploads", "careers");
  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, storedFileName);
  await fs.writeFile(filePath, buffer);

  return {
    cvUrl: `/uploads/careers/${storedFileName}`,
    cvFileName: file.name,
  };
}
