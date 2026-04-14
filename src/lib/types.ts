export interface Tool {
  id: string;
  name: string;
  url: string;
  source: string;
  sourceUrl?: string;
  category: string;
  description: string;
  status: "queued" | "recorded" | "rejected";
  partNumber: number;
  hookType: "A" | "B" | "C";
  relevanceScore: number;
  rejectionReason?: string;
  recordedDate?: string;
}

export interface Script {
  toolId: string;
  hook: string;
  bridge: string;
  benefit: string;
  demo: string;
  close: string;
  fullScript: string;
  hookType: "A" | "B" | "C";
  estimatedSeconds: number;
}

export interface Tweet {
  toolId: string;
  content: string;
  type: "tool_of_day" | "quick_tip" | "engagement" | "fact" | "repurposed_hook";
}

export interface CarouselAngle {
  toolId: string;
  type: "famous_person" | "tool_breakdown";
  headline: string;
  slides: string[];
}

export interface QueuedTool {
  tool: Tool;
  script: Script;
  tweets: Tweet[];
  carousel: CarouselAngle;
}
