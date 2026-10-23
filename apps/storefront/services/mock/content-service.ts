import { mockHomePage } from '@/fixtures/home';
import type { ContentService } from '@/services/contracts/content';

export class MockContentService implements ContentService {
  async getHomePage() { return mockHomePage; }
}
