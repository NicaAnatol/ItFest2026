// Medic & Organization domain types

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface Medic {
  _id: string;
  /** WorkOS user ID — links auth identity to our medic record */
  workosUserId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  organizationId: string;
  createdAt: string;
}
