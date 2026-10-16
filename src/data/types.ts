export type Role = 'admin' | 'rep'
export type Segment = 'abandoned' | 'recent_buyer' | 'past_buyer'
export type LeadStatus = 'new' | 'contacted' | 'callback' | 'won' | 'lost'
export type Channel = 'call' | 'whatsapp' | 'email'
export type StopPoint = 'cart' | 'shipping' | 'payment' | 'none'
export type RecommendedAction = 'finish_sale' | 'upsell' | 'reactivate'
export type Disposition = 'no_answer' | 'voicemail' | 'wrong_number' | 'callback' | 'not_interested' | 'won' | 'dnc'

export interface User {
  id: string
  name: string
  role: Role
  clientIds: string[]
}

export interface Snippet {
  id: string
  title: string
  text: string // supports {{variables}} incl. {{recovery_link}} and {{discount_code}}
}
export interface Objection {
  id: string
  q: string
  a: string
}
export interface Offer {
  code: string
  label: string
  repAllowed: boolean // reps may apply it without admin approval
}

export interface ChatbotSettings {
  enabled: boolean
  name: string // persona shown to customers
  tone: 'friendly' | 'concise' | 'premium'
  maxFollowUps: number // automatic nudges when the customer goes quiet
  handoffAbove: number // carts worth at least this go to a rep once the customer shows intent (0 = never)
  offerCodes: string[] // discount codes the bot may offer (subset of offers)
}

export interface ClientSettings {
  chatbot: ChatbotSettings
  color: string
  logo: string // short text shown in the brand badge
  productNotes: string
  scripts: Record<RecommendedAction, string>
  recentBuyerDays: number // order within N days => recent buyer, older => past buyer
  abandonedAfterHours: number // checkout counts as abandoned after N hours
  snippets: Snippet[]
  objections: Objection[]
  offers: Offer[]
}

export interface Client {
  id: string
  name: string
  shopifyDomain: string
  status: 'connected' | 'error'
  lastSync: string
  currency: string
  scopes: string[]
  protectedDataApproved: boolean
  settings: ClientSettings
}

export interface CartItem {
  title: string
  qty: number
  price: number
}

export interface ShopOrder {
  id: string
  date: string
  total: number
  status: 'Paid' | 'Fulfilled' | 'Refunded'
  items: string
}

export interface AutoContact {
  automationId: string
  channel: 'whatsapp' | 'email'
  at: string
}

export interface Lead {
  id: string
  clientId: string
  shopifyCustomerId: string
  name: string
  email: string
  phone: string
  country: string
  ordersCount: number
  ltv: number
  currency: string
  orders: ShopOrder[]
  cart: CartItem[]
  cartValue: number
  checkoutAt: string | null // open (uncompleted) checkout, if any
  checkoutUrl: string | null // Shopify abandonedCheckoutUrl (recovery link)
  stopPoint: StopPoint
  stopReason: string | null
  reasonSource: 'inferred' | 'rep'
  lastOrderAt: string | null
  lastActivityAt: string
  status: LeadStatus
  assigneeId: string | null
  claimedAt: string | null
  attempts: number // call attempts logged by reps
  lastDisposition: Disposition | null
  callbackAt: string | null
  lostReason: string | null
  dnc: boolean
  discountCode: string | null
  holdout: boolean // control group: never contacted, used to measure uplift
  autoContacts: AutoContact[]
  reachable: boolean // has at least one contact method
  emailConsent: boolean
  smsConsent: boolean // also used for WhatsApp opt-in
  notes: string
}

export interface CallReview {
  rating: number
  comment: string
  by: string
  at: string
}

export interface Interaction {
  id: string
  leadId: string
  type: Channel | 'note' | 'status' | 'auto'
  text: string
  at: string
  userId: string | null
  disposition?: Disposition
  durationSec?: number
  review?: CallReview
}

export interface ActiveCall {
  leadId: string
  userId: string
  startedAt: string
}

export interface Automation {
  id: string
  clientId: string
  name: string
  segment: Segment
  delayHours: number
  channel: 'whatsapp' | 'email'
  template: string
  requireConsent: boolean
  enabled: boolean
}

export interface AutomationRun {
  id: string
  automationId: string
  at: string
  sent: number
  skipped: Record<string, number> // reason -> count
}

export type ConvStatus = 'bot' | 'needs_human' | 'human' | 'won' | 'closed'
export interface ChatMessage {
  id: string
  from: 'customer' | 'bot' | 'rep' | 'system'
  text: string
  at: string
  offer?: string // discount code offered in this message
}
export interface Conversation {
  id: string
  leadId: string
  clientId: string
  channel: 'whatsapp'
  status: ConvStatus
  handoffReason: string | null
  followUps: number
  updatedAt: string
  messages: ChatMessage[]
}
