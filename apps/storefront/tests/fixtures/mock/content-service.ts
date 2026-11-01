import {demoInfoPages} from './info-service';
import { mockHomePage } from '@/fixtures/home';
import type { ContentService } from '@/services/contracts/content';

export class MockContentService implements ContentService {
  async getInfoPage(slug:string){return Object.hasOwn(demoInfoPages,slug)?demoInfoPages[slug]:null;}
  async getHomePage() { return mockHomePage; }
}
