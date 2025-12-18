// GitHub API service for Zendor

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
  content?: string;
  encoding?: string;
}

export interface ZendorProject {
  id: string;
  name: string;
  repo: string;
  path: string;
  lastModified: string;
  content?: string;
}

const GITHUB_API = "https://api.github.com";
const DEFAULT_REPO = "zendor";

class GitHubService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.token) {
      throw new Error("GitHub token not set");
    }

    const response = await fetch(`${GITHUB_API}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `GitHub API error: ${response.status}`);
    }

    return response.json();
  }

  async getUser(): Promise<GitHubUser> {
    return this.fetch<GitHubUser>("/user");
  }

  async listRepos(): Promise<GitHubRepo[]> {
    return this.fetch<GitHubRepo[]>("/user/repos?sort=updated&per_page=100");
  }

  async getRepo(owner: string, repo: string): Promise<GitHubRepo | null> {
    try {
      return await this.fetch<GitHubRepo>(`/repos/${owner}/${repo}`);
    } catch {
      return null;
    }
  }

  async createRepo(name: string, isPrivate: boolean = false): Promise<GitHubRepo> {
    return this.fetch<GitHubRepo>("/user/repos", {
      method: "POST",
      body: JSON.stringify({
        name,
        private: isPrivate,
        auto_init: true,
        description: "Created by Zendor",
      }),
    });
  }

  async ensureZendorRepo(username: string): Promise<GitHubRepo> {
    // Check if zendor repo exists
    const existingRepo = await this.getRepo(username, DEFAULT_REPO);
    if (existingRepo) {
      return existingRepo;
    }

    // Create zendor repo
    return this.createRepo(DEFAULT_REPO, false);
  }

  async getFileContent(owner: string, repo: string, path: string): Promise<GitHubFile | null> {
    try {
      return await this.fetch<GitHubFile>(`/repos/${owner}/${repo}/contents/${path}`);
    } catch {
      return null;
    }
  }

  async listFiles(owner: string, repo: string, path: string = ""): Promise<GitHubFile[]> {
    try {
      return await this.fetch<GitHubFile[]>(`/repos/${owner}/${repo}/contents/${path}`);
    } catch {
      return [];
    }
  }

  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string
  ): Promise<{ content: GitHubFile; commit: { sha: string } }> {
    // Check if file exists to get its SHA
    const existingFile = await this.getFileContent(owner, repo, path);

    const body: Record<string, string> = {
      message,
      content: btoa(unescape(encodeURIComponent(content))), // Base64 encode with UTF-8 support
    };

    if (existingFile?.sha) {
      body.sha = existingFile.sha;
    }

    return this.fetch(`/repos/${owner}/${repo}/contents/${path}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string
  ): Promise<void> {
    const existingFile = await this.getFileContent(owner, repo, path);
    if (!existingFile?.sha) {
      throw new Error("File not found");
    }

    await this.fetch(`/repos/${owner}/${repo}/contents/${path}`, {
      method: "DELETE",
      body: JSON.stringify({
        message,
        sha: existingFile.sha,
      }),
    });
  }

  // List all markdown files in the zendor repo as projects
  async listProjects(username: string): Promise<ZendorProject[]> {
    const repo = await this.ensureZendorRepo(username);
    const files = await this.listFiles(username, DEFAULT_REPO);

    const markdownFiles = files.filter(
      (f) => f.type === "file" && (f.name.endsWith(".md") || f.name.endsWith(".markdown"))
    );

    return markdownFiles.map((file) => ({
      id: file.sha,
      name: file.name.replace(/\.(md|markdown)$/, ""),
      repo: repo.full_name,
      path: file.path,
      lastModified: repo.updated_at,
    }));
  }

  async loadProject(username: string, path: string): Promise<ZendorProject | null> {
    const file = await this.getFileContent(username, DEFAULT_REPO, path);
    if (!file || !file.content) return null;

    const content = decodeURIComponent(escape(atob(file.content)));

    return {
      id: file.sha,
      name: file.name.replace(/\.(md|markdown)$/, ""),
      repo: `${username}/${DEFAULT_REPO}`,
      path: file.path,
      lastModified: new Date().toISOString(),
      content,
    };
  }

  async saveProject(
    username: string,
    name: string,
    content: string,
    existingPath?: string
  ): Promise<ZendorProject> {
    await this.ensureZendorRepo(username);

    const fileName = existingPath || `${name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
    const message = existingPath
      ? `Update ${name}`
      : `Create ${name}`;

    const result = await this.createOrUpdateFile(
      username,
      DEFAULT_REPO,
      fileName,
      content,
      message
    );

    return {
      id: result.content.sha,
      name,
      repo: `${username}/${DEFAULT_REPO}`,
      path: result.content.path,
      lastModified: new Date().toISOString(),
      content,
    };
  }

  async deleteProject(username: string, path: string): Promise<void> {
    await this.deleteFile(username, DEFAULT_REPO, path, `Delete ${path}`);
  }
}

export const github = new GitHubService();
