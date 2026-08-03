/**
 * Reusable Print Header Component
 * Provides consistent branding and layout across all print documents
 */

interface PrintHeaderProps {
  documentTitle: string;
  documentNumber?: string;
  documentDate?: string;
  additionalInfo?: React.ReactNode;
  hideContactInfo?: boolean;
  hideTopDivider?: boolean;

}

export function PrintHeader({
  documentTitle,
  documentNumber,
  documentDate, 
  additionalInfo,
  hideContactInfo = false,
  hideTopDivider = false
}: PrintHeaderProps) {
  return (
    <div className="print-header mb-6">
      {/* Header with Logo and Company Info */}
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-4">
        {/* Left: Company Information */}
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-bold font-headline text-slate-800 uppercase leading-tight mb-2">
            FRESH LINK AGRO COLD STORAGE PVT. LTD.
          </h1>
          {!hideContactInfo && (
            <div className="text-[12px] text-muted-foreground leading-tight space-y-1">
              <p>
                Gat No.319, Gaud Dara Road, Khed Shivapur, Tal.Haveli, Dist.Pune - 412205
              </p>
              <p>
                MOBILE: 9699833995 / 8530818811 / 9423568775
              </p>
            </div>
          )}
        </div>

        {/* Right: Logo */}
        <div className="ml-4 flex-shrink-0">
          <img
            src="/logo.png"
            alt="Fresh Link Agro Logo"
            className="w-20 h-20 object-contain"
          />
        </div>
      </div>

      {/* Document Title */}
      <div className="text-center mb-4">
        <span className="border-2 border-slate-800 px-12 py-2 font-bold text-sm bg-slate-50 uppercase tracking-widest inline-block">
          {documentTitle}
        </span>
      </div>

      {/* Document Info (Number, Date, etc.) */}
      {(documentNumber || documentDate || additionalInfo) && (
        <div className="flex justify-between items-center text-xs mb-4">
          <div className="flex-1">
            {documentNumber && (
              <div className="flex gap-2">
                <span className="font-bold">Document No:</span>
                <span className="border-b border-slate-300 flex-1">{documentNumber}</span>
              </div>
            )}
          </div>
          <div className="flex-1 text-right">
            {documentDate && (
              <div className="flex gap-2 justify-end">
                <span className="font-bold">Date:</span>
                <span className="border-b border-slate-300 flex-1">{documentDate}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Info (if provided) */}
      {additionalInfo && (
        <div className="mb-4">
          {additionalInfo}
        </div>
      )}
    </div>
  );
}
