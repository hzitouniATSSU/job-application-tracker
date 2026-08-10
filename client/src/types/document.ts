import type { Job } from "./job";

export type UploadedDocument ={
    id: number;
    name: string;
    originalName: string;
    mimeType: string;
    size: number;
    createdAt: string;
    updatedAt: string;
    jobs: Job[];
};