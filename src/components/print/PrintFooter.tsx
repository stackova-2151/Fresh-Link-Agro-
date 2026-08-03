/**
 * Reusable Print Footer Component
 * Provides consistent signature section across all print documents
 * Uses CSS to prevent page breaks within the signature section
 */

interface PrintFooterProps {
  showDriverSignature?: boolean;
  showSecuritySignature?: boolean;
  showAuthorisedSignature?: boolean;
  showReceiverSignature?: boolean;
customSignatures?: Array<{
  label: string;
  name?: string;
  mobile?: string;
}>;
}

export function PrintFooter({
  showDriverSignature = true,
  showAuthorisedSignature = true,
  customSignatures
}: PrintFooterProps) {
  const signatures = customSignatures || [
    ...(showDriverSignature ? [{ label: "Driver's Signature" }] : []),
    ...(showAuthorisedSignature ? [{ label: "Authorised Signatory" }] : []),
  ];

  return (
    <div className="print-footer mt-8 pt-6 ">
      <div 
        className="flex justify-between gap-8"
        style={{
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        {signatures.map((signature, index) => (
          <div 
            key={index} 
            className="flex-1 text-center"
            style={{ pageBreakInside: 'avoid' }}
          >
            <div className="pt-2">
              <p className="text-xs text-muted-foreground font-semibold">
                {signature.label}
              </p>
              {signature.name && (
  <div className="mt-1 text-xs text-muted-foreground">
    <p>{signature.name}</p>

    {signature.mobile && (
      <p>{signature.mobile}</p>
    )}
  </div>
)}
            </div>
          </div>
        ))}
      </div>
     
    </div>
  );
}
