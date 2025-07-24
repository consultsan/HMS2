import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, FlaskConical, IndianRupee, CreditCard, Wallet, CheckCircle, Clock } from "lucide-react";
import { toast } from 'sonner';
import { billingApi } from "@/api/billing";
import { paymentApi } from "@/api/payment";
import { labApi } from "@/api/lab";
import { BillCreateData, BillType, BillStatus, PaymentMethod, PaymentCreateData, LabTestStatus, LabOrderStatus, LabOrder } from "@/types/types";
import { useAuth } from "@/contexts/AuthContext";


interface CreateLabOrderBillProps {
    labOrder: LabOrder | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateLabOrderBill({
    labOrder,
    isOpen,
    onClose,
    onSuccess
}: CreateLabOrderBillProps) {
    const [discountPercentage, setDiscountPercentage] = useState<number>(0);
    const [customDiscountAmount, setCustomDiscountAmount] = useState<number>(0);
    const [discountType, setDiscountType] = useState<'percentage' | 'custom'>('percentage');
    const [amountPaid, setAmountPaid] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
    const [notes, setNotes] = useState<string>("");
    const [processingStep, setProcessingStep] = useState<'form' | 'processing' | 'complete'>('form');
    const [paymentOption, setPaymentOption] = useState<'none' | 'full' | 'partial'>('none');
    const queryClient = useQueryClient();
    const { user } = useAuth();


    // Calculate base price from all lab tests
    const basePrice = labOrder?.appointmentLabTests?.reduce((total, test) => total + test.labTest.charge, 0) || 0;

    const changeStatus = async () => {
        if (!labOrder?.appointmentLabTests) {
            console.error('No lab tests found to update status');
            return;
        }

        try {
            //first update status of lab order to PROCESSING
            await labApi.updateLabOrder(labOrder.id, { status: LabOrderStatus.PROCESSING });
            // Update status for all appointment lab tests from PENDING to PROCESSING
            const updatePromises = labOrder.appointmentLabTests.map(async (test) => {
                if (test.status === LabTestStatus.PENDING) {
                    return await labApi.updateLabTestOrder(test.id, { status: LabTestStatus.PROCESSING });
                }
                return null;
            });

            await Promise.all(updatePromises);
            console.log('Successfully updated lab test statuses to PROCESSING');
        } catch (error) {
            console.error('Error updating lab test statuses:', error);
            toast.error('Failed to update lab test statuses');
        }
    };


    // Process payment mutation
    const processPaymentMutation = useMutation({
        mutationFn: async (paymentData: PaymentCreateData) => {
            return await paymentApi.processPayment(paymentData);
        },
        onError: (error: any) => {
            console.error('Error processing payment:', error);
            toast.error(error.response?.data?.message || 'Failed to process payment');
            setProcessingStep('form');
        },
    });

    // Create bill mutation
    const createBillMutation = useMutation({
        mutationFn: async (billData: BillCreateData) => {
            return await billingApi.createBill(billData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['external-lab-orders'] });
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            toast.success('Bill created and payment processed successfully');
            changeStatus();
            setProcessingStep('complete');
            onSuccess();
            onClose();
            resetForm();
        },
        onError: (error: any) => {
            console.error('Error creating bill:', error);
            toast.error(error.response?.data?.message || 'Failed to create bill');
            setProcessingStep('form');
        },
    });

    const resetForm = () => {
        setDiscountPercentage(0);
        setCustomDiscountAmount(0);
        setDiscountType('percentage');
        setAmountPaid(0);
        setPaymentMethod(PaymentMethod.CASH);
        setNotes("");
        setProcessingStep('form');
        setPaymentOption('none');
    };

    const handleViewBill = async () => {
        if (!labOrder?.billId) {
            // If no billId in labOrder, try to find the bill by lab order
            try {
                const response = await billingApi.getBillsByHospital({
                    // Add any relevant filters to find the bill for this lab order
                });

                // For now, open bills in a new tab or navigate
                console.log('Finding bill for lab order:', labOrder?.id);
                toast.info('Opening bill view...');

                // You can implement navigation to bill view page here
                // Example: navigate(`/bills/${billId}`)

            } catch (error) {
                console.error('Error finding bill:', error);
                toast.error('Could not find associated bill');
            }
        } else {
            // If billId exists, navigate directly
            console.log('Viewing bill:', labOrder.billId);
            toast.info('Opening bill view...');
            // Example: navigate(`/bills/${labOrder.billId}`)
        }
    };

    const handleSubmit = async () => {
        if (!labOrder) {
            toast.error('No lab order selected');
            return;
        }

        if (!labOrder.patient?.id) {
            toast.error('Missing patient details');
            return;
        }

        if (basePrice <= 0) {
            toast.error('Lab test charges must be greater than 0');
            return;
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (discountType === 'percentage' && discountPercentage > 0) {
            discountAmount = (basePrice * discountPercentage) / 100;
        } else if (discountType === 'custom' && customDiscountAmount > 0) {
            discountAmount = customDiscountAmount;
        }

        if (discountAmount > basePrice) {
            discountAmount = basePrice;
        }

        const totalAmount = basePrice - discountAmount;

        if (totalAmount <= 0) {
            toast.error('Total amount must be greater than 0');
            return;
        }

        if (amountPaid <= 0) {
            toast.error('Amount paid cannot be less than or equal to 0');
            return;
        }

        if (amountPaid > totalAmount) {
            toast.error('Amount paid cannot be greater than total amount');
            return;
        }

        setProcessingStep('processing');

        try {
            const hospitalId = user?.hospitalId || '';

            const billData: BillCreateData = {
                patientId: labOrder.patient.id,
                hospitalId: hospitalId,
                appointmentId: undefined,
                paidAmount: 0,
                dueAmount: Number(totalAmount),
                status: BillStatus.DRAFT,
                billDate: new Date(),
                dueDate: new Date(),
                items: labOrder.appointmentLabTests.map(test => ({
                    itemType: BillType.LAB_TEST,
                    description: `Lab Test - ${test.labTest.name} (${test.labTest.code})`,
                    quantity: 1,
                    unitPrice: Number(test.labTest.charge),
                    totalPrice: Number(test.labTest.charge),
                    discountAmount: Number((test.labTest.charge / basePrice) * discountAmount),
                    labTestId: test.id,
                    notes: notes || undefined,
                })),
                notes: notes || undefined,
            };

            console.log("billData", billData);

            const billResponse = await createBillMutation.mutateAsync(billData);
            const billId = billResponse.data?.data?.id;

            if (!billId) {
                throw new Error('Failed to create bill');
            }

            // Update lab order with billId
            try {
                console.log('Updating lab order with billId:', billId);
                await labApi.updateLabOrder(labOrder.id, { billId: billId });
                console.log('Successfully updated lab order with billId');
            } catch (updateError) {
                console.error('Failed to update lab order with billId:', updateError);
                // Don't throw error here - bill creation was successful
                toast.error('Bill created successfully, but failed to link to lab order');
            }

            if (amountPaid > 0) {
                const paymentData: PaymentCreateData = {
                    billId: billId,
                    amount: amountPaid,
                    paymentMethod: paymentMethod,
                    notes: notes || undefined,
                };

                await processPaymentMutation.mutateAsync(paymentData);
            }

            // Update lab test statuses to PROCESSING after successful bill creation
            await changeStatus();
            console.log("Bill id after status update is ", billId);


        } catch (error) {
            console.error('Error in bill creation process:', error);
            toast.error('Failed to complete the billing process');
            setProcessingStep('form');
        }
    };

    const isLoading = createBillMutation.isPending || processPaymentMutation.isPending;

    // Calculate values
    const discountAmount = discountType === 'percentage' && discountPercentage > 0
        ? (basePrice * discountPercentage) / 100
        : discountType === 'custom' && customDiscountAmount > 0
            ? customDiscountAmount
            : 0;
    const totalAmount = basePrice - discountAmount;
    const amountDue = totalAmount - amountPaid;

    // Payment method options
    const paymentMethods = [
        { value: PaymentMethod.CASH, label: 'Cash', icon: Wallet },
        { value: PaymentMethod.CARD, label: 'Card', icon: CreditCard },
        { value: PaymentMethod.UPI, label: 'UPI', icon: CreditCard },
        { value: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer', icon: CreditCard },
        { value: PaymentMethod.CHEQUE, label: 'Cheque', icon: CreditCard },
    ];

    // Early return after all hooks are declared
    if (!labOrder || !isOpen) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-medium">
                            {labOrder?.status === LabOrderStatus.PROCESSING ? 'Lab Bill - View' : 'Create Lab Bill'}
                        </DialogTitle>
                        {labOrder?.status && (
                            <div className="flex items-center gap-2">
                                {labOrder.status === LabOrderStatus.PENDING && (
                                    <>
                                        <Clock className="h-4 w-4 text-yellow-500" />
                                        <span className="text-sm px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium">
                                            Pending
                                        </span>
                                    </>
                                )}
                                {labOrder.status === LabOrderStatus.PROCESSING && (
                                    <>
                                        <CheckCircle className="h-4 w-4 text-blue-500" />
                                        <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                                            Processing
                                        </span>
                                    </>
                                )}
                                {labOrder.status === LabOrderStatus.COMPLETED && (
                                    <>
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                                            Completed
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span className="text-sm text-gray-600">
                            {processingStep === 'processing' ? 'Processing...' : 'Loading...'}
                        </span>
                    </div>
                ) : processingStep === 'complete' ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                            <IndianRupee className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-base font-medium text-gray-900 mb-1">Success!</h3>
                        <p className="text-sm text-gray-500 text-center">
                            Lab bill created and payment processed.
                        </p>
                    </div>
                ) : labOrder?.status === LabOrderStatus.PROCESSING ? (
                    <div className="space-y-6">
                        {/* Patient & Lab Tests Info - Read Only */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <User className="h-4 w-4 text-gray-400" />
                                    <div>
                                        <div className="font-medium text-sm">{labOrder.patient.name}</div>
                                        <div className="text-xs text-gray-500">ID: {labOrder.patient.patientUniqueId}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <FlaskConical className="h-4 w-4 text-gray-400" />
                                    <div className="text-right">
                                        <div className="font-medium text-sm">{labOrder.appointmentLabTests.length} Tests</div>
                                        <div className="text-xs text-gray-500">Lab Order</div>
                                    </div>
                                </div>
                            </div>

                            {/* Lab Tests List - Read Only */}
                            <div className="bg-white border rounded-lg p-4">
                                <h4 className="font-medium text-sm mb-2">Lab Tests:</h4>
                                <div className="space-y-2">
                                    {labOrder.appointmentLabTests.map((test) => (
                                        <div key={test.id} className="flex justify-between items-center text-sm">
                                            <div>
                                                <span className="font-medium">{test.labTest.name}</span>
                                                <span className="text-gray-500 ml-2">({test.labTest.code})</span>
                                            </div>
                                            <span className="font-medium">₹{test.labTest.charge}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Status Message */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-blue-600" />
                                <div>
                                    <h3 className="font-medium text-blue-900">Lab Order is Processing</h3>
                                    <p className="text-sm text-blue-700 mt-1">
                                        Bill has been generated and the lab tests are currently being processed.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions for Processing Status */}
                        <div className="flex gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                            >
                                Close
                            </Button>
                            <Button
                                type="button"
                                onClick={handleViewBill}
                                className="flex-1"
                                variant="default"
                            >
                                View Bill
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
                        {/* Patient & Lab Tests Info */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <User className="h-4 w-4 text-gray-400" />
                                    <div>
                                        <div className="font-medium text-sm">{labOrder.patient.name}</div>
                                        <div className="text-xs text-gray-500">ID: {labOrder.patient.patientUniqueId}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <FlaskConical className="h-4 w-4 text-gray-400" />
                                    <div className="text-right">
                                        <div className="font-medium text-sm">{labOrder.appointmentLabTests.length} Tests</div>
                                        <div className="text-xs text-gray-500">Lab Order</div>
                                    </div>
                                </div>
                            </div>

                            {/* Lab Tests List */}
                            <div className="bg-white border rounded-lg p-4">
                                <h4 className="font-medium text-sm mb-2">Lab Tests:</h4>
                                <div className="space-y-2">
                                    {labOrder.appointmentLabTests.map((test) => (
                                        <div key={test.id} className="flex justify-between items-center text-sm">
                                            <div>
                                                <span className="font-medium">{test.labTest.name}</span>
                                                <span className="text-gray-500 ml-2">({test.labTest.code})</span>
                                            </div>
                                            <span className="font-medium">₹{test.labTest.charge}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Discount Section */}
                        <div className="bg-white border rounded-xl shadow-sm p-6 mb-6">
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Apply Discount</h3>
                                <div className="flex gap-6 mb-4">
                                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={discountType === 'percentage'}
                                            onChange={() => setDiscountType('percentage')}
                                            className="accent-blue-600"
                                        />
                                        Percentage (%)
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={discountType === 'custom'}
                                            onChange={() => setDiscountType('custom')}
                                            className="accent-blue-600"
                                        />
                                        Custom Amount
                                    </label>
                                </div>
                                {discountType === 'percentage' ? (
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1" htmlFor="discount-percentage">
                                            Discount Percentage
                                        </label>
                                        <Input
                                            id="discount-percentage"
                                            type="number"
                                            placeholder="e.g. 10"
                                            min="0"
                                            max="100"
                                            value={discountPercentage}
                                            onChange={e => setDiscountPercentage(Number(e.target.value))}
                                            className={`text-sm h-9 border-gray-300 rounded-md ${discountPercentage < 0 || discountPercentage > 100 ? 'border-red-500' : ''}`}
                                            disabled={createBillMutation.isPending}
                                        />
                                        <span className="text-xs text-gray-400">Enter a value between 0 and 100</span>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1" htmlFor="custom-discount">
                                            Custom Discount Amount
                                        </label>
                                        <Input
                                            id="custom-discount"
                                            type="number"
                                            placeholder={`Max: ₹${basePrice}`}
                                            min="0"
                                            max={basePrice}
                                            value={customDiscountAmount}
                                            onChange={e => setCustomDiscountAmount(Number(e.target.value))}
                                            className={`text-sm h-9 border-gray-300 rounded-md ${customDiscountAmount < 0 || customDiscountAmount > basePrice ? 'border-red-500' : ''}`}
                                            disabled={createBillMutation.isPending}
                                        />
                                        <span className="text-xs text-gray-400">Enter a value up to the total fee</span>
                                    </div>
                                )}
                            </div>

                            {/* Price Summary */}
                            <div className="bg-gray-50 rounded-lg p-4 mt-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Base Price</span>
                                    <span>₹{basePrice.toFixed(2)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600 mb-1">
                                        <span>Discount</span>
                                        <span>-₹{discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold mt-2">
                                    <span>Total</span>
                                    <span>₹{totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="mb-6">
                            <Label className="text-sm font-medium mb-2 block">Payment Method</Label>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {paymentMethods.map((method) => {
                                    const IconComponent = method.icon;
                                    const isSelected = paymentMethod === method.value;
                                    return (
                                        <button
                                            key={method.value}
                                            type="button"
                                            onClick={() => setPaymentMethod(method.value)}
                                            disabled={createBillMutation.isPending}
                                            className={`group flex flex-col items-center justify-center border rounded-lg p-3 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
                                                ${isSelected ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-300' : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-400'}
                                                ${createBillMutation.isPending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            <span className={`flex items-center justify-center w-8 h-8 rounded-full mb-2 transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-blue-600 group-hover:bg-blue-100'}`}>
                                                <IconComponent className="h-6 w-6" />
                                            </span>
                                            <span className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>{method.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Payment Details */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Payment Details</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center gap-6 mb-2">
                                        <div>
                                            <Label className="text-xs text-gray-500">Total</Label>
                                            <div className="text-lg font-semibold">₹{totalAmount.toFixed(2)}</div>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">Due</Label>
                                            <div className={`text-lg font-semibold ${amountDue > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{amountDue.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant={paymentOption === 'full' ? 'default' : 'outline'}
                                                className="flex-1"
                                                onClick={() => {
                                                    setPaymentOption('full');
                                                    setAmountPaid(totalAmount);
                                                }}
                                                disabled={createBillMutation.isPending}
                                            >
                                                Pay Full Amount
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={paymentOption === 'partial' ? 'default' : 'outline'}
                                                className="flex-1"
                                                onClick={() => {
                                                    setPaymentOption('partial');
                                                    setAmountPaid(0);
                                                }}
                                                disabled={createBillMutation.isPending}
                                            >
                                                Pay Partial Amount
                                            </Button>
                                        </div>
                                        {paymentOption === 'partial' && (
                                            <Input
                                                type="number"
                                                value={amountPaid}
                                                onChange={(e) => setAmountPaid(Number(e.target.value))}
                                                placeholder="Enter partial amount"
                                                min="0"
                                                max={totalAmount}
                                                step="0.01"
                                                disabled={createBillMutation.isPending}
                                                className="h-8 text-sm"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Notes (Optional)</Label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Additional notes..."
                                className="w-full h-20 p-2 text-sm border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                                disabled={createBillMutation.isPending}
                            />
                        </div>

                        {/* Summary */}
                        <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Lab Tests Total:</span>
                                <span>₹{basePrice.toFixed(2)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Discount:</span>
                                    <span>-₹{discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="border-t pt-2 flex justify-between font-semibold">
                                <span>Total:</span>
                                <span>₹{totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={createBillMutation.isPending}
                                className="flex-1"
                            >
                                Cancel
                            </Button>

                            {/* Submit button for PENDING status only */}
                            <Button
                                type="submit"
                                disabled={!basePrice || basePrice <= 0 || createBillMutation.isPending || paymentOption === 'none' || amountPaid <= 0 || amountPaid > totalAmount}
                                className="flex-1"
                            >
                                {createBillMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing
                                    </>
                                ) : (
                                    'Generate Bill'
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
} 