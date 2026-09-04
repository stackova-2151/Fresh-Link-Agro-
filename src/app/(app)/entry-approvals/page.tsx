'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/context/user-context';
import { useToast } from '@/hooks/use-toast';
import { hasEntryApprovalsPermission } from '@/lib/utils';
import { approvalService } from '@/lib/services/approval.service';
import { approvalExecutionService } from '@/lib/services/approval-execution.service';
import { approvalRecoveryService } from '@/lib/services/approval-recovery.service';
import type { EntryApprovalRequest, ApprovalRecoveryInvestigation, ProcessingApprovalInvestigation } from '@/lib/types/approval';
import { buildStructuredDiff } from '@/lib/utils/approval-display';

// ─── Changed Fields Display ────────────────────────────────────────────────────

/** Returns the number of visible field rows the diff will render — used to keep
 * the heading count in exact sync with what is actually displayed. */
function countVisibleChanges(diff: ReturnType<typeof buildStructuredDiff>): number {
  const itemFieldCount = diff.itemChanges.reduce((sum, ic) => sum + ic.fields.length, 0);
  return diff.voucherChanges.length + itemFieldCount;
}

function ChangedFieldsDisplay({ request }: { request: EntryApprovalRequest }) {
  const diff = buildStructuredDiff(
    request.originalData,
    request.requestedData,
    request.changedFields
  );

  const hasAnything = diff.voucherChanges.length > 0 || diff.itemChanges.length > 0;

  if (!hasAnything) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No detailed change information available.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Voucher-level changes (date, client, etc.) */}
      {diff.voucherChanges.length > 0 && (
        <div className="rounded-md border border-black/70 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-1/3 border-b border-black/70">Field</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-1/3 border-b border-black/70">Previous</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-1/3 border-b border-black/70">New</th>
              </tr>
            </thead>
            <tbody>
              {diff.voucherChanges.map((change, idx) => (
                <tr key={idx} className="border-t border-black/10">
                  <td className="px-3 py-2 font-medium">{change.label}</td>
                  <td className="px-3 py-2 text-muted-foreground">{change.oldValue}</td>
                  <td className="px-3 py-2 text-teal-700 font-medium">{change.newValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Item-level changes */}
      {diff.itemChanges.map((itemChange) => (
        <div key={itemChange.itemIndex} className="rounded-md border border-black/70 overflow-hidden">
          {/* Item header */}
          <div className={`px-3 py-2 text-sm font-semibold flex items-center gap-2 border-b border-black/70 ${
            itemChange.changeType === 'added'
              ? 'bg-teal-50 text-teal-800'
              : itemChange.changeType === 'removed'
              ? 'bg-red-50 text-red-800'
              : 'bg-muted/50 text-foreground'
          }`}>
            {itemChange.changeType === 'added' && (
              <span className="text-xs font-bold uppercase tracking-wide text-teal-600">+ New Item</span>
            )}
            {itemChange.changeType === 'removed' && (
              <span className="text-xs font-bold uppercase tracking-wide text-red-600">− Removed</span>
            )}
            {itemChange.changeType === 'modified' && (
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Item {itemChange.itemIndex + 1}</span>
            )}
            <span>{itemChange.itemName}</span>
          </div>

          {/* Field changes table */}
          {itemChange.fields.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground w-1/3 border-b border-black/40">Field</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground w-1/3 border-b border-black/40">Previous</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground w-1/3 border-b border-black/40">New</th>
                </tr>
              </thead>
              <tbody>
                {itemChange.fields.map((field, fIdx) => (
                  <tr key={fIdx} className="border-t border-black/10">
                    <td className="px-3 py-2 font-medium">{field.label}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {itemChange.changeType === 'added' ? '—' : field.oldValue}
                    </td>
                    <td className={`px-3 py-2 font-medium ${
                      itemChange.changeType === 'removed' ? 'text-muted-foreground line-through' : 'text-teal-700'
                    }`}>
                      {itemChange.changeType === 'removed' ? field.oldValue : field.newValue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

type TabType = 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'FAILED';

export default function EntryApprovalsPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('PENDING');
  const [requests, setRequests] = useState<EntryApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showInvestigationDialog, setShowInvestigationDialog] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<EntryApprovalRequest | null>(null);
  const [approvalReason, setApprovalReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [recoveryReason, setRecoveryReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [investigation, setInvestigation] = useState<ApprovalRecoveryInvestigation | null>(null);
  const [investigating, setInvestigating] = useState(false);
  const [processingInvestigation, setProcessingInvestigation] = useState<ProcessingApprovalInvestigation | null>(null);
  const [processingInvestigating, setProcessingInvestigating] = useState(false);
  const [showProcessingInvestigationDialog, setShowProcessingInvestigationDialog] = useState(false);
  const [showProcessingRecoveryDialog, setShowProcessingRecoveryDialog] = useState(false);
  const [processingRecoveryReason, setProcessingRecoveryReason] = useState('');
  const [processingRecoveryAction, setProcessingRecoveryAction] = useState<'MARK_FAILED' | 'MARK_APPROVED' | null>(null);

  // Check access and load requests
  useEffect(() => {
    const access = hasEntryApprovalsPermission(user);
    setHasAccess(access);
    
    if (user && !access) {
      router.push('/dashboard');
      return;
    }

    loadRequests();
  }, [user, router]);

  // Load requests based on active tab
  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await approvalService.getApprovalRequestsByStatus(activeTab);
      setRequests(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load approval requests',
        description: String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  // Reload when tab changes
  useEffect(() => {
    if (hasAccess) {
      loadRequests();
    }
  }, [activeTab, hasAccess]);

  const handleApprove = async () => {
    if (!selectedRequest || !user) return;

    setProcessing(true);
    try {
      const result = await approvalExecutionService.executeApproval(
        selectedRequest.id,
        {
          id: user.id,
          name: user.name,
          role: user.role,
        },
        user,
        approvalReason
      );

      if (result.success) {
        toast({
          title: 'Approval Successful',
          description: `${selectedRequest.entryNumber} has been approved and the requested changes were applied successfully.`,
        });
        setShowApproveDialog(false);
        setApprovalReason('');
        setSelectedRequest(null);
        loadRequests();
      } else {
        toast({
          variant: 'destructive',
          title: 'Approval Failed',
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Approval Failed',
        description: String(error),
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !user) return;

    setProcessing(true);
    try {
      const result = await approvalExecutionService.rejectApproval(
        selectedRequest.id,
        {
          id: user.id,
          name: user.name,
          role: user.role,
        },
        user,
        rejectionReason
      );

      if (result.success) {
        toast({
          title: 'Request Rejected',
          description: `${selectedRequest.entryNumber} update request was rejected.`,
        });
        setShowRejectDialog(false);
        setRejectionReason('');
        setSelectedRequest(null);
        loadRequests();
      } else {
        toast({
          variant: 'destructive',
          title: 'Rejection Failed',
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Rejection Failed',
        description: String(error),
      });
    } finally {
      setProcessing(false);
    }
  };

  const openApproveDialog = (request: EntryApprovalRequest) => {
    setSelectedRequest(request);
    setApprovalReason('');
    setShowApproveDialog(true);
  };

  const openRejectDialog = (request: EntryApprovalRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const openDetailsDialog = (request: EntryApprovalRequest) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
  };

  const handleInvestigate = async () => {
    if (!selectedRequest || !user) return;

    setInvestigating(true);
    try {
      const result = await approvalRecoveryService.investigateFailedApproval(
        selectedRequest.id,
        user
      );

      if (result.success && result.investigation) {
        setInvestigation(result.investigation);
        setShowInvestigationDialog(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Investigation Failed',
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Investigation Failed',
        description: String(error),
      });
    } finally {
      setInvestigating(false);
    }
  };

  const handleMarkApprovedAfterRecovery = async () => {
    if (!selectedRequest || !user || !recoveryReason.trim()) return;

    setProcessing(true);
    try {
      const result = await approvalRecoveryService.markApprovedAfterRecovery(
        {
          requestId: selectedRequest.id,
          actor: {
            id: user.id,
            name: user.name,
            role: user.role,
          },
          recoveryReason,
        },
        user
      );

      if (result.success) {
        toast({
          title: 'Recovery Successful',
          description: `${selectedRequest.entryNumber} has been marked as approved.`,
        });
        setShowRecoveryDialog(false);
        setRecoveryReason('');
        setSelectedRequest(null);
        setInvestigation(null);
        loadRequests();
      } else {
        toast({
          variant: 'destructive',
          title: 'Recovery Failed',
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Recovery Failed',
        description: String(error),
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleInvestigateProcessing = async () => {
    if (!selectedRequest || !user) return;

    setProcessingInvestigating(true);
    try {
      const result = await approvalRecoveryService.investigateProcessingApproval(
        { requestId: selectedRequest.id },
        user
      );

      if (result.success && result.investigation) {
        setProcessingInvestigation(result.investigation);
        setShowProcessingInvestigationDialog(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Processing Investigation Failed',
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Processing Investigation Failed',
        description: String(error),
      });
    } finally {
      setProcessingInvestigating(false);
    }
  };

  const handleProcessingRecovery = async () => {
    if (!selectedRequest || !user || !processingRecoveryReason.trim() || !processingRecoveryAction) return;

    setProcessing(true);
    try {
      let result;
      if (processingRecoveryAction === 'MARK_FAILED') {
        result = await approvalRecoveryService.markFailedAfterProcessingRecovery(
          {
            requestId: selectedRequest.id,
            actor: {
              id: user.id,
              name: user.name,
              role: user.role,
            },
            recoveryReason: processingRecoveryReason,
          },
          user
        );
      } else if (processingRecoveryAction === 'MARK_APPROVED') {
        result = await approvalRecoveryService.markApprovedAfterProcessingRecovery(
          {
            requestId: selectedRequest.id,
            actor: {
              id: user.id,
              name: user.name,
              role: user.role,
            },
            recoveryReason: processingRecoveryReason,
          },
          user
        );
      } else {
        return;
      }

      if (result.success) {
        toast({
          title: 'Processing Recovery Successful',
          description: `${selectedRequest.entryNumber} has been ${processingRecoveryAction === 'MARK_FAILED' ? 'marked as failed' : 'marked as approved'}.`,
        });
        setShowProcessingRecoveryDialog(false);
        setProcessingRecoveryReason('');
        setProcessingRecoveryAction(null);
        setSelectedRequest(null);
        setProcessingInvestigation(null);
        loadRequests();
      } else {
        toast({
          variant: 'destructive',
          title: 'Processing Recovery Failed',
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Processing Recovery Failed',
        description: String(error),
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Entry Approvals" description="View and manage entry update approval requests." />
      
      <Card>
        <CardHeader>
          <CardTitle>Entry Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <Button
              variant={activeTab === 'PENDING' ? 'default' : 'outline'}
              onClick={() => setActiveTab('PENDING')}
            >
              Pending ({requests.filter(r => r.status === 'PENDING').length})
            </Button>
            <Button
              variant={activeTab === 'PROCESSING' ? 'default' : 'outline'}
              onClick={() => setActiveTab('PROCESSING')}
            >
              Processing ({requests.filter(r => r.status === 'PROCESSING').length})
            </Button>
            <Button
              variant={activeTab === 'APPROVED' ? 'default' : 'outline'}
              onClick={() => setActiveTab('APPROVED')}
            >
              Approved
            </Button>
            <Button
              variant={activeTab === 'REJECTED' ? 'default' : 'outline'}
              onClick={() => setActiveTab('REJECTED')}
            >
              Rejected
            </Button>
            <Button
              variant={activeTab === 'FAILED' ? 'default' : 'outline'}
              onClick={() => setActiveTab('FAILED')}
            >
              Failed ({requests.filter(r => r.status === 'FAILED').length})
            </Button>
          </div>

          {/* Requests Table */}
          {loading ? (
            <div className="text-center text-muted-foreground py-12">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No {activeTab.toLowerCase()} approval requests found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry No</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono">{request.entryNumber}</TableCell>
                    <TableCell>{request.entryType}</TableCell>
                    <TableCell>{request.requestedBy.name}</TableCell>
                    <TableCell>{new Date(request.requestedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.changedFields.length} changes</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{request.requestReason}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          request.status === 'APPROVED' ? 'default' :
                          request.status === 'REJECTED' ? 'destructive' :
                          request.status === 'PROCESSING' ? 'outline' :
                          request.status === 'FAILED' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailsDialog(request)}
                        >
                          View Details
                        </Button>
                        {request.status === 'PENDING' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openApproveDialog(request)}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openRejectDialog(request)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {request.status === 'PROCESSING' && (
                          <>
                            {request.processingAt && (() => {
                              const processingAgeMs = Date.now() - new Date(request.processingAt).getTime();
                              const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
                              const isTimeoutExceeded = processingAgeMs >= PROCESSING_TIMEOUT_MS;
                              
                              if (isTimeoutExceeded) {
                                return (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setProcessingInvestigation(null);
                                      handleInvestigateProcessing();
                                    }}
                                    disabled={processingInvestigating}
                                  >
                                    {processingInvestigating ? 'Investigating...' : 'Investigate Processing'}
                                  </Button>
                                );
                              } else {
                                return (
                                  <span className="text-sm text-muted-foreground">
                                    Processing... ({Math.floor(processingAgeMs / 1000)}s)
                                  </span>
                                );
                              }
                            })()}
                          </>
                        )}
                        {request.status === 'FAILED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setInvestigation(null);
                              handleInvestigate();
                            }}
                            disabled={investigating}
                          >
                            {investigating ? 'Investigating...' : 'View Investigation'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Approve the update request for {selectedRequest?.entryNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Approval Reason (Optional)</label>
              <Textarea
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder="Add a note for this approval..."
                className="mt-2"
              />
            </div>
            {selectedRequest && (
              <div className="text-sm text-muted-foreground">
                <div><strong>Changes:</strong> {countVisibleChanges(buildStructuredDiff(selectedRequest.originalData, selectedRequest.requestedData, selectedRequest.changedFields))} fields modified</div>
                <div><strong>Request Reason:</strong> {selectedRequest.requestReason}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? 'Processing...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Reject the update request for {selectedRequest?.entryNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rejection Reason *</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                className="mt-2"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing || !rejectionReason.trim()}>
              {processing ? 'Processing...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details - {selectedRequest?.entryNumber}</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Entry Type:</span> {selectedRequest.entryType}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {selectedRequest.status}
                </div>
                <div>
                  <span className="font-medium">Requested By:</span> {selectedRequest.requestedBy.name} ({selectedRequest.requestedBy.role})
                </div>
                <div>
                  <span className="font-medium">Request Date:</span> {new Date(selectedRequest.requestedAt).toLocaleString()}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Request Reason</h4>
                <p className="text-sm text-muted-foreground">{selectedRequest.requestReason}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Changed Fields ({countVisibleChanges(buildStructuredDiff(selectedRequest.originalData, selectedRequest.requestedData, selectedRequest.changedFields))})</h4>
                <ChangedFieldsDisplay request={selectedRequest} />
              </div>

              {selectedRequest.status === 'APPROVED' && (
                <div>
                  <h4 className="font-medium mb-2">Approval Information</h4>
                  <div className="text-sm text-muted-foreground">
                    <div>Approved By: {selectedRequest.approvedBy?.name}</div>
                    <div>Approved At: {selectedRequest.approvedAt ? new Date(selectedRequest.approvedAt).toLocaleString() : 'N/A'}</div>
                    {selectedRequest.approvalReason && <div>Reason: {selectedRequest.approvalReason}</div>}
                  </div>
                </div>
              )}

              {selectedRequest.status === 'REJECTED' && (
                <div>
                  <h4 className="font-medium mb-2">Rejection Information</h4>
                  <div className="text-sm text-muted-foreground">
                    <div>Rejected By: {selectedRequest.rejectedBy?.name}</div>
                    <div>Rejected At: {selectedRequest.rejectedAt ? new Date(selectedRequest.rejectedAt).toLocaleString() : 'N/A'}</div>
                    <div>Reason: {selectedRequest.rejectionReason}</div>
                  </div>
                </div>
              )}

              {selectedRequest.status === 'PROCESSING' && (
                <div>
                  <h4 className="font-medium mb-2">Processing Information</h4>
                  <div className="text-sm text-muted-foreground">
                    <div>Processing By: {selectedRequest.processingBy?.name}</div>
                    <div>Processing At: {selectedRequest.processingAt ? new Date(selectedRequest.processingAt).toLocaleString() : 'N/A'}</div>
                  </div>
                </div>
              )}

              {selectedRequest.status === 'FAILED' && (
                <div>
                  <h4 className="font-medium mb-2">Failure Information</h4>
                  <div className="text-sm text-muted-foreground">
                    <div>Failed At: {selectedRequest.failedAt ? new Date(selectedRequest.failedAt).toLocaleString() : 'N/A'}</div>
                    <div>Failure Reason: {selectedRequest.failureReason}</div>
                    {selectedRequest.failureInfo && (
                      <>
                        <div>Failure Stage: {selectedRequest.failureInfo.stage}</div>
                        <div>Partial Execution Possible: {selectedRequest.failureInfo.partialExecutionPossible ? 'Yes' : 'No'}</div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {selectedRequest.recoveredBy && (
                <div>
                  <h4 className="font-medium mb-2">Recovery Information</h4>
                  <div className="text-sm text-muted-foreground">
                    <div>Recovered By: {selectedRequest.recoveredBy.name}</div>
                    <div>Recovered At: {selectedRequest.recoveredAt ? new Date(selectedRequest.recoveredAt).toLocaleString() : 'N/A'}</div>
                    <div>Recovery Reason: {selectedRequest.recoveryReason}</div>
                  </div>
                </div>
              )}

              {selectedRequest.processingRecoveryInvestigation && (
                <div>
                  <h4 className="font-medium mb-2">Processing Recovery Investigation</h4>
                  <div className="bg-muted p-3 rounded text-sm">
                    <div><strong>Investigated At:</strong> {new Date(selectedRequest.processingRecoveryInvestigation.investigatedAt).toLocaleString()}</div>
                    <div><strong>Processing Age:</strong> {Math.floor(selectedRequest.processingRecoveryInvestigation.processingAgeMs / 1000)}s</div>
                    <div><strong>Execution State:</strong> {selectedRequest.processingRecoveryInvestigation.executionState}</div>
                    <div><strong>Current State:</strong> {selectedRequest.processingRecoveryInvestigation.currentState}</div>
                    {selectedRequest.processingRecoveryInvestigation.stockState && (
                      <div><strong>Stock State:</strong> {selectedRequest.processingRecoveryInvestigation.stockState}</div>
                    )}
                    {selectedRequest.processingRecoveryInvestigation.rentalItemsState && (
                      <div><strong>Rental Items State:</strong> {selectedRequest.processingRecoveryInvestigation.rentalItemsState}</div>
                    )}
                    <div><strong>Safe Actions:</strong> {selectedRequest.processingRecoveryInvestigation.safeActions.join(', ')}</div>
                    <div className="mt-2"><strong>Findings:</strong></div>
                    {selectedRequest.processingRecoveryInvestigation.findings.map((finding, idx) => (
                      <div key={idx} className="ml-2">• {finding}</div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.recoveryInvestigation && (
                <div>
                  <h4 className="font-medium mb-2">Recovery Investigation</h4>
                  <div className="bg-muted p-3 rounded text-sm">
                    <div><strong>Investigated At:</strong> {new Date(selectedRequest.recoveryInvestigation.investigatedAt).toLocaleString()}</div>
                    <div><strong>Current State:</strong> {selectedRequest.recoveryInvestigation.currentState}</div>
                    {selectedRequest.recoveryInvestigation.stockState && (
                      <div><strong>Stock State:</strong> {selectedRequest.recoveryInvestigation.stockState}</div>
                    )}
                    {selectedRequest.recoveryInvestigation.rentalItemsState && (
                      <div><strong>Rental Items State:</strong> {selectedRequest.recoveryInvestigation.rentalItemsState}</div>
                    )}
                    <div><strong>Safe Actions:</strong> {selectedRequest.recoveryInvestigation.safeActions.join(', ')}</div>
                    <div className="mt-2"><strong>Findings:</strong></div>
                    {selectedRequest.recoveryInvestigation.findings.map((finding, idx) => (
                      <div key={idx} className="ml-2">• {finding}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Investigation Dialog */}
      <Dialog open={showInvestigationDialog} onOpenChange={setShowInvestigationDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Investigation Results - {selectedRequest?.entryNumber}</DialogTitle>
          </DialogHeader>
          {investigation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Entry Type:</span> {investigation.entryType}
                </div>
                <div>
                  <span className="font-medium">Current State:</span> {investigation.currentState}
                </div>
                <div>
                  <span className="font-medium">Voucher Exists:</span> {investigation.voucherExists ? 'Yes' : 'No'}
                </div>
                {investigation.stockState && (
                  <div>
                    <span className="font-medium">Stock State:</span> {investigation.stockState}
                  </div>
                )}
                {investigation.rentalItemsState && (
                  <div>
                    <span className="font-medium">Rental Items State:</span> {investigation.rentalItemsState}
                  </div>
                )}
              </div>

              {investigation.failureInfo && (
                <div>
                  <h4 className="font-medium mb-2">Failure Information</h4>
                  <div className="bg-muted p-3 rounded text-sm">
                    <div><strong>Stage:</strong> {investigation.failureInfo.stage}</div>
                    <div><strong>Message:</strong> {investigation.failureInfo.message}</div>
                    <div><strong>Partial Execution Possible:</strong> {investigation.failureInfo.partialExecutionPossible ? 'Yes' : 'No'}</div>
                    {investigation.failureInfo.executionStartedAt && (
                      <div><strong>Execution Started:</strong> {new Date(investigation.failureInfo.executionStartedAt).toLocaleString()}</div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Investigation Findings</h4>
                <div className="bg-muted p-3 rounded text-sm">
                  {investigation.findings.map((finding, idx) => (
                    <div key={idx} className="mb-1">• {finding}</div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Recommended Actions</h4>
                <div className="flex gap-2 flex-wrap">
                  {investigation.safeActions.includes('MARK_APPROVED') && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setShowInvestigationDialog(false);
                        setShowRecoveryDialog(true);
                      }}
                    >
                      Mark as Approved
                    </Button>
                  )}
                  {investigation.safeActions.includes('MANUAL_REVIEW') && (
                    <Badge variant="destructive">Manual Review Required</Badge>
                  )}
                  {investigation.safeActions.includes('NO_ACTION') && (
                    <Badge variant="secondary">No Action Recommended</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowInvestigationDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Processing Investigation Dialog */}
      <Dialog open={showProcessingInvestigationDialog} onOpenChange={setShowProcessingInvestigationDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Processing Investigation Results - {selectedRequest?.entryNumber}</DialogTitle>
          </DialogHeader>
          {processingInvestigation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Entry Type:</span> {processingInvestigation.entryType}
                </div>
                <div>
                  <span className="font-medium">Processing Age:</span> {Math.floor(processingInvestigation.processingAgeMs / 1000)}s
                </div>
                <div>
                  <span className="font-medium">Execution State:</span> {processingInvestigation.executionState}
                </div>
                <div>
                  <span className="font-medium">Current State:</span> {processingInvestigation.currentState}
                </div>
                {processingInvestigation.stockState && (
                  <div>
                    <span className="font-medium">Stock State:</span> {processingInvestigation.stockState}
                  </div>
                )}
                {processingInvestigation.rentalItemsState && (
                  <div>
                    <span className="font-medium">Rental Items State:</span> {processingInvestigation.rentalItemsState}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Investigation Findings</h4>
                <div className="bg-muted p-3 rounded text-sm">
                  {processingInvestigation.findings.map((finding, idx) => (
                    <div key={idx} className="mb-1">• {finding}</div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Recommended Actions</h4>
                <div className="flex gap-2 flex-wrap">
                  {processingInvestigation.safeActions.includes('MARK_FAILED') && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setShowProcessingInvestigationDialog(false);
                        setProcessingRecoveryAction('MARK_FAILED');
                        setShowProcessingRecoveryDialog(true);
                      }}
                    >
                      Mark as Failed
                    </Button>
                  )}
                  {processingInvestigation.safeActions.includes('MARK_APPROVED') && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setShowProcessingInvestigationDialog(false);
                        setProcessingRecoveryAction('MARK_APPROVED');
                        setShowProcessingRecoveryDialog(true);
                      }}
                    >
                      Mark as Approved
                    </Button>
                  )}
                  {processingInvestigation.safeActions.includes('MANUAL_REVIEW') && (
                    <Badge variant="destructive">Manual Review Required</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowProcessingInvestigationDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Processing Recovery Dialog */}
      <Dialog open={showProcessingRecoveryDialog} onOpenChange={setShowProcessingRecoveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {processingRecoveryAction === 'MARK_FAILED' ? 'Mark as Failed' : 'Mark as Approved'} - {selectedRequest?.entryNumber}
            </DialogTitle>
            <DialogDescription>
              {processingRecoveryAction === 'MARK_FAILED'
                ? 'This will mark the request as FAILED. Use this when execution definitely did not start.'
                : 'This will mark the request as APPROVED without re-executing business logic. Only do this if investigation confirms business data is already correctly applied.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {processingInvestigation && (
              <div className="text-sm text-muted-foreground">
                <div><strong>Execution State:</strong> {processingInvestigation.executionState}</div>
                <div><strong>Current State:</strong> {processingInvestigation.currentState}</div>
                {processingInvestigation.rentalItemsState && <div><strong>Rental Items State:</strong> {processingInvestigation.rentalItemsState}</div>}
                {processingInvestigation.stockState && <div><strong>Stock State:</strong> {processingInvestigation.stockState}</div>}
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Recovery Reason *</label>
              <Textarea
                value={processingRecoveryReason}
                onChange={(e) => setProcessingRecoveryReason(e.target.value)}
                placeholder="Explain why this request can be safely recovered..."
                className="mt-2"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProcessingRecoveryDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleProcessingRecovery}
              disabled={processing || !processingRecoveryReason.trim()}
              variant={processingRecoveryAction === 'MARK_FAILED' ? 'destructive' : 'default'}
            >
              {processing ? 'Processing...' : processingRecoveryAction === 'MARK_FAILED' ? 'Mark Failed' : 'Mark Approved'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recovery Dialog */}
      <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Approved - {selectedRequest?.entryNumber}</DialogTitle>
            <DialogDescription>
              This will mark the request as APPROVED without re-executing business logic.
              Only do this if investigation confirms business data is already correctly applied.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {investigation && (
              <div className="text-sm text-muted-foreground">
                <div><strong>Current State:</strong> {investigation.currentState}</div>
                {investigation.stockState && <div><strong>Stock State:</strong> {investigation.stockState}</div>}
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Recovery Reason *</label>
              <Textarea
                value={recoveryReason}
                onChange={(e) => setRecoveryReason(e.target.value)}
                placeholder="Explain why this request can be safely marked as approved..."
                className="mt-2"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecoveryDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleMarkApprovedAfterRecovery} disabled={processing || !recoveryReason.trim()}>
              {processing ? 'Processing...' : 'Mark Approved'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
