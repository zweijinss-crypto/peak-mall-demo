import PayRecordsClient from './pay-records-client';

export const metadata = {
  title: '支付记录 · Peak Mall',
  description: '演示页面,所有卡号仅来自公开测试 BIN 池(非真实银行卡)。',
};

export default function PayRecordsPage() {
  return <PayRecordsClient />;
}