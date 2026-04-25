-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CANDIDATE', 'INTERVIEWER', 'COLLEGE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "candidateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL,
    "candidateEmail" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "suspicionScore" INTEGER NOT NULL DEFAULT 0,
    "templateId" TEXT,
    "customConfig" JSONB,
    "resumeData" JSONB,
    "interviewerId" TEXT,
    "referenceFacePath" TEXT,
    "referenceVoicePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aiSummary" JSONB,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctorEvent" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProctorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctorFrame" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProctorFrame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaRecord" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "durationSec" DOUBLE PRECISION,
    "transcript" TEXT,
    "analysisJson" JSONB,
    "yoloProcessed" BOOLEAN NOT NULL DEFAULT false,
    "yoloSummary" JSONB,
    "yoloFlags" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processingStage" TEXT NOT NULL DEFAULT 'pending',
    "suspicionScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyOutreach" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contactPerson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'contacted',
    "tier" TEXT,
    "ctc" DOUBLE PRECISION,
    "slot" TEXT,
    "cgpaCutoff" DOUBLE PRECISION,
    "timeline" JSONB,
    "onboardedUserId" TEXT,
    "driveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyOutreach_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "MediaRecord_interviewId_idx" ON "MediaRecord"("interviewId");

-- CreateIndex
CREATE INDEX "MediaRecord_type_idx" ON "MediaRecord"("type");

-- CreateIndex
CREATE INDEX "MediaRecord_yoloProcessed_idx" ON "MediaRecord"("yoloProcessed");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyOutreach_email_key" ON "CompanyOutreach"("email");

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InterviewTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProctorEvent" ADD CONSTRAINT "ProctorEvent_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProctorFrame" ADD CONSTRAINT "ProctorFrame_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaRecord" ADD CONSTRAINT "MediaRecord_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
