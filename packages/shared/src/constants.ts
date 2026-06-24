export const CONFIG_FILENAME = "story-config.yaml";
export const ENV_FILENAME = ".env";
export const STORYLOOM_DIR = ".storyloom";
export const REPORTS_DIR = "reports";

export const ENTITY_FOLDERS = [
  "characters",
  "locations",
  "items",
  "world",
  "chapters",
] as const;

export const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

export type EntityFolder = (typeof ENTITY_FOLDERS)[number];

export const FOLDER_RESOLUTION_ORDER: EntityFolder[] = [
  "characters",
  "locations",
  "items",
  "world",
  "chapters",
];

export const ENTITY_TYPE_BY_FOLDER: Record<EntityFolder, string> = {
  characters: "character",
  locations: "location",
  items: "item",
  world: "lore",
  chapters: "chapter",
};
