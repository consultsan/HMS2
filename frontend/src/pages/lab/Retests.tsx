import { useState } from 'react';
import { format } from 'date-fns';

interface Retest {
    id: string;
    originalTestId: string;
    patientName: string;
    testName: string;
    reason: string;
    requestedBy: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    requestedAt: string;
    completedAt?: string;
}

// Dummy data for retests
const dummyRetests: Retest[] = [
    {
        id: "retest-1",
        originalTestId: "test-1",
        patientName: "John Doe",
        testName: "Complete Blood Count",
        reason: "Abnormal WBC count requiring confirmation",
        requestedBy: "Dr. Smith",
        status: "PENDING",
        requestedAt: "2024-03-19T16:00:00Z"
    },
    {
        id: "retest-2",
        originalTestId: "test-2",
        patientName: "Jane Smith",
        testName: "Lipid Profile",
        reason: "Sample quality issues",
        requestedBy: "Dr. Johnson",
        status: "COMPLETED",
        requestedAt: "2024-03-19T15:00:00Z",
        completedAt: "2024-03-19T16:30:00Z"
    }
];

export default function Retests() {
    const [retests, setRetests] = useState<Retest[]>(dummyRetests);
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

    const filteredRetests = selectedStatus === 'ALL'
        ? retests
        : retests.filter(retest => retest.status === selectedStatus);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Lab Test Retests</h1>
                <div className="flex items-center gap-4">
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested By</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested At</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredRetests.map((retest) => (
                                <tr key={retest.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {retest.patientName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {retest.testName}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {retest.reason}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {retest.requestedBy}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(retest.status)}`}>
                                            {retest.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(retest.requestedAt), 'dd MMM yyyy, HH:mm')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {retest.status === 'PENDING' && (
                                            <button className="text-blue-600 hover:text-blue-900 mr-3">
                                                Start Retest
                                            </button>
                                        )}
                                        {retest.status === 'IN_PROGRESS' && (
                                            <button className="text-green-600 hover:text-green-900">
                                                Complete
                                            </button>
                                        )}
                                        {retest.status === 'COMPLETED' && (
                                            <button className="text-blue-600 hover:text-blue-900">
                                                View Results
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}