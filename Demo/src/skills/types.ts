// Application ownership: Compile-time contracts shared by the surrounding feature.
export type SkillAudience = "visitor" | "content" | "both";

export type SkillSummary = {
  slug: string;
  name: string;
  description: string;
  audience: SkillAudience;
  enabled: boolean;
  updatedAt: string;
  updatedBy: string;
};

export type SkillRecord = SkillSummary & {
  markdown: string;
  files: string[];
};

export type ComputerFileEntry = {
  path: string;
  type: "file" | "dir";
};

export type SaveSkillInput = {
  slug: string;
  name: string;
  description: string;
  markdown: string;
  audience?: SkillAudience;
  enabled?: boolean;
  updatedBy?: string;
};
