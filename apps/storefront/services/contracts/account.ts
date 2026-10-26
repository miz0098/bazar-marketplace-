import type {DemoOrderLifecycle,DemoReturnDraft} from '@/domain/account/order-lifecycle';
import type { ProductSummary } from '@/services/contracts/catalog';
import type {
  AccountAddress,
  AccountAddressDraft,
  AccountOrderDetail,
  AccountOrderPage,
  AccountOrderQuery,
  AccountPaymentMethod,
  AccountProfile,
  AccountProfileDraft,
  AccountReview,
  AccountReviewDraft,
  AccountWishlistItem,
  AccountWishlistPage,
  AccountWishlistQuery,
} from '@/domain/account/account';

export type AccountServiceMode = 'preview-only' | 'authenticated';
export type AccountServiceErrorCode =
  | 'unavailable'
  | 'not-found'
  | 'validation';

export class AccountServiceError extends Error {
  readonly code: AccountServiceErrorCode;
  readonly fieldErrors?: Readonly<Record<string, string>>;

  constructor(
    code: AccountServiceErrorCode,
    message: string,
    fieldErrors?: Readonly<Record<string, string>>,
  ) {
    super(message);
    this.name = 'AccountServiceError';
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export interface PreviewOnlyMutationResult<T> {
  readonly status: 'preview-only';
  readonly persisted: false;
  readonly value: T;
}

export interface PersistedMutationResult<T> {
  readonly status: 'saved';
  readonly persisted: true;
  readonly value: T;
}

export type AccountMutationResult<T> =
  | PreviewOnlyMutationResult<T>
  | PersistedMutationResult<T>;

export interface AccountService {
  readonly mode: AccountServiceMode;

  getProfile(): Promise<AccountProfile>;
  updateProfile(
    draft: AccountProfileDraft,
  ): Promise<AccountMutationResult<AccountProfile>>;

  listOrders(query?: AccountOrderQuery): Promise<AccountOrderPage>;
  getOrder(id: string): Promise<AccountOrderDetail | null>;
  getOrderLifecycle(id:string):Promise<DemoOrderLifecycle|null>;
  createOrderReturn(id:string,draft:DemoReturnDraft):Promise<AccountMutationResult<DemoOrderLifecycle>>;

  subscribeWishlist(listener: () => void): () => void;
  getWishlistSnapshot(): readonly AccountWishlistItem[];
  addWishlistItem(
    product: ProductSummary,
  ): Promise<AccountMutationResult<readonly AccountWishlistItem[]>>;
  listWishlist(query?: AccountWishlistQuery): Promise<AccountWishlistPage>;
  removeWishlistItem(
    id: string,
  ): Promise<AccountMutationResult<readonly AccountWishlistItem[]>>;
  removeWishlistItems(
    ids: readonly string[],
  ): Promise<AccountMutationResult<readonly AccountWishlistItem[]>>;

  listReviews(): Promise<readonly AccountReview[]>;
  updateReview(
    id: string,
    draft: AccountReviewDraft,
  ): Promise<AccountMutationResult<readonly AccountReview[]>>;
  deleteReview(
    id: string,
  ): Promise<AccountMutationResult<readonly AccountReview[]>>;

  listAddresses(): Promise<readonly AccountAddress[]>;
  addAddress(
    draft: AccountAddressDraft,
  ): Promise<AccountMutationResult<readonly AccountAddress[]>>;
  updateAddress(
    id: string,
    draft: AccountAddressDraft,
  ): Promise<AccountMutationResult<readonly AccountAddress[]>>;
  removeAddress(
    id: string,
  ): Promise<AccountMutationResult<readonly AccountAddress[]>>;
  setDefaultAddress(
    id: string,
  ): Promise<AccountMutationResult<readonly AccountAddress[]>>;

  listPaymentMethods(): Promise<readonly AccountPaymentMethod[]>;
}

export type {
  AccountAddress,
  AccountAddressDraft,
  AccountOrderDetail,
  AccountOrderPage,
  AccountOrderQuery,
  AccountPaymentMethod,
  AccountProfile,
  AccountProfileDraft,
  AccountReview,
  AccountReviewDraft,
  AccountWishlistItem,
  AccountWishlistPage,
  AccountWishlistQuery,
} from '@/domain/account/account';
