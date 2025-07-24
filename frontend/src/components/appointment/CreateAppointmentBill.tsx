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
import { Label } from "@/components/ui/label";
import { Loader2, User, Stethoscope, IndianRupee, CreditCard, Wallet } from "lucide-react";
import { toast } from 'sonner';
import { hospitalAdminApi } from "@/api/hospitalAdmin";
import { billingApi } from "@/api/billing";
import { appointmentApi } from "@/api/appointment";
import { paymentApi } from "@/api/payment";
import { HospitalStaff, Appointment, BillCreateData, BillType, BillStatus, AppointmentStatus, PaymentMethod, PaymentCreateData } from "@/types/types";

interface CreateAppointmentBillProps {
    appointmentId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateAppointmentBill({
    appointmentId,
    isOpen,
    onClose,
    onSuccess
}: CreateAppointmentBillProps) {
    console.log("appointmentId", appointmentId);
    if (appointmentId === "" || !isOpen || !appointmentId) return;
    const [opdCharge, setOpdCharge] = useState<number>(0);
    const [discountPercentage, setDiscountPercentage] = useState<number>(0);
    const [customDiscountAmount, setCustomDiscountAmount] = useState<number>(0);
    const [discountType, setDiscountType] = useState<'percentage' | 'custom'>('percentage');
    const [amountPaid, setAmountPaid] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
    const [notes, setNotes] = useState<string>("");
    const [processingStep, setProcessingStep] = useState<'form' | 'processing' | 'complete'>('form');
    const [paymentOption, setPaymentOption] = useState<'none' | 'full' | 'partial'>('none');
    const queryClient = useQueryClient();

    // Fetch appointment details
    const { data: appointment, isLoading: appointmentLoading } = useQuery<Appointment>({
        queryKey: ["appointment", appointmentId],
        queryFn: async () => {
            const response = await appointmentApi.getAppointmentById(appointmentId);
            return response.data?.data;
        },
        enabled: !!appointmentId && isOpen,
    });

    // Fetch doctor details using getStaffById
    const { data: doctor, isLoading: doctorLoading } = useQuery<HospitalStaff>({
        queryKey: ["doctor", appointment?.doctorId],
        queryFn: async () => {
            if (!appointment?.doctorId) throw new Error("No doctor ID");
            return await hospitalAdminApi.getStaffById(appointment.doctorId);
        },
        enabled: !!appointment?.doctorId && isOpen,
    });

    // Set OPD charge when doctor data is loaded
    useEffect(() => {
        if (doctor?.opdCharge?.amount) {
            setOpdCharge(doctor.opdCharge.amount);
        }
    }, [doctor]);

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
            return await billingApi.generateAppointmentBill(appointmentId, billData);
        },
        onSuccess: () => {
            // Invalidate all appointment queries to refresh the queue management
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            queryClient.invalidateQueries({ queryKey: ['doctors'] });
            toast.success('Bill created and payment processed successfully');
            setProcessingStep('complete');
            onClose();
            resetForm();
        },
        onError: (error: any) => {
            console.error('Error creating bill:', error);
            toast.error(error.response?.data?.message || 'Failed to create bill');
            setProcessingStep('form');
        },
    });

    const updateAppointmentStatusMutation = useMutation({
        mutationFn: async (appointmentId: string) => {
            return await appointmentApi.updateAppointmentStatus(appointmentId, AppointmentStatus.CONFIRMED);
        },
        onSuccess: () => {
            // Invalidate appointment queries to refresh the queue management
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success('Appointment status updated successfully');
        },
        onError: (error: any) => {
            console.error('Error updating appointment status:', error);
            toast.error(error.response?.data?.message || 'Failed to update appointment status');
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
        setPaymentOption('none'); // Reset payment option
        setOpdCharge(0);
    };

    const handleSubmit = async () => {

        if (!appointment?.patientId || !appointment?.hospitalId) {
            toast.error('Missing appointment details');
            return;
        }

        if (opdCharge <= 0) {
            toast.error('OPD charge must be greater than 0');
            return;
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (discountType === 'percentage' && discountPercentage > 0) {
            discountAmount = (opdCharge * discountPercentage) / 100;
        } else if (discountType === 'custom' && customDiscountAmount > 0) {
            discountAmount = customDiscountAmount;
        }

        if (discountAmount > opdCharge) {
            discountAmount = opdCharge;
        }

        const totalAmount = opdCharge - discountAmount;

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
            const billData: BillCreateData = {
                patientId: appointment.patientId,
                hospitalId: appointment.hospitalId,
                appointmentId: appointmentId,
                paidAmount: 0,
                dueAmount: Number(totalAmount),
                status: BillStatus.DRAFT,
                billDate: new Date(),
                dueDate: new Date(),
                items: [
                    {
                        itemType: BillType.OPD_CONSULTATION,
                        description: `OPD Consultation - ${doctor?.name} (${doctor?.specialisation})`,
                        quantity: 1,
                        unitPrice: Number(opdCharge),
                        totalPrice: Number(opdCharge),
                        discountAmount: Number(discountAmount),
                        notes: notes || undefined,
                    }
                ],
                notes: notes || undefined,
            };

            const billResponse = await createBillMutation.mutateAsync(billData);
            const billId = billResponse.data?.data?.id;

            if (!billId) {
                throw new Error('Failed to create bill');
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

            updateAppointmentStatusMutation.mutate(appointmentId);
            onSuccess();

        } catch (error) {
            console.error('Error in bill creation process:', error);
            toast.error('Failed to complete the billing process');
            setProcessingStep('form');
        }
    };

    const isLoading = appointmentLoading || doctorLoading || createBillMutation.isPending || processPaymentMutation.isPending;

    // Calculate values
    const discountAmount = discountType === 'percentage' && discountPercentage > 0
        ? (opdCharge * discountPercentage) / 100
        : discountType === 'custom' && customDiscountAmount > 0
            ? customDiscountAmount
            : 0;
    const totalAmount = opdCharge - discountAmount;
    const amountDue = totalAmount - amountPaid;

    // Payment method options
    const paymentMethods = [
        { value: PaymentMethod.CASH, label: 'Cash', icon: Wallet },
        { value: PaymentMethod.CARD, label: 'Card', icon: CreditCard },
        { value: PaymentMethod.UPI, label: 'UPI', icon: CreditCard },
        { value: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer', icon: CreditCard },
        { value: PaymentMethod.CHEQUE, label: 'Cheque', icon: CreditCard },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-medium">
                        Create Bill
                    </DialogTitle>
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
                            Bill created and payment processed.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Appointment Info */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <User className="h-4 w-4 text-gray-400" />
                                <div>
                                    <div className="font-medium text-sm">{appointment?.patient?.name}</div>
                                    <div className="text-xs text-gray-500">Patient</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Stethoscope className="h-4 w-4 text-gray-400" />
                                <div className="text-right">
                                    <div className="font-medium text-sm">{doctor?.name}</div>
                                    <div className="text-xs text-gray-500">{doctor?.specialisation}</div>
                                </div>
                            </div>
                        </div>

                        {/* OPD Charge & Discount Section */}
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
                                            placeholder={`Max: ₹${opdCharge}`}
                                            min="0"
                                            max={opdCharge}
                                            value={customDiscountAmount}
                                            onChange={e => setCustomDiscountAmount(Number(e.target.value))}
                                            className={`text-sm h-9 border-gray-300 rounded-md ${customDiscountAmount < 0 || customDiscountAmount > opdCharge ? 'border-red-500' : ''}`}
                                            disabled={createBillMutation.isPending}
                                        />
                                        <span className="text-xs text-gray-400">Enter a value up to the OPD fee</span>
                                    </div>
                                )}
                            </div>

                            {/* Price Summary */}
                            <div className="bg-gray-50 rounded-lg p-4 mt-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Base Price</span>
                                    <span>₹{opdCharge.toFixed(2)}</span>
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

                        {/* Amount Details */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Payment Details</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Paid & Buttons */}
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
                                <span>OPD Charge:</span>
                                <span>₹{opdCharge.toFixed(2)}</span>
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
                            <Button
                                type="submit"
                                disabled={!opdCharge || opdCharge <= 0 || createBillMutation.isPending || paymentOption === 'none' || amountPaid <= 0 || amountPaid > totalAmount}
                                className="flex-1"
                            >
                                {createBillMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing
                                    </>
                                ) : (
                                    'Create Bill'
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
