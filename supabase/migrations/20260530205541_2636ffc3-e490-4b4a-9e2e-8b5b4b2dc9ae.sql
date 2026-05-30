set local role service_role;
select public.service_process_syncpay_webhook(
  'f13fd1ad-368b-4a27-8610-35155bcff887',
  'PAYMENT_RECEIVED',
  jsonb_build_object(
    'event','PAYMENT_RECEIVED',
    'data', jsonb_build_object(
      'id','f13fd1ad-368b-4a27-8610-35155bcff887',
      'status','COMPLETED',
      'amount',10,
      'debtor_account', jsonb_build_object('name','Douglas Pinheiro Santos','document','38548415827')
    )
  ),
  'manual-credit-by-admin',
  'manual-credit-2026-05-30-20-47-douglas'
);
reset role;