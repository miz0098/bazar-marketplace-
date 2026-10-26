/** Versioned transport contracts. F3 activates catalog/categories; cart HTTP and remaining modules stay blocked/planned. */
export type Id = string;
export type IsoTimestamp = string;
export type Money = Readonly<{ amountMinor: number; currency: 'UAH' }>;
export type Page<T> = Readonly<{ items: readonly T[]; nextCursor: string | null }>;
export type OwnedResource = Readonly<{ id: Id; userId: Id }>;

export interface UserDto { readonly id: Id; readonly firstName: string; readonly lastName: string; readonly maskedPhone: string }
export interface OtpChallengeInput { readonly phone: string; readonly intent: 'login' | 'register' }
export interface OtpChallengeDto { readonly challengeId: Id; readonly expiresAt: IsoTimestamp; readonly resendAfterSeconds: number }
export interface OtpVerifyInput { readonly challengeId: Id; readonly code: string }
// A verified session will be a secure HttpOnly cookie, never a browser-readable bearer token.
export interface SessionDto { readonly user: UserDto; readonly expiresAt: IsoTimestamp }
export interface CategoryDto { readonly id: Id; readonly parentId: Id | null; readonly handle: string; readonly title: string }
export interface ProductDto {
  readonly id: Id; readonly handle: string; readonly title: string; readonly description: string;
  readonly categoryId: Id; readonly price: Money; readonly availability: 'available' | 'unavailable';
}
export interface ProductQuery { readonly query?: string; readonly categoryId?: Id; readonly cursor?: string; readonly limit?: number; readonly minPrice?: number; readonly maxPrice?: number; readonly available?: boolean; readonly sort?: 'newest' | 'price-asc' | 'price-desc' | 'name' }
export interface CartLineDto { readonly productId: Id; readonly variantId: Id; readonly quantity: number; readonly lineTotal: Money }
export interface CartDto { readonly id: Id; readonly version: number; readonly lines: readonly CartLineDto[]; readonly subtotal: Money }
export interface CartLineInput { readonly variantId: Id; readonly quantity: number; readonly expectedVersion: number }
export interface OrderDto extends OwnedResource {
  readonly status: 'pending' | 'confirmed' | 'fulfilled' | 'cancelled';
  readonly placedAt: IsoTimestamp; readonly total: Money; readonly lines: readonly CartLineDto[];
}
export interface WishlistDto { readonly productIds: readonly Id[] }
export interface ReviewDto extends OwnedResource { readonly productId: Id; readonly rating: 1 | 2 | 3 | 4 | 5; readonly text: string; readonly verifiedPurchase: boolean; readonly createdAt: IsoTimestamp }
export interface ReviewInput { readonly orderLineId: Id; readonly rating: 1 | 2 | 3 | 4 | 5; readonly text: string }
export interface AddressInput { readonly recipientName: string; readonly phone: string; readonly cityId: Id; readonly carrier: 'nova-poshta' | 'meest'; readonly locationId: Id; readonly isDefault: boolean }
export interface AddressDto extends AddressInput, OwnedResource {}
export interface MessageDto {
  readonly id: Id; readonly conversationId: Id; readonly senderId: Id; readonly text: string;
  readonly createdAt: IsoTimestamp; readonly state: 'persisted' | 'delivered' | 'failed' | 'unknown';
}
export interface ConversationDto { readonly id: Id; readonly participantIds: readonly Id[]; readonly title: string; readonly pinned: boolean; readonly unread: boolean; readonly lastMessage: MessageDto | null }
export interface MessageInput { readonly text: string; readonly clientMessageId: Id }
export interface TicketInput { readonly subject: string; readonly category: 'delivery' | 'payment' | 'other'; readonly text: string }
export interface TicketDto extends OwnedResource { readonly subject: string; readonly category: TicketInput['category']; readonly status: 'open' | 'waiting' | 'closed'; readonly createdAt: IsoTimestamp }
export interface PaymentDto extends OwnedResource { readonly orderId: Id; readonly amount: Money; readonly status: 'pending' | 'authorized' | 'settled' | 'failed' | 'unknown' }
export interface TokenizedPaymentMethodDto { readonly id: Id; readonly brand: string; readonly last4: string }
export interface PaymentHandoffDto { readonly url: string; readonly expiresAt: IsoTimestamp }
export interface DeliveryQuoteDto { readonly id: Id; readonly carrier: 'nova-poshta' | 'meest'; readonly cost: Money | null; readonly expiresAt: IsoTimestamp }

export interface PlannedModules {
  users: { getCurrent(): Promise<UserDto>; updateCurrent(input: Pick<UserDto, 'firstName' | 'lastName'>): Promise<UserDto> };
  identity: { challenge(input: OtpChallengeInput): Promise<OtpChallengeDto>; verify(input: OtpVerifyInput): Promise<SessionDto>; logout(): Promise<void> };
  catalog: { list(input: ProductQuery): Promise<Page<ProductDto>>; get(handle: string): Promise<ProductDto | null> };
  categories: { list(): Promise<readonly CategoryDto[]> };
  cart: { get(): Promise<CartDto>; addLine(input: CartLineInput): Promise<CartDto> };
  orders: { list(cursor?: string): Promise<Page<OrderDto>>; get(id: Id): Promise<OrderDto | null> };
  wishlist: { get(): Promise<WishlistDto>; add(productId: Id): Promise<WishlistDto>; remove(productId: Id): Promise<WishlistDto> };
  reviews: { list(productId: Id): Promise<Page<ReviewDto>>; create(input: ReviewInput): Promise<ReviewDto> };
  addresses: { list(): Promise<readonly AddressDto[]>; create(input: AddressInput): Promise<AddressDto> };
  messages: { listConversations(): Promise<Page<ConversationDto>>; listMessages(id: Id, cursor?: string): Promise<Page<MessageDto>>; create(id: Id, input: MessageInput): Promise<MessageDto> };
  support: { list(): Promise<Page<TicketDto>>; create(input: TicketInput): Promise<TicketDto> };
  payments: { get(id: Id): Promise<PaymentDto>; createHandoff(orderId: Id): Promise<PaymentHandoffDto> };
  delivery: { quote(input: { cartId: Id; addressId: Id }): Promise<DeliveryQuoteDto> };
}

export const plannedModules = [
  { name: 'users', path: '/api/v1/users/me' },
  { name: 'identity', path: '/api/v1/auth/otp/challenges' },
  { name: 'catalog', path: '/api/v1/products' },
  { name: 'categories', path: '/api/v1/categories' },
  { name: 'cart', path: '/api/v1/cart' },
  { name: 'orders', path: '/api/v1/orders' },
  { name: 'wishlist', path: '/api/v1/wishlist' },
  { name: 'reviews', path: '/api/v1/reviews' },
  { name: 'addresses', path: '/api/v1/addresses' },
  { name: 'messages', path: '/api/v1/conversations' },
  { name: 'support', path: '/api/v1/support/tickets' },
  { name: 'payments', path: '/api/v1/payments' },
  { name: 'delivery', path: '/api/v1/delivery/quotes' },
] as const satisfies readonly { name: keyof PlannedModules; path: string }[];
