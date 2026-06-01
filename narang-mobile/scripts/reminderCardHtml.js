/**
 * Same layout as PaymentReminderCard.jsx — used by the preview script.
 */

const APP_NAME_URDU = 'حفیظ زرعی مرکز';

export function formatReminderAmount(amount) {
  const num = Math.abs(Number(amount ?? 0));
  const formatted = num.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return formatted;
}

export function formatReminderDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatPhoneDisplay(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  const n = digits.length >= 10 ? digits.slice(-10) : digits;
  if (n.length === 10) return `0${n}`;
  return String(phone).trim();
}

export function buildReminderCardHtml({
  amountDue = 6040,
  shopNameUrdu = APP_NAME_URDU,
  shopPhone = '03410111243',
  date = new Date(),
}) {
  const amount = formatReminderAmount(amountDue);
  const shop = shopNameUrdu || APP_NAME_URDU;
  const phone = shopPhone ? formatPhoneDisplay(shopPhone) : '';
  const displayDate = formatReminderDate(date);
  const phoneLine = phone ? `<div class="shop-phone">${phone}</div>` : '';

  return `<!DOCTYPE html>
<html lang="ur" dir="rtl">
<head>
  <meta charset="utf-8" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Inter:wght@400;600;800&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #111827;
      padding: 24px;
      font-family: 'Inter', 'Noto Nastaliq Urdu', system-ui, sans-serif;
    }
    .card {
      width: 340px;
      background: #ffffff;
      border-radius: 16px;
      padding: 36px 28px;
      text-align: center;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      font-family: 'Noto Nastaliq Urdu', serif;
      line-height: 1.6;
    }
    .amount {
      font-size: 34px;
      font-weight: 800;
      color: #DC2626;
      margin-top: 20px;
      font-family: 'Inter', sans-serif;
      direction: ltr;
    }
    .date {
      font-size: 15px;
      color: #6B7280;
      margin-top: 8px;
      direction: ltr;
    }
    .shop-block { margin-top: 28px; }
    .shop {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      font-family: 'Noto Nastaliq Urdu', serif;
    }
    .shop-phone {
      font-size: 15px;
      color: #6B7280;
      margin-top: 8px;
      direction: ltr;
    }
    .message {
      margin-top: 28px;
      text-align: right;
      font-size: 16px;
      line-height: 1.75;
      color: #374151;
      font-family: 'Noto Nastaliq Urdu', serif;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="title">پیمنٹ ریمائنڈر</div>
    <div class="amount">${amount}</div>
    <div class="date">${displayDate}</div>
    <div class="shop-block">
      <div class="shop">${shop}</div>
      ${phoneLine}
    </div>
    <div class="message">
      جناب،<br />
      بیلنس ${amount} آپ کے لیجر میں واجب الادا ہیں۔۔<br />
      آپ کے تعاون کا شکریہ۔
    </div>
  </div>
</body>
</html>`;
}
