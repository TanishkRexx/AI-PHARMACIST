export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  DISPATCHED: 'dispatched',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

export const USER_ROLES = {
  CUSTOMER: 'customer',
  PHARMACY: 'pharmacy',
  DISTRIBUTOR: 'distributor',
  ADMIN: 'admin'
};

export const MEDICINE_CATEGORIES = [
  { value: 'painkiller', label: 'Painkillers', icon: '💊' },
  { value: 'antibiotic', label: 'Antibiotics', icon: '🦠' },
  { value: 'antidiabetic', label: 'Diabetes Care', icon: '🩸' },
  { value: 'cardiovascular', label: 'Heart & BP', icon: '❤️' },
  { value: 'respiratory', label: 'Respiratory', icon: '🫁' },
  { value: 'gastrointestinal', label: 'Digestive Health', icon: '🍽️' },
  { value: 'vitamin', label: 'Vitamins & Supplements', icon: '🌟' },
  { value: 'dermatological', label: 'Skin Care', icon: '🧴' },
  { value: 'other', label: 'Other', icon: '📦' }
];

export const ALLERGY_SEVERITY = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' }
];