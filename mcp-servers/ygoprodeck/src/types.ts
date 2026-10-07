import { z } from "zod";

// ==========================================
// Supported Formats & Statuses
// ==========================================
export const SupportedFormats = z.enum(["tcg", "ocg", "masterduel", "goat", "edison", "genesys"]);
export type SupportedFormat = z.infer<typeof SupportedFormats>;

export const TournamentFormats = z.enum(["TCG", "OCG", "Master Duel", "Genesys", "Genesys OCG", "OCG-AE"]);
export type TournamentFormat = z.infer<typeof TournamentFormats>;

export const BanStatus = z.enum(["Forbidden", "Limited", "Semi-Limited", "Unlimited"]);
export type BanStatus = z.infer<typeof BanStatus>;

// ==========================================
// Database Models
// ==========================================
export interface DbCard {
  id: number;
  name: string;
  type: string;
  frame_type: string;
  desc: string;
  atk: number | null;
  def: number | null;
  level: number | null;
  race: string | null;
  attribute: string | null;
  archetype: string | null;
  scale: number | null;
  linkval: number | null;
  linkmarkers: string | null;
  ygoprodeck_url: string | null;
  genesys_points?: number;
}

export interface DbBanlist {
  card_id: number;
  format: string;
  status: string;
}

export interface DbSyncMetadata {
  key: string;
  value: string;
  updated_at: string;
}

export interface DbMetaArchetype {
  format: string;
  timeframe: string;
  tier_filter: string;
  archetype: string;
  quantity: number;
  share_percent: number;
  archetype_img: number | null;
  total_samples: number;
  date_start: string | null;
  date_end: string | null;
  updated_at: string;
}

export interface DbTournamentEvent {
  id: number;
  name: string;
  country: string | null;
  event_date: string;
  winner: string | null;
  format: string;
  slug: string;
  player_count: number | null;
  is_approximate_player_count: number;
  top_archetypes_summary: string | null;
  updated_at: string;
}

export interface DbTournamentDeck {
  id: number;
  tournament_id: number;
  slug: string;
  player_name: string | null;
  placement: string | null;
  archetype: string;
  arch_2: string | null;
  arch_3: string | null;
  deck_name: string | null;
  format: string;
  event_date: string;
  deck_price: number | null;
  ydk_content: string | null;
  created_at: string;
}

export interface DbTournamentDeckCard {
  deck_id: number;
  card_id: number;
  section: "main" | "extra" | "side";
  quantity: number;
}

// ==========================================
// MCP Token-Lean Return Types
// ==========================================
export interface CardSearchSummary {
  id: number;
  name: string;
  type: string;
  attribute?: string;
  race?: string;
  level?: number;
  atk?: number;
  def?: number;
  linkval?: number;
  scale?: number;
  archetype?: string;
  genesys_points?: number;
  snippet: string;
}

export interface CardFullDetails extends DbCard {
  banlist_status: Record<string, string>;
  genesys_points: number;
}

export interface GenesysCardReport {
  card_id?: number;
  name: string;
  type?: string;
  points: number;
  is_legal: boolean;
  status: string;
}

export interface GenesysDeckReport {
  total_cards: number;
  total_points: number;
  point_cap: number;
  is_budget_compliant: boolean;
  is_mechanically_legal: boolean;
  remaining_allowance: number;
  forbidden_mechanics_count: number;
  pointed_cards: GenesysCardReport[];
  all_cards: GenesysCardReport[];
}

export interface TechCardFrequency {
  card_id: number;
  name: string;
  type: string;
  attribute?: string;
  race?: string;
  decks_playing: number;
  total_decks_analyzed: number;
  adoption_percent: number;
  main_copies_avg: number;
  side_copies_avg: number;
  total_copies_avg: number;
  is_generic: boolean;
  card_archetype?: string;
}

export interface TournamentDeckCardDetail {
  card_id: number;
  name: string;
  type: string;
  quantity: number;
  archetype?: string;
  attribute?: string;
  level?: number;
  race?: string;
}

export interface TournamentDeckDetail {
  id: number;
  tournament_id: number;
  tournament_name?: string;
  slug: string;
  player_name: string | null;
  placement: string | null;
  archetype: string;
  arch_2: string | null;
  arch_3: string | null;
  deck_name: string | null;
  format: string;
  event_date: string;
  deck_price: number | null;
  main_deck: TournamentDeckCardDetail[];
  extra_deck: TournamentDeckCardDetail[];
  side_deck: TournamentDeckCardDetail[];
  ydk_content?: string;
}

export interface TechCounterRecommendation {
  threat_archetype: string;
  meta_share_percent?: number;
  vulnerability_profile: {
    gy_dependent: boolean;
    heavy_searching: boolean;
    special_summon_spam: boolean;
    backrow_reliant: boolean;
    primary_attributes: string[];
    primary_types: string[];
  };
  proven_side_deck_counters: Array<{
    card_id: number;
    name: string;
    type: string;
    side_deck_adoption_percent: number;
    avg_copies: number;
  }>;
  recommended_tech_solutions: Array<{
    category: "Turn 0 Hand Trap" | "Turn 2 Board Breaker" | "Floodgate / Counter Trap";
    card_name: string;
    strategic_reasoning: string;
  }>;
}

// ==========================================
// Tool Input Schemas
// ==========================================
export const SearchCardsSchema = z.object({
  query: z
    .string()
    .optional()
    .describe("Full-text keyword search across card names and card effect text (PSCT)."),
  name: z.string().optional().describe("Partial or exact card name filter."),
  type: z
    .string()
    .optional()
    .describe("Card type filter (e.g., 'Normal Monster', 'Effect Monster', 'Spell Card', 'Trap Card', 'Link Monster', 'Synchro Monster')."),
  attribute: z
    .string()
    .optional()
    .describe("Card attribute (e.g., 'DARK', 'LIGHT', 'EARTH', 'WATER', 'FIRE', 'WIND', 'DIVINE')."),
  race: z
    .string()
    .optional()
    .describe("Monster type/race (e.g., 'Dragon', 'Spellcaster', 'Warrior') or Spell/Trap icon (e.g., 'Normal', 'Continuous', 'Quick-Play', 'Field', 'Equip', 'Counter')."),
  archetype: z.string().optional().describe("Archetype name (e.g., 'Blue-Eyes', 'Branded', 'Snake-Eye')."),
  level: z.number().int().optional().describe("Exact monster level, rank, or link rating."),
  level_min: z.number().int().optional().describe("Minimum monster level or rank."),
  level_max: z.number().int().optional().describe("Maximum monster level or rank."),
  atk_min: z.number().int().optional().describe("Minimum ATK threshold."),
  atk_max: z.number().int().optional().describe("Maximum ATK threshold."),
  def_min: z.number().int().optional().describe("Minimum DEF threshold."),
  def_max: z.number().int().optional().describe("Maximum DEF threshold."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(25)
    .default(10)
    .describe("Maximum number of results to return (capped at 25 for token efficiency).")
});
export type SearchCardsInput = z.infer<typeof SearchCardsSchema>;

export const GetCardDetailsSchema = z.object({
  name_or_id: z
    .string()
    .describe("Exact card name or numeric 8-digit passcode/ID (e.g., 'Blue-Eyes White Dragon' or '89631139').")
});
export type GetCardDetailsInput = z.infer<typeof GetCardDetailsSchema>;

export const CheckBanlistSchema = z.object({
  format: SupportedFormats.describe("The target format to verify against: 'tcg', 'ocg', 'masterduel', 'edison', or 'goat'."),
  cards: z
    .array(z.string())
    .min(1)
    .max(60)
    .describe("Array of card names or passcode IDs to check legality for.")
});
export type CheckBanlistInput = z.infer<typeof CheckBanlistSchema>;

export const GetTopArchetypesSchema = z.object({
  format: z
    .string()
    .default("TCG")
    .describe("Tournament format: 'TCG', 'OCG', 'Master Duel', 'Genesys'."),
  timeframe: z
    .enum(["current", "1-week", "1-month", "3-month", "6-month", "12-month", "all-time"])
    .default("current")
    .describe("Timeframe window: 'current' (current format), '1-month', '3-month', etc."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(15)
    .describe("Number of top archetypes to return (default 15).")
});
export type GetTopArchetypesInput = z.infer<typeof GetTopArchetypesSchema>;

export const ListRecentTournamentsSchema = z.object({
  format: z
    .string()
    .default("TCG")
    .describe("Tournament format: 'TCG', 'OCG', 'Master Duel'."),
  country: z
    .string()
    .optional()
    .describe("Optional country filter (e.g., 'United States', 'France', 'Brazil', 'Germany')."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(15)
    .describe("Number of recent tournaments to list (default 15).")
});
export type ListRecentTournamentsInput = z.infer<typeof ListRecentTournamentsSchema>;

export const GetTournamentBreakdownSchema = z.object({
  slug_or_id: z
    .string()
    .describe("Tournament slug (e.g., 'ycs-guayaquil-5164' or 'le-mans-wcq-regional-5147') or numeric ID.")
});
export type GetTournamentBreakdownInput = z.infer<typeof GetTournamentBreakdownSchema>;

export const GetTopTechCardsSchema = z.object({
  format: z
    .string()
    .default("TCG")
    .describe("Tournament format: 'TCG', 'OCG', 'Master Duel'."),
  archetype: z
    .string()
    .optional()
    .describe("Optional archetype filter: only analyze tech cards used in decks of this archetype (e.g. 'Azamina', 'Snake-Eye')."),
  section: z
    .enum(["main", "side", "all"])
    .default("all")
    .describe("Deck section to analyze: 'main' (main deck staples/hand traps), 'side' (side deck counters), or 'all'."),
  since_date: z
    .string()
    .optional()
    .describe("Optional start date filter in 'YYYY-MM-DD' format (e.g. '2026-10-02' to analyze tournaments since last Friday)."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe("Maximum number of tech cards to return (default 20, max 50).")
});
export type GetTopTechCardsInput = z.infer<typeof GetTopTechCardsSchema>;

export const GetTournamentDecklistsSchema = z.object({
  tournament_id_or_slug: z
    .string()
    .optional()
    .describe("Tournament ID (e.g. '5164') or slug (e.g. 'ycs-guayaquil-5164'). If omitted, retrieves from recent events."),
  archetype: z
    .string()
    .optional()
    .describe("Optional archetype filter (e.g. 'Elfnote', 'Mitsurugi')."),
  placement: z
    .string()
    .optional()
    .describe("Optional placement filter (e.g. 'Winner', 'Runner-Up', 'Top 4', 'Top 8')."),
  include_ydk: z
    .boolean()
    .default(true)
    .describe("Whether to include the raw simulator-compatible .ydk file string in the response."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .describe("Number of decklists to retrieve (default 5, max 20).")
});
export type GetTournamentDecklistsInput = z.infer<typeof GetTournamentDecklistsSchema>;

export const EvaluateTechCountersSchema = z.object({
  format: z
    .string()
    .default("TCG")
    .describe("Tournament format: 'TCG', 'OCG', 'Master Duel'."),
  target_archetype: z
    .string()
    .optional()
    .describe("Specific meta deck to evaluate counters for (e.g. 'Snake-Eye', 'Tenpai Dragon', 'Azamina Mitsurugi'). If omitted, evaluates top meta decks."),
  since_date: z
    .string()
    .optional()
    .describe("Optional date cutoff (YYYY-MM-DD) to focus on recent tournaments (e.g. 'since last Friday')."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe("Number of top threat archetypes to analyze (default 5).")
});
export type EvaluateTechCountersInput = z.infer<typeof EvaluateTechCountersSchema>;

export const GetGenesysPointsSchema = z.object({
  cards: z
    .array(z.string())
    .min(1)
    .max(100)
    .describe("Array of card names or numeric passcode IDs to look up Genesys point costs and legality for.")
});
export type GetGenesysPointsInput = z.infer<typeof GetGenesysPointsSchema>;


