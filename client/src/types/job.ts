export type StageHistory = {
id: number;
jobId: number;
previousStage: string | null;
newStage: string;
changedAt: string
};




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
    stageHistory?: StageHistory[];
};