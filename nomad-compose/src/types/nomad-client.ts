export interface NomadClientConfig {
  address: string;
  token?: string;
  region?: string;
  namespace?: string;
  timeout?: number;
}

export interface NomadJobSubmission {
  Job: string;
  Region?: string;
  Namespace?: string;
}

export interface NomadJobResponse {
  ID: string;
  Name: string;
  Type: string;
  Status: string;
  SubmitTime: number;
  ModifyTime: number;
  JobModifyIndex: number;
  CreateIndex: number;
  ModifyIndex: number;
}

export interface NomadAllocation {
  ID: string;
  EvalID: string;
  Name: string;
  NodeID: string;
  JobID: string;
  JobType: string;
  JobVersion: number;
  TaskGroup: string;
  DesiredStatus: string;
  DesiredDescription: string;
  ClientStatus: string;
  ClientDescription: string;
  CreateTime: number;
  ModifyTime: number;
}

export interface NomadEvaluation {
  ID: string;
  Priority: number;
  Type: string;
  TriggeredBy: string;
  JobID: string;
  JobModifyIndex: number;
  NodeID: string;
  Status: string;
  StatusDescription: string;
  Wait: number;
  WaitUntil: number;
  NextEvalID: string;
  PreviousEvalID: string;
  BlockedEvalID: string;
  CreateTime: number;
  ModifyTime: number;
}

export interface NomadNode {
  ID: string;
  Name: string;
  Status: string;
  StatusDescription: string;
  Datacenter: string;
  NodeClass: string;
  Version: string;
  CreateTime: number;
  ModifyTime: number;
}

export interface DeployOptions {
  dryRun?: boolean;
  waitForDeployment?: boolean;
  timeout?: number;
  force?: boolean;
  checkHealth?: boolean;
}

export interface DeployResult {
  success: boolean;
  jobId?: string;
  message: string;
  warnings: string[];
  errors: string[];
  jobUrl?: string;
}
