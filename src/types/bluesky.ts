export interface UserIdentity {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface ActorSearchResult {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface BskyList {
  uri: string;
  cid?: string;
  name: string;
  description?: string;
  purpose?: string;
}

export interface ListMember {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface StarterPack {
  uri: string;
  cid?: string;
  name: string;
  description?: string;
  listUri?: string;
}

export interface OperationResult {
  added: number;
  skipped: number;
  unresolved: string[];
}

export interface CuratedPost {
  uri: string;
  cid?: string;
  text: string;
  authorDisplayName?: string;
  authorHandle: string;
  authorAvatar?: string;
  media?: CuratedPostMedia[];
  createdAt: string;
  approved?: boolean;
  expiresAt?: string;
}

export interface CuratedPostMedia {
  type: 'image' | 'video';
  url: string;
  thumb?: string;
  alt?: string;
}

export interface FeedAutomationConfig {
  enabled: boolean;
  mode: 'words' | 'regex';
  pattern: string;
  caseSensitive: boolean;
}

export interface CuratedFeed {
  id: string;
  name: string;
  description: string;
  publishedDescription: string;
  iconDataUrl?: string;
  publishedIconDataUrl?: string;
  automation: FeedAutomationConfig;
  publishedAutomation: FeedAutomationConfig;
  draftPosts: CuratedPost[];
  publishedPosts: CuratedPost[];
  isDirty: boolean;
  lastPublishedAt?: string;
  blueskyFeedUri?: string;
  blueskyFeedRkey?: string;
  lastPublishError?: string | null;
  createdAt: string;
  updatedAt: string;
}
