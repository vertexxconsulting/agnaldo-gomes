export interface CursoCheckout {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  price?: number;
  original_price?: number | null;
  current_price?: number | null;
  discount_percent?: number;
  stripe_payment_link?: string;
  stripe_price_id?: string;
  hotmart_link?: string;
  hotmart_product_id?: string;
  active: boolean;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface CourseEnrollment {
  user_id: string;
  course_id: string;
  enrolled_at?: string;
  status?: string;
}

export interface CoursePurchase {
  id?: string;
  user_id: string;
  course_id: string;
  purchase_type?: string;
  purchase_reference?: string;
  status?: string;
  purchase_amount?: number;
  currency?: string;
  cupom_code?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface Coupon {
  id: string;
  code: string;
  description?: string | null;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  valid_from: string;
  valid_until: string;
  max_uses: number;
  used_count: number;
  course_id?: string | null;
  active: boolean;
  created_at?: string;
}
