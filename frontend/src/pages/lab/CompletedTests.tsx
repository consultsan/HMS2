import { labApi } from "@/api/lab";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateAge } from "@/utils/dateUtils";
import { useQuery } from "@tanstack/react-query";
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
import TestParameters from "./TestParamters";

type LabTestStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'SENT_EXTERNAL';

interface Test {
    id: string;
    labTestId: string;
    status: LabTestStatus;
    patient?: {
        name: string;
        phone: string;
        gender: string;
        dob: string;
    };
    appointment?: {
        patient: {
            name: string;
            phone: string;
            gender: string;
            dob: string;
        };
    };
    labTest: {
        name: string;
        sampleType?: string;
    };
}

export default function CompletedTests() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTestForView, setSelectedTestForView] = useState<{ id: string, labTestId: string } | null>(null);
    const [isViewParametersDialogOpen, setIsViewParametersDialogOpen] = useState(false);

    const { data: labTests } = useQuery<any>({
        queryKey: ['completed-lab-tests'],
        queryFn: async () => {
            const response = await labApi.getOrderedTestsByHospital();
            return response.data?.data;
        },
    });

    const completedTests = labTests?.filter((test: any) => {
        return test.status === "COMPLETED";
    });

    const handleViewParameters = (testId: string, labTestId: string) => {
        setSelectedTestForView({ id: testId, labTestId });
        setIsViewParametersDialogOpen(true);
    };

    const getPatientInfo = (test: Test) => {
        if (test.patient) {
            return {
                name: test.patient.name,
                phone: test.patient.phone,
                gender: test.patient.gender,
                dob: test.patient.dob
            };
        }
        return {
            name: test.appointment?.patient.name || '',
            phone: test.appointment?.patient.phone || '',
            gender: test.appointment?.patient.gender || '',
            dob: test.appointment?.patient.dob || ''
        };
    };

    const filteredTests = completedTests?.filter((test: any) => {
        const searchLower = searchQuery.toLowerCase();
        if (!searchQuery || searchQuery === '') { return true; }
        const patientInfo = getPatientInfo(test);
        return (
            patientInfo.name.toLowerCase().includes(searchLower) ||
            test.labTest.name.toLowerCase().includes(searchLower) ||
            test.status.toLowerCase().includes(searchLower) ||
            test.labTest.sampleType?.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">Completed Tests</h1>
            </div>

            <div className="relative flex-1 max-w-sm mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                    type="text"
                    placeholder="Search by patient name, test name, or status..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Patient Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Test Name</TableHead>
                        <TableHead>Sample Type</TableHead>
                        <TableHead>Test Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredTests?.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                No completed tests found
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredTests?.map((test: Test) => {
                            const patientInfo = getPatientInfo(test);
                            return (
                                <TableRow key={test.id}>
                                    <TableCell className="font-medium">{patientInfo.name}</TableCell>
                                    <TableCell>{patientInfo.phone}</TableCell>
                                    <TableCell>{patientInfo.gender}</TableCell>
                                    <TableCell>{calculateAge(patientInfo.dob)} years</TableCell>
                                    <TableCell>{test.labTest.name}</TableCell>
                                    <TableCell>{test.labTest.sampleType}</TableCell>
                                    <TableCell>
                                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                                            {test.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleViewParameters(test.id, test.labTestId)}
                                        >
                                            <Eye className="w-4 h-4 mr-1" />
                                            View Parameters
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>

            <Dialog open={isViewParametersDialogOpen} onOpenChange={setIsViewParametersDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Test Parameters</DialogTitle>
                    </DialogHeader>
                    {selectedTestForView && (
                        <TestParameters
                            testId={selectedTestForView.labTestId}
                            appointmentLabTestId={selectedTestForView.id}
                            canEdit={false}
                        />
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsViewParametersDialogOpen(false);
                                setSelectedTestForView(null);
                            }}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
