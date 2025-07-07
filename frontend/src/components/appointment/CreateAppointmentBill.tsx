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
import { Loader2, User, Stethoscope, DollarSign, CreditCard, Wallet } from "lucide-react";
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
}

export default function CreateAppointmentBill({
    appointmentId,
    isOpen,
    onClose
}: CreateAppointmentBillProps) {
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
            setTimeout(() => {
                onClose();
                resetForm();
            }, 2000);
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
        setTimeout(() => {
            setOpdCharge(0);
        }, 100);
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
                            <DollarSign className="h-6 w-6 text-green-600" />
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
                        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                            <div className="font-semibold text-gray-700 mb-1">OPD Consultation</div>
                            {/* Price Summary */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
                                {/* Lab Test Info */}
                                <div className="flex items-center gap-3">
                                    <div>
                                        <div className="font-medium">{'Opd fee'}</div>
                                        <div className="text-sm text-gray-500">
                                            Base Price: ₹{opdCharge.toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                {/* Discount Controls */}
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-gray-700">Discount</div>
                                    <div className="flex gap-1 flex-wrap">
                                        <Button
                                            type="button"
                                            variant={discountType === 'percentage' && discountPercentage === 50 ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setDiscountPercentage(50)}
                                            disabled={createBillMutation.isPending}
                                            className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            50%
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={discountType === 'percentage' && discountPercentage === 25 ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setDiscountPercentage(25)}
                                            disabled={createBillMutation.isPending}
                                            className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            25%
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={discountType === 'percentage' && discountPercentage === 15 ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setDiscountPercentage(15)}
                                            disabled={createBillMutation.isPending}
                                            className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white"
                                        >
                                            15%
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setDiscountPercentage(0)}
                                            disabled={createBillMutation.isPending}
                                            className="text-xs px-2 py-1"
                                        >
                                            No
                                        </Button>
                                    </div>
                                    <Input
                                        type="number"
                                        placeholder="Custom amount"
                                        min="0"
                                        max={opdCharge}
                                        step="0.01"
                                        value={customDiscountAmount}
                                        onChange={(e) => setCustomDiscountAmount(Number(e.target.value))}
                                        className="text-xs h-8"
                                        disabled={createBillMutation.isPending}
                                    />
                                </div>

                                {/* Price Summary and Action */}
                                <div className="flex items-center justify-between">
                                    <div className="text-right">
                                        <div className="text-sm font-medium">₹{totalAmount.toFixed(2)}</div>
                                        {discountAmount > 0 && (
                                            <div className="text-xs text-green-600">
                                                -₹{discountAmount.toFixed(2)} discount
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Payment Method</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {paymentMethods.slice(0, 3).map((method) => {
                                    const IconComponent = method.icon;
                                    return (
                                        <Button
                                            key={method.value}
                                            type="button"
                                            variant={paymentMethod === method.value ? 'default' : 'outline'}
                                            className="h-10 flex flex-col items-center gap-1"
                                            onClick={() => setPaymentMethod(method.value)}
                                            disabled={createBillMutation.isPending}
                                        >
                                            <IconComponent className="h-3 w-3" />
                                            <span className="text-xs">{method.label}</span>
                                        </Button>
                                    );
                                })}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {paymentMethods.slice(3).map((method) => {
                                    const IconComponent = method.icon;
                                    return (
                                        <Button
                                            key={method.value}
                                            type="button"
                                            variant={paymentMethod === method.value ? 'default' : 'outline'}
                                            className="h-10 flex flex-col items-center gap-1"
                                            onClick={() => setPaymentMethod(method.value)}
                                            disabled={createBillMutation.isPending}
                                        >
                                            <IconComponent className="h-3 w-3" />
                                            <span className="text-xs">{method.label}</span>
                                        </Button>
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
