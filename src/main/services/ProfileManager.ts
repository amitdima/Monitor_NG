import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import { DeviceProfile } from '../../shared/types';

export class ProfileManager {
  private profilesDir: string;

  constructor() {
    // Сохраняем профили в папке пользователя
    this.profilesDir = path.join(app.getPath('userData'), 'profiles');
    this.ensureProfilesDir();
  }

  private async ensureProfilesDir(): Promise<void> {
    try {
      await fs.mkdir(this.profilesDir, { recursive: true });
    } catch (error) {
      console.error('Ошибка создания папки профилей:', error);
    }
  }

  async saveProfile(profile: DeviceProfile): Promise<void> {
    const filePath = path.join(this.profilesDir, `${profile.id}.json`);
    const data = JSON.stringify(profile, null, 2);
    await fs.writeFile(filePath, data, 'utf8');
  }

  async loadProfile(profileId: string): Promise<DeviceProfile> {
    const filePath = path.join(this.profilesDir, `${profileId}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  }

  async getAllProfiles(): Promise<DeviceProfile[]> {
    try {
      const files = await fs.readdir(this.profilesDir);
      const profiles: DeviceProfile[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.profilesDir, file);
          const data = await fs.readFile(filePath, 'utf8');
          profiles.push(JSON.parse(data));
        }
      }
      
      return profiles;
    } catch (error) {
      console.error('Ошибка загрузки профилей:', error);
      return [];
    }
  }

  async deleteProfile(profileId: string): Promise<void> {
    const filePath = path.join(this.profilesDir, `${profileId}.json`);
    await fs.unlink(filePath);
  }

  async exportProfile(profileId: string, exportPath: string): Promise<void> {
    const profile = await this.loadProfile(profileId);
    const data = JSON.stringify(profile, null, 2);
    await fs.writeFile(exportPath, data, 'utf8');
  }

  async importProfile(importPath: string): Promise<DeviceProfile> {
    const data = await fs.readFile(importPath, 'utf8');
    const profile = JSON.parse(data);
    
    // Генерируем новый ID, чтобы избежать конфликтов
    profile.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.saveProfile(profile);
    return profile;
  }
}