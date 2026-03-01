export type ReportStatus = "idle" | "processing" | "delivering" | "ready";

export interface InconsistencyFinding {
  title: string;
  detail: string;
  relatedSuspects: string[];
  confidence: string;
}

export interface SuspectInconsistencyReport {
  suspectId: string;
  generatedAt: number;
  summary: string;
  findings: InconsistencyFinding[];
  sourceCount: number;
}

export interface SuspectReportState {
  status: ReportStatus;
  seq: number;
  report: SuspectInconsistencyReport | null;
}

export interface GlobalInconsistencyReport {
  generatedAt: number;
  summary: string;
  findings: InconsistencyFinding[];
  sourceCount: number;
}

export interface GlobalReportState {
  status: ReportStatus;
  seq: number;
  report: GlobalInconsistencyReport | null;
}

export interface LobbyDeliveryEvent {
  seq: number;
}
