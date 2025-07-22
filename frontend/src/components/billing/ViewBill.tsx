import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Loader2,
    User,
    Building2,
    FlaskConical,
    DollarSign,
    CreditCard,
    Wallet,
    Download,
    FileText,
    Calendar,
    Stethoscope,
    Receipt
} from "lucide-react";
import { toast } from 'sonner';
import { billingApi } from "@/api/billing";
import { paymentApi } from "@/api/payment";
import { Bill, PaymentMethod, PaymentCreateData, BillStatus, PaymentStatus } from "@/types/types";
import { formatDate } from "@/utils/dateUtils";

interface ViewBillProps {
    billId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function ViewBill({
    billId,
    isOpen,
    onClose,
    onSuccess
}: ViewBillProps) {
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
    const [amountPaid, setAmountPaid] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
    const [paymentNotes, setPaymentNotes] = useState<string>("");
    const [processingPayment, setProcessingPayment] = useState(false);
    const [downloadingBill, setDownloadingBill] = useState(false);
    const queryClient = useQueryClient();

    // Fetch bill data
    const { data: bill, isLoading, error } = useQuery<Bill>({
        queryKey: ['bill', billId],
        queryFn: async () => {
            if (!billId) throw new Error('Bill ID is required');
            const response = await billingApi.getBillById(billId);
            return response.data?.data;
        },
        enabled: !!billId && isOpen
    });

    // Process payment mutation
    const processPaymentMutation = useMutation({
        mutationFn: async (paymentData: PaymentCreateData) => {
            return await paymentApi.processPayment(paymentData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bill', billId] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            toast.success('Payment processed successfully');
            setShowPaymentDialog(false);
            setProcessingPayment(false);
            resetPaymentForm();
            if (onSuccess) onSuccess();
        },
        onError: (error: any) => {
            console.error('Error processing payment:', error);
            toast.error(error.response?.data?.message || 'Failed to process payment');
            setProcessingPayment(false);
        },
    });

    // Download bill PDF mutation
    const downloadBillMutation = useMutation({
        mutationFn: async (billId: string) => {
            const response = await billingApi.exportBillPDF(billId);
            return response;
        },
        onSuccess: (response) => {
            // Create blob from response data
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);

            // Create temporary link and trigger download
            const link = document.createElement('a');
            link.href = url;
            link.download = `Bill-${bill?.billNumber || 'unknown'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up
            window.URL.revokeObjectURL(url);

            toast.success('Bill PDF downloaded successfully');
            setDownloadingBill(false);
        },
        onError: (error: any) => {
            console.error('Error downloading bill PDF:', error);
            toast.error(error.response?.data?.message || 'Failed to download bill PDF');
            setDownloadingBill(false);
        },
    });

    const getStatusColor = (status: BillStatus) => {
        switch (status) {
            case 'PAID':
                return 'bg-green-100 text-green-800';
            case 'PARTIALLY_PAID':
                return 'bg-yellow-100 text-yellow-800';
            case 'OVERDUE':
                return 'bg-red-100 text-red-800';
            case 'DRAFT':
                return 'bg-gray-100 text-gray-800';
            case 'GENERATED':
            case 'SENT':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getPaymentStatusColor = (status: PaymentStatus) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-green-100 text-green-800';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800';
            case 'FAILED':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handlePaymentClick = (type: 'full' | 'partial') => {
        setPaymentType(type);
        if (type === 'full') {
            setAmountPaid(bill?.dueAmount || 0);
        } else {
            setAmountPaid(0);
        }
        setShowPaymentDialog(true);
    };

    const resetPaymentForm = () => {
        setPaymentType('full');
        setAmountPaid(0);
        setPaymentMethod(PaymentMethod.CASH);
        setPaymentNotes("");
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!bill?.id) {
            toast.error('No bill found');
            return;
        }

        if (amountPaid <= 0) {
            toast.error('Amount paid must be greater than 0');
            return;
        }

        if (amountPaid > bill.dueAmount) {
            toast.error('Amount paid cannot be greater than amount due');
            return;
        }

        setProcessingPayment(true);

        try {
            const paymentData: PaymentCreateData = {
                billId: bill.id,
                amount: amountPaid,
                paymentMethod: paymentMethod,
                notes: paymentNotes || undefined,
            };

            await processPaymentMutation.mutateAsync(paymentData);
        } catch (error) {
            console.error('Error processing payment:', error);
            toast.error('Failed to process payment');
            setProcessingPayment(false);
        }
    };

    const handleDownloadBill = async () => {
        if (!bill?.id) {
            toast.error('No bill found');
            return;
        }

        setDownloadingBill(true);
        try {
            await downloadBillMutation.mutateAsync(bill.id);
        } catch (error) {
            console.error('Error downloading bill:', error);
            setDownloadingBill(false);
        }
    };

    // Safe calculations with proper null checks
    const totalDiscount = bill?.billItems?.reduce((acc: number, item: any) => acc + (item.discountAmount || 0), 0) || 0;
    const totalAmountWithoutDiscount = bill?.billItems?.reduce((acc: number, item: any) => acc + ((item.unitPrice || 0) * (item.quantity || 0)), 0) || 0;

    // Payment method options
    const paymentMethods = [
        { value: PaymentMethod.CASH, label: 'Cash', icon: Wallet },
        { value: PaymentMethod.CARD, label: 'Card', icon: CreditCard },
        { value: PaymentMethod.UPI, label: 'UPI', icon: CreditCard },
        { value: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer', icon: CreditCard },
        { value: PaymentMethod.CHEQUE, label: 'Cheque', icon: CreditCard },
    ];

    // Early return after all hooks are declared
    if (!billId || !isOpen) {
        return null;
    }

    // Loading state
    if (isLoading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            View Bill
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin mr-2" />
                        <span className="text-sm text-gray-600">Loading bill details...</span>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Error state
    if (error || !bill) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Receipt className="h-5 w-5" />
                            Bill Not Found
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center py-12">
                        <Receipt className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 mb-2">Bill Not Found</h3>
                        <p className="text-gray-500 text-center mb-6">
                            {error instanceof Error ? error.message : 'The requested bill could not be found.'}
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Bill Details
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Bill Header */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Bill #{bill.billNumber}</h3>
                                    <p className="text-sm text-gray-600">Generated on {formatDate(bill.billDate)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                                        {bill.status}
                                    </span>
                                    <Button
                                        onClick={handleDownloadBill}
                                        variant="outline"
                                        size="sm"
                                        disabled={downloadingBill}
                                        className="flex items-center gap-2"
                                    >
                                        {downloadingBill ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Download className="h-4 w-4" />
                                        )}
                                        {downloadingBill ? 'Downloading...' : 'Download PDF'}
                                    </Button>
                                </div>
                            </div>

                            {/* Bill Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900">₹{bill.totalAmount.toFixed(2)}</div>
                                    <div className="text-sm text-gray-500">Total Amount</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xl font-semibold text-green-600">₹{bill.paidAmount.toFixed(2)}</div>
                                    <div className="text-sm text-gray-500">Paid Amount</div>
                                </div>
                                <div className="text-center">
                                    <div className={`text-xl font-semibold ${bill.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        ₹{bill.dueAmount.toFixed(2)}
                                    </div>
                                    <div className="text-sm text-gray-500">Due Amount</div>
                                </div>
                            </div>
                        </div>

                        {/* Patient and Hospital Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Patient Information */}
                            {bill.patient && (
                                <div className="bg-white border rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <User className="h-5 w-5 text-blue-600" />
                                        <h3 className="font-semibold text-gray-900">Patient Information</h3>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div><span className="font-medium">Name:</span> {bill.patient.name}</div>
                                        <div><span className="font-medium">ID:</span> {bill.patient.patientUniqueId}</div>
                                        {bill.patient.phone && (
                                            <div><span className="font-medium">Phone:</span> {bill.patient.phone}</div>
                                        )}
                                        {bill.patient.email && (
                                            <div><span className="font-medium">Email:</span> {bill.patient.email}</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Hospital Information */}
                            {bill.hospital && (
                                <div className="bg-white border rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Building2 className="h-5 w-5 text-green-600" />
                                        <h3 className="font-semibold text-gray-900">Hospital Information</h3>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div><span className="font-medium">Name:</span> {bill.hospital.name}</div>
                                        {bill.hospital.address && (
                                            <div><span className="font-medium">Address:</span> {bill.hospital.address}</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Appointment Info (if exists) */}
                        {bill.appointment && (
                            <div className="bg-white border rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="h-5 w-5 text-purple-600" />
                                    <h3 className="font-semibold text-gray-900">Appointment Details</h3>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4 text-sm">
                                    <div><span className="font-medium">Date & Time:</span> {new Date(bill.appointment.scheduledAt).toLocaleString()}</div>
                                    <div><span className="font-medium">Visit Type:</span> {bill.appointment.visitType}</div>
                                    {bill.appointment.doctor && (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <Stethoscope className="h-4 w-4 text-gray-500" />
                                                <span><span className="font-medium">Doctor:</span> {bill.appointment.doctor.name}</span>
                                            </div>
                                            <div><span className="font-medium">Specialization:</span> {bill.appointment.doctor.specialisation}</div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Bill Items */}
                        {bill.billItems && bill.billItems.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <FlaskConical className="h-5 w-5 text-orange-600" />
                                    <h4 className="font-semibold text-gray-700">Bill Items</h4>
                                </div>
                                <div className="bg-white border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Qty</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Unit Price</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Discount</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {bill.billItems.map((item: any, index: number) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        <div>
                                                            <div className="font-medium">{item.description}</div>
                                                            {item.notes && (
                                                                <div className="text-xs text-gray-500 mt-1">{item.notes}</div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">₹{item.unitPrice.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-sm text-green-600 text-right">
                                                        {item.discountAmount > 0 ? `-₹${item.discountAmount.toFixed(2)}` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">₹{item.totalPrice.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50">
                                            <tr>
                                                <td colSpan={4} className="px-4 py-3 text-right font-semibold text-gray-900">Total:</td>
                                                <td className="px-4 py-3 text-right font-bold text-lg text-gray-900">₹{bill.totalAmount.toFixed(2)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Payment Summary with Discount Info */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Payment Summary
                            </h4>

                            {/* Display original price vs final price if discount applied */}
                            <div className="flex items-center gap-3 text-lg mb-2">
                                <span className="font-bold text-xl text-black">₹{bill.totalAmount.toFixed(2)}</span>
                                {totalDiscount > 0 && (
                                    <>
                                        <span className="line-through text-gray-400 text-base">₹{totalAmountWithoutDiscount.toFixed(2)}</span>
                                        <span className="text-green-600 font-semibold text-base">
                                            {Math.round((totalDiscount / totalAmountWithoutDiscount) * 100)}% off
                                        </span>
                                    </>
                                )}
                            </div>

                            <div className="mt-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Amount Paid:</span>
                                    <span className="font-medium text-green-600">₹{bill.paidAmount.toFixed(2)}</span>
                                </div>
                                <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                                    <span>Amount Due:</span>
                                    <span className={bill.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                                        ₹{bill.dueAmount.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Payment History */}
                        {bill.payments && bill.payments.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                    <h4 className="font-semibold text-gray-700">Payment History</h4>
                                </div>
                                <div className="space-y-3">
                                    {bill.payments.map((payment: any, index: number) => (
                                        <div key={index} className="bg-white border rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-medium">₹{payment.amount.toFixed(2)}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {payment.paymentMethod.replace(/_/g, ' ')} • {formatDate(payment.paymentDate)}
                                                    </div>
                                                    {payment.notes && (
                                                        <div className="text-xs text-gray-400 mt-1">{payment.notes}</div>
                                                    )}
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
                                                    {payment.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {bill.notes && (
                            <div className="space-y-2">
                                <h4 className="font-semibold text-gray-700">Notes</h4>
                                <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700">
                                    {bill.notes}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                            >
                                Close
                            </Button>

                            {bill.dueAmount > 0 && (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handlePaymentClick('partial')}
                                        className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200"
                                    >
                                        Pay Partial Amount
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => handlePaymentClick('full')}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        Pay Full Amount (₹{bill.dueAmount.toFixed(2)})
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            {showPaymentDialog && (
                <Dialog open={showPaymentDialog} onOpenChange={() => setShowPaymentDialog(false)}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                {paymentType === 'full' ? 'Pay Full Amount' : 'Pay Partial Amount'}
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            {/* Payment Summary */}
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm space-y-1">
                                    <div className="flex justify-between">
                                        <span>Amount Due:</span>
                                        <span className="font-medium">₹{bill?.dueAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Amount to Pay:</span>
                                        <span className="font-medium text-green-600">₹{amountPaid.toFixed(2)}</span>
                                    </div>
                                    {paymentType === 'partial' && (
                                        <div className="flex justify-between">
                                            <span>Remaining:</span>
                                            <span className="font-medium text-red-600">₹{(bill?.dueAmount - amountPaid).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Amount Input (for partial payment) */}
                            {paymentType === 'partial' && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Amount to Pay</Label>
                                    <Input
                                        type="number"
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(Number(e.target.value))}
                                        placeholder="Enter amount"
                                        min="0"
                                        max={bill?.dueAmount}
                                        step="0.01"
                                        required
                                        disabled={processingPayment}
                                    />
                                    <div className="text-xs text-gray-500">
                                        Maximum: ₹{bill?.dueAmount.toFixed(2)}
                                    </div>
                                </div>
                            )}

                            {/* Payment Method Selection */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Payment Method</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {paymentMethods.map((method) => {
                                        const IconComponent = method.icon;
                                        return (
                                            <Button
                                                key={method.value}
                                                type="button"
                                                variant={paymentMethod === method.value ? 'default' : 'outline'}
                                                className={`h-auto p-3 flex flex-col items-center gap-2 ${paymentMethod === method.value ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                                onClick={() => setPaymentMethod(method.value)}
                                                disabled={processingPayment}
                                            >
                                                <IconComponent className="h-4 w-4" />
                                                <span className="text-xs">{method.label}</span>
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Notes (Optional)</Label>
                                <textarea
                                    value={paymentNotes}
                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                    placeholder="Add any payment notes..."
                                    className="w-full min-h-[60px] p-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={processingPayment}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowPaymentDialog(false)}
                                    disabled={processingPayment}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700"
                                    disabled={processingPayment || amountPaid <= 0 || amountPaid > (bill?.dueAmount || 0)}
                                >
                                    {processingPayment ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        `Pay ₹${amountPaid.toFixed(2)}`
                                    )}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
} 