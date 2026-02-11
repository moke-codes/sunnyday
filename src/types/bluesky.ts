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
  authorHandle: string;
  createdAt: string;
  approved?: boolean;
  expiresAt?: string;
}
