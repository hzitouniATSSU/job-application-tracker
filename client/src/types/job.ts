export type Job={
    id: number;
    company: string;
    title: string;
    status: string;
    location: string | null;
    jobUrl: string | null;
    notes: string | null;
    appliedAt: string;
    createdAt: string;
    updatedAt: string;
};