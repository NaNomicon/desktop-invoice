export type TauriUpdateResponse = {
  version: string;
  url: string;
  signature: string;
  notes: string;
  pub_date: string;
};

export type GitHubAsset = {
  name: string;
  browser_download_url: string;
};

export type GitHubRelease = {
  tag_name: string;
  body: string;
  published_at: string;
  assets: GitHubAsset[];
};
