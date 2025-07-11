// Version management service
// Increments version every 5 changes

export interface VersionInfo {
  version: string;
  changeCount: number;
  lastUpdated: string;
}

const VERSION_STORAGE_KEY = 'branch-ui-version';

class VersionService {
  private versionInfo: VersionInfo;

  constructor() {
    this.versionInfo = this.loadVersionInfo();
  }

  private loadVersionInfo(): VersionInfo {
    try {
      const stored = localStorage.getItem(VERSION_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load version info:', error);
    }
    
    // Default version info
    return {
      version: '1.0.0',
      changeCount: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  private saveVersionInfo(): void {
    try {
      localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(this.versionInfo));
    } catch (error) {
      console.warn('Failed to save version info:', error);
    }
  }

  public incrementChange(): void {
    this.versionInfo.changeCount++;
    this.versionInfo.lastUpdated = new Date().toISOString();
    
    // Increment version every 5 changes
    if (this.versionInfo.changeCount % 5 === 0) {
      this.incrementVersion();
    }
    
    this.saveVersionInfo();
  }

  private incrementVersion(): void {
    const [major, minor, patch] = this.versionInfo.version.split('.').map(Number);
    
    // Increment patch version
    const newPatch = patch + 1;
    
    // Handle version overflow (reset patch, increment minor)
    if (newPatch >= 10) {
      const newMinor = minor + 1;
      if (newMinor >= 10) {
        this.versionInfo.version = `${major + 1}.0.0`;
      } else {
        this.versionInfo.version = `${major}.${newMinor}.0`;
      }
    } else {
      this.versionInfo.version = `${major}.${minor}.${newPatch}`;
    }
  }

  public getVersionInfo(): VersionInfo {
    return { ...this.versionInfo };
  }

  public getCurrentVersion(): string {
    return this.versionInfo.version;
  }

  public getChangeCount(): number {
    return this.versionInfo.changeCount;
  }

  public getChangesUntilNextVersion(): number {
    return 5 - (this.versionInfo.changeCount % 5);
  }
}

export const versionService = new VersionService();
