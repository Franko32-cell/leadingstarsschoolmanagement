// src/pages/student/tabs/FeesTab.jsx

import React from "react";
import { Empty, Loading } from "../components/Ui";
import { FeesOverview, FeeTermCard } from "../components/FeeComponents";

const FeesTab = ({ fees, loading, user, onPaymentSuccess }) => {
  if (loading) return <Loading text="Loading fee records…" />;
  if (fees.length === 0) return <Empty icon="💳" title="No fee records found" sub="Your fee records will appear here once assigned by the school." />;

  return (
    <>
      <FeesOverview fees={fees} />
      {fees.map((fee) => (
        <FeeTermCard key={fee.id} fee={fee} user={user} onPaymentSuccess={onPaymentSuccess} />
      ))}
    </>
  );
};

export default FeesTab;