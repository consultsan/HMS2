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
                        onClick={() => orderLabTestMutation.mutate()}
                        disabled={!selectedPatient || !selectedTest || orderLabTestMutation.isPending}
                    >
                        {orderLabTestMutation.isPending ? 'Ordering...' : 'Order Test'}
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

        </div>
    );
}
