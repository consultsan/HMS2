import { labApi } from "@/api/lab";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateAge } from "@/utils/dateUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Eye, Search } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import TestParameters from "../lab/TestParamters";
import { api } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { useSearch } from "@/contexts/SearchContext";
import { LabTestStatus } from "@/types/types";
import ViewTestResult from "../lab/ViewTestResult";
import { billingApi } from "@/api/billing";
import { paymentApi } from "@/api/payment";
import { BillType, BillStatus, PaymentMethod, PaymentCreateData } from "@/types/types";

interface Patient {
    id: string;
    name: string;
    patientUniqueId: string;
    phone: string;
}

export default function CreateLabTestAppointment() {
    const queryClient = useQueryClient();
    const [searchQueryPatient, setSearchQueryPatient] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<string>('');
    const [selectedTest, setSelectedTest] = useState<string>('');
    const [patientSearchQuery, setPatientSearchQuery] = useState('');
    const { searchQuery } = useSearch();
    const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
    const [finalizePatient, setFinalizePatient] = useState<any>(null);
    const [finalizeTest, setFinalizeTest] = useState<any>(null);
    const [discountType, setDiscountType] = useState<'percentage' | 'custom'>('percentage');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [amountPaid, setAmountPaid] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
    const [paymentOption, setPaymentOption] = useState<'full' | 'partial'>('full');
    const [processing, setProcessing] = useState(false);


    // Fetch patients
    const { data: patients, isLoading } = useQuery<Patient[]>({
        queryKey: ['hospital-patients'],
        queryFn: async () => {
            const response = await api.get('/api/patient');
            return response.data?.data;
        },
    });

    // Filter patients based on search query
    const filteredPatients = patients?.filter(patient =>
        patient.name.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
        patient.patientUniqueId?.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
        patient.phone?.includes(patientSearchQuery)
    ) ?? [];

    // Fetch lab tests
    const { data: labTests } = useQuery<any>({
        queryKey: ['lab-tests'],
        queryFn: async () => {
            const response = await labApi.getLabTests();
            return response.data?.data;
        },
    });

    // Fetch direct tests
    const { data: allTestAppointments } = useQuery<any>({
        queryKey: ['all-test-appointments'],
        queryFn: async () => {
            const response = await labApi.getOrderedTestsByHospital();
            return response.data?.data;
        },
    });


    // Order lab test mutation
    const orderLabTestMutation = useMutation({
        mutationFn: async () => {
            const response = await labApi.orderLabTest({
                referredFromOutside: true,
                patientId: selectedPatient,
                labTestId: selectedTest,
                status: LabTestStatus.PENDING
            });
            return response.data?.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-test-appointments'] });
            setSelectedPatient('');
            setSelectedTest('');
            toast.success('Lab test ordered successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to order lab test');
        },
    });


    // Filter direct tests based on search query
    const directTest = allTestAppointments?.filter((test: any) => {
        return test.patient;
    })

    const filteredDirectTests = directTest?.filter((test: any) => {
        if (!searchQueryPatient) return true;
        const patientName = test.patient?.name || '';
        const phone = test.patient?.phone || '';
        const testName = test.labTest?.name || '';
        const status = test.status || '';
        return (
            patientName.toLowerCase().includes(searchQueryPatient.toLowerCase()) ||
            testName.toLowerCase().includes(searchQueryPatient.toLowerCase()) ||
            phone.includes(searchQueryPatient) ||
            status.toLowerCase().includes(searchQueryPatient.toLowerCase())
        );
    });

    // Open finalize dialog instead of direct mutation
    const handleOrderTestClick = () => {
        const patient = patients?.find(p => p.id === selectedPatient);
        const test = labTests?.find((t: any) => t.id === selectedTest);
        if (!patient || !test) {
            toast.error('Select patient and test');
            return;
        }
        setFinalizePatient(patient);
        setFinalizeTest(test);
        setDiscountType('percentage');
        setDiscountValue(0);
        setAmountPaid(0);
        setPaymentOption('full');
        setPaymentMethod(PaymentMethod.CASH);
        setFinalizeDialogOpen(true);
    };

    // Calculate discount and totals
    const basePrice = finalizeTest ? finalizeTest.charge : 0;
    const discountAmount = discountType === 'percentage' ? (basePrice * discountValue) / 100 : discountValue;
    const totalAmount = Math.max(0, basePrice - discountAmount);
    const dueAmount = Math.max(0, totalAmount - amountPaid);

    // Bill and payment logic
    const handleFinalizeBill = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!finalizePatient || !finalizeTest) return;
        if (totalAmount <= 0) {
            toast.error('Total amount must be greater than 0');
            return;
        }
        if (amountPaid > totalAmount) {
            toast.error('Amount paid cannot be greater than total');
            return;
        }
        setProcessing(true);
        try {
            // 1. Order lab test (create AppointmentLabTest)
            const labTestOrder = await labApi.orderLabTest({
                referredFromOutside: true,
                patientId: selectedPatient,
                labTestId: selectedTest,
                status: LabTestStatus.PENDING
            });
            console.log("labTestOrder step 1", labTestOrder);

            const appointmentLabTestId = labTestOrder.data?.data?.id;

            if (!appointmentLabTestId) throw new Error('Failed to order lab test');
            // 2. Create bill for this lab test
            // You may need to fetch hospitalId if not available; here we use empty string as placeholder
            const billData = {
                patientId: selectedPatient,
                hospitalId: '', // Set this if you have hospitalId in context
                appointmentId: undefined,
                items: [{
                    itemType: BillType.LAB_TEST,
                    description: finalizeTest.name,
                    quantity: 1,
                    unitPrice: basePrice,
                    totalPrice: basePrice,
                    discountAmount: discountAmount,
                    labTestId: appointmentLabTestId
                }],
                paidAmount: 0,
                dueAmount: totalAmount,
                status: BillStatus.DRAFT,
                billDate: new Date(),
                dueDate: new Date(),
                notes: discountAmount > 0 ? `Discount: ₹${discountAmount.toFixed(2)}` : undefined
            };
            const billRes = await billingApi.createBill(billData);
            const billId = billRes.data?.data?.id;
            if (!billId) throw new Error('Failed to create bill');
            // 3. Process payment if any
            if (amountPaid > 0) {
                const paymentData: PaymentCreateData = {
                    billId,
                    amount: amountPaid,
                    paymentMethod,
                };
                await paymentApi.processPayment(paymentData);
            }
            toast.success('Lab test ordered and bill finalized!');
            setFinalizeDialogOpen(false);
            setSelectedPatient('');
            setSelectedTest('');
            setFinalizePatient(null);
            setFinalizeTest(null);
            setProcessing(false);
            queryClient.invalidateQueries({ queryKey: ['all-test-appointments'] });
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to complete billing');
            setProcessing(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-6">Create Lab Test Appointment</h1>

            {/* Order Test Form */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Order New Test</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-base font-semibold">Search Patient</Label>
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Search patients by name, ID or phone..."
                                    value={patientSearchQuery}
                                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            {patientSearchQuery && (
                                <div className="rounded-md border bg-white shadow-sm max-h-48 overflow-y-auto">
                                    {(filteredPatients ?? []).map((patient) => (
                                        <div
                                            key={patient.id}
                                            className="cursor-pointer p-2 hover:bg-gray-100 transition"
                                            onClick={() => {
                                                setSelectedPatient(patient.id);
                                                setPatientSearchQuery(""); // Clear the search bar
                                            }}
                                        >
                                            <div className="font-medium">{patient.name}</div>
                                            <div className="text-sm text-gray-500">
                                                ID: {patient.patientUniqueId} • Phone: {patient.phone}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {selectedPatient && (
                                <div className="text-sm text-green-700 mt-5 p-4 pl-0">
                                    {(() => {
                                        const selectedPatientData = patients?.find(p => p.id === selectedPatient);
                                        return selectedPatientData ? (
                                            <>Selected: <strong>{selectedPatientData.name}</strong> • <span className="text-gray-600">{selectedPatientData.phone}</span></>
                                        ) : null;
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Select Test</label>
                        <Select value={selectedTest} onValueChange={setSelectedTest}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a test" />
                            </SelectTrigger>
                            <SelectContent>
                                {labTests?.map((test: any) => (
                                    <SelectItem key={test.id} value={test.id}>

                                        {test.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="mt-4">
                    <Button
                        onClick={handleOrderTestClick}
                        disabled={!selectedPatient || !selectedTest}
                    >
                        Order Test
                    </Button>
                </div>
            </div>

            {/* Direct Tests Section */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Direct Tests</h2>
                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search by patient name, test name, or status..."
                            value={searchQueryPatient}
                            onChange={(e) => setSearchQueryPatient(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
                <Table numberOfRows={5}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Patient</TableHead>
                            <TableHead>Phone Number</TableHead>
                            <TableHead>Test</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredDirectTests?.map((test: any) => (
                            <TableRow key={test.id}>
                                <TableCell>{test.patient.name}</TableCell>
                                <TableCell>{test.patient.phone}</TableCell>
                                <TableCell>{test.labTest?.name}</TableCell>
                                <TableCell>
                                    <span
                                        className={
                                            test.status === "PENDING"
                                                ? "px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800"
                                                : test.status === "PROCESSING"
                                                    ? "px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800"
                                                    : test.status === "COMPLETED"
                                                        ? "px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800"
                                                        : test.status === "SENT_EXTERNAL"
                                                            ? "px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800"
                                                            : "px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800"
                                        }
                                    >
                                        {test.status}
                                    </span>
                                </TableCell>
                                {
                                    test.status === "COMPLETED" && (
                                        <TableCell>
                                            <ViewTestResult appointmentLabTestId={test.id} />
                                        </TableCell>
                                    )
                                }
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Finalize Bill Dialog */}
            <Dialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Finalize Bill & Payment</DialogTitle>
                    </DialogHeader>
                    {finalizePatient && finalizeTest && (
                        <form onSubmit={handleFinalizeBill} className="space-y-4">
                            <div>
                                <div className="font-medium">Patient: {finalizePatient.name}</div>
                                <div className="text-sm text-gray-500">Test: {finalizeTest.name}</div>
                                <div className="text-sm text-gray-500">Base Price: ₹{basePrice.toFixed(2)}</div>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Discount</label>
                                <div className="flex gap-2 mt-1">
                                    <Button type="button" variant={discountType === 'percentage' && discountValue === 50 ? 'default' : 'outline'} size="sm" onClick={() => { setDiscountType('percentage'); setDiscountValue(50); }}>50%</Button>
                                    <Button type="button" variant={discountType === 'percentage' && discountValue === 25 ? 'default' : 'outline'} size="sm" onClick={() => { setDiscountType('percentage'); setDiscountValue(25); }}>25%</Button>
                                    <Button type="button" variant={discountType === 'percentage' && discountValue === 15 ? 'default' : 'outline'} size="sm" onClick={() => { setDiscountType('percentage'); setDiscountValue(15); }}>15%</Button>
                                    <Button type="button" variant={discountType === 'percentage' && discountValue === 0 ? 'default' : 'outline'} size="sm" onClick={() => { setDiscountType('percentage'); setDiscountValue(0); }}>No</Button>
                                </div>
                                <Input type="number" placeholder="Custom amount" min="0" max={basePrice} step="0.01" value={discountType === 'custom' ? discountValue : ''} onChange={e => { setDiscountType('custom'); setDiscountValue(Number(e.target.value)); }} className="mt-2" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Payment Option</label>
                                <div className="flex gap-2 mt-1">
                                    <Button type="button" variant={paymentOption === 'full' ? 'default' : 'outline'} onClick={() => { setPaymentOption('full'); setAmountPaid(totalAmount); }}>Pay Full</Button>
                                    <Button type="button" variant={paymentOption === 'partial' ? 'default' : 'outline'} onClick={() => { setPaymentOption('partial'); setAmountPaid(0); }}>Pay Partial</Button>
                                </div>
                                {paymentOption === 'partial' && (
                                    <Input type="number" value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))} placeholder="Enter partial amount" min="0" max={totalAmount} step="0.01" className="mt-2" />
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium">Payment Method</label>
                                <div className="flex gap-2 mt-1">
                                    <Button type="button" variant={paymentMethod === PaymentMethod.CASH ? 'default' : 'outline'} onClick={() => setPaymentMethod(PaymentMethod.CASH)}>Cash</Button>
                                    <Button type="button" variant={paymentMethod === PaymentMethod.CARD ? 'default' : 'outline'} onClick={() => setPaymentMethod(PaymentMethod.CARD)}>Card</Button>
                                    <Button type="button" variant={paymentMethod === PaymentMethod.UPI ? 'default' : 'outline'} onClick={() => setPaymentMethod(PaymentMethod.UPI)}>UPI</Button>
                                </div>
                            </div>
                            <div className="flex justify-between font-semibold">
                                <span>Total: ₹{totalAmount.toFixed(2)}</span>
                                <span>Due: ₹{dueAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setFinalizeDialogOpen(false)} disabled={processing}>Cancel</Button>
                                <Button type="submit" disabled={processing || totalAmount <= 0 || (paymentOption === 'partial' && amountPaid <= 0) || amountPaid > totalAmount}>{processing ? 'Processing...' : 'Finalize & Pay'}</Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
