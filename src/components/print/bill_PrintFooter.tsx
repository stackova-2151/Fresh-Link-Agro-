interface SignatureBlock {
  label: string;
}

interface PrintFooterProps {
  /**
   * Optional — kept for backward compatibility with existing call sites.
   * NOT used by the default reference layout below (the reference bill
   * always shows "Manager" + "Director / Authorised Signatory", not a
   * generic receiver's-signature line). Pass this only if some other
   * print template in the app still needs the old generic row.
   */
  customSignatures?: SignatureBlock[];
}

export function PrintFooter({ customSignatures }: PrintFooterProps) {
  return (
    <div className="w-full mt-4 text-[14px] leading-snug">
      {/* Certification paragraph */}
      <p className="text-justify">
        We hereby certify that our registration certificate under the Central
        Goods &amp; Service Tax (CGST) Rules, 2017 is in force on the date on
        effected by us &amp; it shall be account for in the turnover of sales
        while filling of return &amp; due tax if any, payable on the sale has
        been paid which the sale of the goods specified in this tax invoice
        is made by us &amp; that the transaction of sale covered by this tax
        invoice has been or shall be paid
      </p>

      {/* Single row: Bank Details (left) | Manager (center) | CIN/Company/Signatures (right) */}
      <div className="flex justify-between items-end mt-2 gap-4">
        {/* Left: Bank Details */}
        <div className="border border-black px-2 py-1 text-[12px] leading-snug min-w-[16rem]">
          <p className="font-bold">BANK DETAILS :</p>
          <p>Fresh link Agro Cold Storage Pvt.Ltd</p>
          <p>Bank of India, Saharkar Nagar C&amp;P Branch</p>
          <p>Current A/c no. - 051320110000832</p>
          <p>IFSC Code- BKID0000513</p>
        </div>

        {/* Center: Manager */}
        <p className="text-center text-xs">Manager</p>

        {/* Right: CIN, Company, Director, Authorised Signatory */}
        <div className="text-right text-[11px] leading-snug">
          <p>CIN : - U74999PN2017PTC170239</p>
          <p className="font-bold">Fresh link Agro Cold Storage Pvt.Ltd</p>
          <div className="mt-4 text-xs">
            <p>Authorised Signatory</p>
          </div>
        </div>
      </div>

      {/* Optional generic signature row — only renders if explicitly passed in */}
      {customSignatures && customSignatures.length > 0 && (
        <div className="flex justify-between text-xs">
          {customSignatures.map((sig, idx) => (
            <p key={idx}>{sig.label}</p>
          ))}
        </div>
      )}
    </div>
  );
}