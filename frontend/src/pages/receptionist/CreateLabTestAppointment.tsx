import { labApi } from "@/api/lab";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, Plus } from "lucide-react";
import CreateLabOrderDialog from "@/components/lab/CreateLabOrderDialog";
import CreateLabOrderBill from "@/components/lab/CreateLabOrderBill";
import ViewBill from "@/components/billing/ViewBill";
import { LabOrderStatus } from "@/types/types";

export default function CreateLabTestAppointment() {
    const [searchQueryPatient, setSearchQueryPatient] = useState('');
    const [createLabOrderDialogOpen, setCreateLabOrderDialogOpen] = useState(false);
    const [billingDialogOpen, setBillingDialogOpen] = useState(false);
    const [selectedLabOrder, setSelectedLabOrder] = useState<any>(null);
    const [viewBillDialogOpen, setViewBillDialogOpen] = useState(false);
    const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
    const hospitalId = localStorage.getItem('hospitalId');

    // Handler for opening billing dialog
    const handleGenerateBill = (order: any) => {
        setSelectedLabOrder(order);
        setBillingDialogOpen(true);
    };

    // Handler for successful billing
    const handleBillingSuccess = () => {
        // awat labApi.update
        setBillingDialogOpen(false);
        setSelectedLabOrder(null);
    };

    // Handler for viewing bill
    const handleViewBill = (order: any) => {
        // Note: The billId should be included in the lab order response from the backend
        // For now, we'll use the order id as a placeholder - this needs to be updated
        // to use the actual billId associated with the lab order
        const billId = order.billId || `bill-${order.id}`; // Placeholder - needs actual billId
        setSelectedBillId(billId);
        setViewBillDialogOpen(true);
    };

    // Handler for successful bill operations
    const handleBillSuccess = () => {
        setViewBillDialogOpen(false);
        setSelectedBillId(null);
        // Optionally refresh the lab orders data
    };

    // Fetch external lab orders
    const { data: externalLabOrders } = useQuery<any>({
        queryKey: ['external-lab-orders'],
        queryFn: async () => {
            const response = await labApi.getExternalLabOrdersByHospital(hospitalId || '');
            return response.data?.data;
        },
    });


    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">Create Lab Test Appointment</h1>
                <Button
                    onClick={() => setCreateLabOrderDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Lab Order
                </Button>
            </div>

            {/* Lab Orders Section */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Lab Orders</h2>
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
                <Table numberOfRows={10}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Patient</TableHead>
                            <TableHead>Order Details</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {externalLabOrders?.filter((order: any) => {
                            if (!searchQueryPatient) return true;
                            const patientName = order.patient?.name?.toLowerCase() || '';
                            const patientId = order.patient?.patientUniqueId?.toLowerCase() || '';
                            const phone = order.patient?.phone || '';
                            const notes = order.notes?.toLowerCase() || '';
                            const orderedBy = order.orderedBy?.toLowerCase() || '';

                            // Search in lab tests
                            const labTestMatches = order.appointmentLabTests?.some((labTest: any) => {
                                const testName = labTest.labTest?.name?.toLowerCase() || '';
                                const testCode = labTest.labTest?.code?.toLowerCase() || '';
                                const sampleType = labTest.labTest?.sampleType?.toLowerCase() || '';
                                const status = labTest.status?.toLowerCase() || '';

                                return testName.includes(searchQueryPatient.toLowerCase()) ||
                                    testCode.includes(searchQueryPatient.toLowerCase()) ||
                                    sampleType.includes(searchQueryPatient.toLowerCase()) ||
                                    status.includes(searchQueryPatient.toLowerCase());
                            });

                            return (
                                patientName.includes(searchQueryPatient.toLowerCase()) ||
                                patientId.includes(searchQueryPatient.toLowerCase()) ||
                                phone.includes(searchQueryPatient) ||
                                notes.includes(searchQueryPatient.toLowerCase()) ||
                                orderedBy.includes(searchQueryPatient.toLowerCase()) ||
                                labTestMatches
                            );
                        })?.map((order: any) => (
                            <TableRow key={order.id}>
                                <TableCell>
                                    <div className="space-y-1">
                                        <div className="font-medium flex items-center gap-2">
                                            {order.patient?.name}
                                            <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-800">
                                                External
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            ID: {order.patient?.patientUniqueId}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            Phone: {order.patient?.phone}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1 text-sm">
                                        <div>
                                            <span className="text-gray-500">Created:</span> {new Date(order.createdAt).toLocaleDateString()}
                                        </div>
                                        {order.urgentOrder && (
                                            <div>
                                                <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">
                                                    URGENT
                                                </span>
                                            </div>
                                        )}
                                        {order.notes && (
                                            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                                <strong>Notes:</strong> {order.notes}
                                            </div>
                                        )}

                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1">
                                        {order.appointmentLabTests?.map((labTest: any) => (
                                            <div key={labTest.id} className="flex items-center gap-2">
                                                <span className="text-xs font-medium">{labTest.labTest?.name}:</span>
                                                <span
                                                    className={`px-2 py-1 rounded text-xs font-semibold ${labTest.status === "PENDING"
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : labTest.status === "PROCESSING"
                                                            ? "bg-blue-100 text-blue-800"
                                                            : labTest.status === "COMPLETED"
                                                                ? "bg-green-100 text-green-800"
                                                                : labTest.status === "SENT_EXTERNAL"
                                                                    ? "bg-purple-100 text-purple-800"
                                                                    : "bg-gray-100 text-gray-800"
                                                        }`}
                                                >
                                                    {labTest.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {order.status === LabOrderStatus.PENDING ? (
                                        <Button
                                            size="sm"
                                            onClick={() => handleGenerateBill(order)}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            Generate Bill
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={() => handleViewBill(order)}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            View Bill
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {(!externalLabOrders || externalLabOrders.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                                    No lab orders found. Click "Create Lab Order" to add new orders.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create Lab Omrder Dialog */}
            <CreateLabOrderDialog
                open={createLabOrderDialogOpen}
                onOpenChange={setCreateLabOrderDialogOpen}
            />

            {/* Lab Order Billing Dialog */}
            <CreateLabOrderBill
                labOrder={selectedLabOrder}
                isOpen={billingDialogOpen}
                onClose={() => setBillingDialogOpen(false)}
                onSuccess={handleBillingSuccess}
            />

            {/* Universal View Bill Dialog */}
            <ViewBill
                billId={selectedBillId}
                isOpen={viewBillDialogOpen}
                onClose={() => setViewBillDialogOpen(false)}
                onSuccess={handleBillSuccess}
            />
        </div>
    );
}
