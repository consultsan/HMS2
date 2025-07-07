import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateAge } from "@/utils/dateUtils";
import { Pencil, Eye, ChevronDown, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';

type LabTestStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'SENT_EXTERNAL';

interface Test {
    id: string;
    labTestId: string;
    status: LabTestStatus;
    charge: number;
    tentativeReportDate?: string;
    isExternal?: boolean;
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

interface LabTestsProps {
    tests: Test[];
    onStatusUpdate: (testId: string) => void;
    onEditTentativeDate: (testId: string) => void;
    onExternalChange: (testId: string, value: string) => void;
    onViewParameters: (testId: string, labTestId: string) => void;
    isProcessing?: boolean;
    showViewParametersOnlyForCompleted?: boolean;
    viewParametersButtonText?: string;
}

interface PatientGroup {
    patient: {
        name: string;
        phone: string;
        gender: string;
        dob: string;
        id: string;
    };
    tests: Test[];
}

export default function LabTests({
    tests,
    onStatusUpdate,
    onEditTentativeDate,
    onExternalChange,
    onViewParameters,
    isProcessing = false,
    showViewParametersOnlyForCompleted = false,
    viewParametersButtonText = "View Parameters"
}: LabTestsProps) {
    const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getPatientInfo = (test: Test) => {
        if (test?.patient) {
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

    // Group tests by patient
    const groupedTests = tests.reduce((groups: { [key: string]: PatientGroup }, test) => {
        const patientInfo = getPatientInfo(test);
        const patientKey = `${patientInfo.name}-${patientInfo.phone}`; // Use name+phone as unique key

        if (!groups[patientKey]) {
            groups[patientKey] = {
                patient: {
                    ...patientInfo,
                    id: patientKey
                },
                tests: []
            };
        }

        groups[patientKey].tests.push(test);
        return groups;
    }, {});

    const patientGroups = Object.values(groupedTests);

    const togglePatientExpansion = (patientId: string) => {
        const newExpanded = new Set(expandedPatients);
        if (newExpanded.has(patientId)) {
            newExpanded.delete(patientId);
        } else {
            newExpanded.add(patientId);
        }
        setExpandedPatients(newExpanded);
    };

    const getStatusSummary = (tests: Test[]) => {
        const statusCounts = tests.reduce((acc, test) => {
            acc[test.status] = (acc[test.status] || 0) + 1;
            return acc;
        }, {} as Record<LabTestStatus, number>);

        return (
            <div className="flex gap-2 text-xs">
                {Object.entries(statusCounts).map(([status, count]) => (
                    <span
                        key={status}
                        className={`px-2 py-1 rounded-full ${status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                                status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-700'
                            }`}
                    >
                        {status}: {count}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Patient Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Total Tests</TableHead>
                        <TableHead>Total Charge (₹)</TableHead>
                        <TableHead>Status Summary</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {patientGroups.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                No tests found
                            </TableCell>
                        </TableRow>
                    ) : (
                        <>
                            {patientGroups.map((group) => {
                                const isExpanded = expandedPatients.has(group.patient.id);
                                return (
                                    <React.Fragment key={group.patient.id}>
                                        {/* Patient Summary Row */}
                                        <TableRow className="bg-gray-50 hover:bg-gray-100">
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => togglePatientExpansion(group.patient.id)}
                                                    className="p-1 h-6 w-6"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="font-medium">{group.patient.name}</TableCell>
                                            <TableCell>{group.patient.phone}</TableCell>
                                            <TableCell>{group.patient.gender}</TableCell>
                                            <TableCell>{calculateAge(group.patient.dob)} years</TableCell>
                                            <TableCell>
                                                <span className="font-semibold text-blue-600">
                                                    {group.tests.length} test{group.tests.length !== 1 ? 's' : ''}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm font-medium text-green-600">
                                                    ₹{group.tests.reduce((total, test) => total + test.charge, 0).toFixed(2)}
                                                </span>
                                            </TableCell>
                                            <TableCell>{getStatusSummary(group.tests)}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => togglePatientExpansion(group.patient.id)}
                                                >
                                                    {isExpanded ? 'Hide Tests' : 'Show Tests'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>

                                        {/* Expanded Tests Rows */}
                                        {isExpanded && (
                                            <>
                                                {/* Sub-header for tests */}
                                                <TableRow className="bg-blue-50">
                                                    <TableCell></TableCell>
                                                    <TableCell className="font-medium text-sm text-blue-800">Test Name</TableCell>
                                                    <TableCell className="font-medium text-sm text-blue-800">Sample Type</TableCell>
                                                    <TableCell className="font-medium text-sm text-blue-800">Status</TableCell>
                                                    <TableCell className="font-medium text-sm text-blue-800">Tentative Date</TableCell>
                                                    <TableCell className="font-medium text-sm text-blue-800">External</TableCell>
                                                    <TableCell className="font-medium text-sm text-blue-800">Charge (₹)</TableCell>
                                                    <TableCell className="font-medium text-sm text-blue-800">Actions</TableCell>
                                                    <TableCell></TableCell>
                                                </TableRow>
                                                {group.tests.map((test) => (
                                                    <TableRow key={test.id} className="bg-blue-25 border-l-4 border-blue-200">
                                                        <TableCell></TableCell>
                                                        <TableCell className="pl-4">
                                                            <span className="text-sm font-medium">{test.labTest.name}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-sm">{test.labTest.sampleType || 'N/A'}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${test.status === 'PENDING' ? 'bg-yellow-50 text-yellow-600' :
                                                                test.status === 'PROCESSING' ? 'bg-blue-50 text-blue-600' :
                                                                    test.status === 'COMPLETED' ? 'bg-green-50 text-green-600' :
                                                                        'bg-gray-50 text-gray-600'
                                                                }`}>
                                                                {test.status}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm">
                                                                    {test.tentativeReportDate ? formatDate(test.tentativeReportDate) : 'Not set'}
                                                                </span>
                                                                <Pencil
                                                                    className="w-3 h-3 cursor-pointer hover:text-blue-500"
                                                                    onClick={() => onEditTentativeDate(test.id)}
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                defaultValue={test.isExternal ? "yes" : "no"}
                                                                onValueChange={(value) => onExternalChange(test.id, value)}
                                                            >
                                                                <SelectTrigger className="w-[80px] h-8">
                                                                    <SelectValue placeholder="Select" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="yes">Yes</SelectItem>
                                                                    <SelectItem value="no">No</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-sm font-medium text-green-600">
                                                                ₹{test.charge?.toFixed(2) || '0.00'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-1">
                                                                {test.status !== "COMPLETED" && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => onStatusUpdate(test.id)}
                                                                        disabled={isProcessing || test.tentativeReportDate == null}
                                                                        className="h-7 px-2 text-xs"
                                                                    >
                                                                        Done
                                                                    </Button>
                                                                )}
                                                                {(!showViewParametersOnlyForCompleted || test.status === 'COMPLETED') && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => onViewParameters(test.id, test.labTestId)}
                                                                        className="h-7 px-2 text-xs"
                                                                    >
                                                                        <Eye className="w-3 h-3 mr-1" />
                                                                        {viewParametersButtonText}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell></TableCell>
                                                    </TableRow>
                                                ))}
                                            </>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
