import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, DollarSign, User, Stethoscope, Receipt, FlaskConical, Clock, CheckCircle, CreditCard, Wallet, Download, CodeSquare } from "lucide-react";
import { toast } from 'sonner';
import { billingApi } from "@/api/billing";
import { labApi } from "@/api/lab";
import { paymentApi } from "@/api/payment";
import { Bill, BillStatus, PaymentStatus, BillType, LabTestStatus, PaymentMethod, PaymentCreateData, AppointmentStatus } from "@/types/types";
import { formatDate } from "@/utils/dateUtils";

interface ViewAppointmentBillProps {
    appointmentId: string;
    isOpen: boolean;
    ifpayment: () => void;
    onClose: () => void;
}

interface PendingLabTest {
    id: string;
    labTest: {
        id: string;
        name: string;
        charge: number;
    };
    status: string;
    tentativeReportDate?: string;
}

export default function ViewAppointmentBill({
    appointmentId,
    ifpayment,
    isOpen,
    onClose
}: ViewAppointmentBillProps) {
    // Early return BEFORE any hooks
    if (!appointmentId || !isOpen) return null;

    // All hooks must be called in the same order every time
    const [pendingLabTests, setPendingLabTests] = useState<PendingLabTest[]>([]);
    const [labTestDiscounts, setLabTestDiscounts] = useState<Record<string, { type: 'percentage' | 'custom', value: number }>>({});
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
    const [amountPaid, setAmountPaid] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
    const [paymentNotes, setPaymentNotes] = useState<string>("");
    const [processingPayment, setProcessingPayment] = useState(false);
    const [downloadingBill, setDownloadingBill] = useState(false);
    const queryClient = useQueryClient();
    const [bill, setBill] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [billNotFound, setBillNotFound] = useState(false);

    // Fetch lab tests for this appointment - ALL hooks must be called before conditional logic
    const { data: labTests, isLoading: labTestsLoading, refetch: refetchLabTests } = useQuery<any[]>({
        queryKey: ["appointment-lab-tests", appointmentId],
        queryFn: async () => {
            const response = await labApi.getOrderedTestsByAppointment(appointmentId);
            return response.data?.data || [];
        },
        enabled: !!appointmentId && isOpen,
    });

    const fetchBill = async () => {
        setIsLoading(true);
        setBillNotFound(false);
        try {
            const response = await billingApi.getAppointmentBilling(appointmentId);
            const billData = response.data?.data;
            setBill(billData);
            setBillNotFound(!billData);
        } catch (error: any) {
            console.error('Error fetching bill:', error);
            setBill(null);
            setBillNotFound(true);
            // Don't show error toast for 404/not found cases
            if (error.response?.status !== 404) {
                toast.error('Failed to fetch bill details');
            }
        } finally {
            setIsLoading(false);
        }
    }

    // Fetch bill details
    useEffect(() => {
        fetchBill();
    }, [appointmentId]);

    // Safe calculations with proper null checks
    const totalDiscount = bill?.billItems?.reduce((acc: number, item: any) => acc + (item.discountAmount || 0), 0) || 0;
    const totalAmountWithoutDiscount = bill?.billItems?.reduce((acc: number, item: any) => acc + ((item.unitPrice || 0) * (item.quantity || 0)), 0) || 0;

    // Loading state
    if (isLoading || labTestsLoading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            View Appointment Bill
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Loading bill details...</span>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // No bill found state
    if (billNotFound || !bill) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Receipt className="h-5 w-5" />
                            No Bill Found
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center py-12">
                        <Receipt className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 mb-2">No Bill Found</h3>
                        <p className="text-gray-500 text-center mb-6">
                            No bill has been created for this appointment yet.
                        </p>
                        {pendingLabTests.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full max-w-md">
                                <p className="text-blue-800 text-sm text-center">
                                    <FlaskConical className="h-4 w-4 inline mr-1" />
                                    {pendingLabTests.length} pending lab test{pendingLabTests.length !== 1 ? 's' : ''} available
                                </p>
                            </div>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="mt-4"
                        >
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Add bill item mutation
    const addBillItemMutation = useMutation({
        mutationFn: async ({ billId, itemData }: { billId: string; itemData: any }) => {
            return await billingApi.addBillItem(billId, itemData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointment-bill', appointmentId] });
            toast.success('Lab test added to bill successfully');
        },
        onError: (error: any) => {
            console.error('Error adding bill item:', error);
            toast.error(error.response?.data?.message || 'Failed to add lab test to bill');
        },
    });

    // Process payment mutation
    const processPaymentMutation = useMutation({
        mutationFn: async (paymentData: PaymentCreateData) => {
            return await paymentApi.processPayment(paymentData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointment-bill', appointmentId] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            toast.success('Payment processed successfully');
            setShowPaymentDialog(false);
            setProcessingPayment(false);
            resetPaymentForm();
            fetchBill();
            ifpayment();
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
            default:
                return 'bg-blue-100 text-blue-800';
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

    useEffect(() => {
        if (labTests) {
            const pending = labTests.filter((labTest: any) =>
                labTest.status === LabTestStatus.PENDING
            );
            setPendingLabTests(pending);
        }
    }, [labTests]);

    const handleDiscountChange = (labTestId: string, type: 'percentage' | 'custom', value: number) => {
        setLabTestDiscounts(prev => ({
            ...prev,
            [labTestId]: { type, value }
        }));
    };

    const calculateFinalPrice = (labTest: PendingLabTest) => {
        const discount = labTestDiscounts[labTest.id];
        if (!discount) return labTest.labTest.charge;

        if (discount.type === 'percentage') {
            const discountAmount = (labTest.labTest.charge * discount.value) / 100;
            return labTest.labTest.charge - discountAmount;
        } else {
            return labTest.labTest.charge - discount.value;
        }
    };

    const calculateDiscountAmount = (labTest: PendingLabTest) => {
        const discount = labTestDiscounts[labTest.id];
        if (!discount) return 0;

        if (discount.type === 'percentage') {
            return (labTest.labTest.charge * discount.value) / 100;
        } else {
            return discount.value;
        }
    };

    const handleAddToBill = async (labTest: PendingLabTest) => {
        if (!bill?.id) {
            toast.error('No bill found');
            return;
        }
        const finalPrice = calculateFinalPrice(labTest);
        const basePrice = labTest.labTest.charge;
        const discountAmount = calculateDiscountAmount(labTest);

        if (discountAmount > basePrice) {
            toast.error('Discount amount cannot be greater than the base price');
            return;
        }

        try {
            await addBillItemMutation.mutateAsync({
                billId: bill.id,
                itemData: {
                    itemType: BillType.LAB_TEST,
                    description: labTest.labTest.name,
                    quantity: 1,
                    unitPrice: labTest.labTest.charge,
                    discountAmount: discountAmount,
                    notes: `Lab test: ${labTest.labTest.name}`,
                    labTestId: labTest.id
                }
            });

            // Remove from pending list

            await labApi.updateLabTestOrder(labTest.id, {
                status: LabTestStatus.PROCESSING
            });

            setPendingLabTests(prev => prev.filter(test => test.id !== labTest.id));
            // Clear discount for this test
            setLabTestDiscounts(prev => {
                const newDiscounts = { ...prev };
                delete newDiscounts[labTest.id];
                return newDiscounts;
            });

            fetchBill(); // Refresh bill data
            refetchLabTests(); // Refresh lab tests data
        } catch (error) {
            console.error('Error adding lab test to bill:', error);
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

    // Payment method options
    const paymentMethods = [
        { value: PaymentMethod.CASH, label: 'Cash', icon: Wallet },
        { value: PaymentMethod.CARD, label: 'Card', icon: CreditCard },
        { value: PaymentMethod.UPI, label: 'UPI', icon: CreditCard },
        { value: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer', icon: CreditCard },
        { value: PaymentMethod.CHEQUE, label: 'Cheque', icon: CreditCard },
    ];

    if (isLoading || labTestsLoading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            View Appointment Bill
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Loading bill details...</span>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (isLoading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            View Appointment Bill
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No bill created for this appointment</p>
                        </div>
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
                            Bill Details
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Bill Header */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-800">{bill?.billNumber}</h3>
                                    <p className="text-sm text-gray-600">Generated on {formatDate(bill?.billDate)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(bill?.status)}`}>
                                        {bill?.status}
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

                            {/* Patient and Hospital Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {bill?.patient && (
                                    <div className="flex items-center gap-3">
                                        <User className="h-4 w-4 text-gray-500" />
                                        <div>
                                            <div className="font-medium">{bill?.patient.name}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pending Lab Tests Section */}
                        {pendingLabTests.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        Pending Lab Tests
                                    </h4>
                                    <span className="text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                                        {pendingLabTests.length} test{pendingLabTests.length !== 1 ? 's' : ''} pending
                                    </span>
                                </div>

                                <div className="bg-yellow-50  rounded-lg">
                                    <div className="">
                                        {pendingLabTests.map((labTest) => {
                                            const finalPrice = calculateFinalPrice(labTest);
                                            const discountAmount = calculateDiscountAmount(labTest);
                                            const currentDiscount = labTestDiscounts[labTest.id];

                                            return (
                                                <div key={labTest.id} className="bg-white p-4 rounded border">
                                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
                                                        {/* Lab Test Info */}
                                                        <div className="flex items-center gap-3">
                                                            <div>
                                                                <div className="font-medium">{labTest.labTest.name}</div>
                                                                <div className="text-sm text-gray-500">
                                                                    Base Price: ₹{labTest.labTest.charge.toFixed(2)}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Discount Controls */}
                                                        <div className="space-y-2">
                                                            <div className="text-sm font-medium text-gray-700">Discount</div>
                                                            <div className="flex gap-6 mb-2">
                                                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                                                    <input
                                                                        type="radio"
                                                                        checked={currentDiscount?.type !== 'custom'}
                                                                        onChange={() => handleDiscountChange(labTest.id, 'percentage', currentDiscount?.type === 'percentage' ? currentDiscount.value : 0)}
                                                                        className="accent-blue-600"
                                                                        disabled={addBillItemMutation.isPending}
                                                                    />
                                                                    Percentage (%)
                                                                </label>
                                                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                                                    <input
                                                                        type="radio"
                                                                        checked={currentDiscount?.type === 'custom'}
                                                                        onChange={() => handleDiscountChange(labTest.id, 'custom', currentDiscount?.type === 'custom' ? currentDiscount.value : 0)}
                                                                        className="accent-blue-600"
                                                                        disabled={addBillItemMutation.isPending}
                                                                    />
                                                                    Custom Amount
                                                                </label>
                                                            </div>
                                                            {currentDiscount?.type === 'custom' ? (
                                                                <div>
                                                                    <label className="block text-xs text-gray-500 mb-1" htmlFor={`labtest-custom-discount-${labTest.id}`}>Custom Discount Amount</label>
                                                                    <Input
                                                                        id={`labtest-custom-discount-${labTest.id}`}
                                                                        type="number"
                                                                        placeholder={`Max: ₹${labTest.labTest.charge}`}
                                                                        min="0"
                                                                        max={labTest.labTest.charge}
                                                                        value={currentDiscount?.type === 'custom' ? currentDiscount.value : ''}
                                                                        onChange={e => handleDiscountChange(labTest.id, 'custom', Number(e.target.value))}
                                                                        className={`text-xs h-8 border-gray-300 rounded-md ${(currentDiscount?.type === 'custom' && (currentDiscount.value < 0 || currentDiscount.value > labTest.labTest.charge)) ? 'border-red-500' : ''}`}
                                                                        disabled={addBillItemMutation.isPending}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <label className="block text-xs text-gray-500 mb-1" htmlFor={`labtest-discount-percentage-${labTest.id}`}>Discount Percentage</label>
                                                                    <Input
                                                                        id={`labtest-discount-percentage-${labTest.id}`}
                                                                        type="number"
                                                                        placeholder="e.g. 10"
                                                                        min="0"
                                                                        max="100"
                                                                        value={currentDiscount?.type === 'percentage' ? currentDiscount.value : ''}
                                                                        onChange={e => handleDiscountChange(labTest.id, 'percentage', Number(e.target.value))}
                                                                        className={`text-xs h-8 border-gray-300 rounded-md ${(currentDiscount?.type === 'percentage' && (currentDiscount.value < 0 || currentDiscount.value > 100)) ? 'border-red-500' : ''}`}
                                                                        disabled={addBillItemMutation.isPending}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Price Summary and Action */}
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-right">
                                                                <div className="text-sm font-medium">₹{finalPrice.toFixed(2)}</div>
                                                                {discountAmount > 0 && (
                                                                    <div className="text-xs text-green-600">
                                                                        -₹{discountAmount.toFixed(2)} discount
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleAddToBill(labTest)}
                                                                className="bg-blue-600 hover:bg-blue-700"
                                                                disabled={addBillItemMutation.isPending}
                                                            >
                                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                                Add to Bill
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Bill Items */}
                        {bill.billItems && bill.billItems.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-700">Bill Items</h4>
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
                                                    <td className="px-4 py-3 text-sm text-green-600 text-right">-₹{item.discountAmount.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">₹{(item.totalPrice).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Payment Summary */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-blue-800 mb-3">Payment Summary</h4>
                            <div className="flex items-center gap-3 text-l mb-2">
                                {/* Final Price */}
                                <span className="font-bold text-xl text-black">
                                    ₹{bill?.totalAmount.toFixed(2)}
                                </span>
                                {/* Original Price with strikethrough, only if discount applied */}
                                {totalDiscount > 0 && (
                                    <span className="line-through text-gray-400 text-base">
                                        ₹{totalAmountWithoutDiscount.toFixed(2)}
                                    </span>
                                )}
                                {/* Discount Percentage */}
                                {totalDiscount > 0 && totalAmountWithoutDiscount > 0 && (
                                    <span className="text-green-600 font-semibold text-base">
                                        {Math.round((totalDiscount / totalAmountWithoutDiscount) * 100)}% off
                                    </span>
                                )}
                            </div>
                            <div className="mt-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Amount Paid:</span>
                                    <span className="font-medium text-green-600">₹{bill?.paidAmount.toFixed(2)}</span>
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
                                <h4 className="font-semibold text-gray-700">Payment History</h4>
                                <div className="space-y-3">
                                    {bill.payments.map((payment: any, index: number) => (
                                        <div key={index} className="bg-white border rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-medium">₹{payment.amount.toFixed(2)}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {(payment.paymentMethod.replace(/_/g, ' '))} • {formatDate(payment.paymentDate)}
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
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                            >
                                Close
                            </Button>
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
                                    <label className="text-sm font-medium">Amount to Pay</label>
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
                                <label className="text-sm font-medium">Payment Method</label>
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
                                <label className="text-sm font-medium">Notes (Optional)</label>
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
                                    disabled={processingPayment || amountPaid <= 0 || amountPaid > bill?.dueAmount}
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