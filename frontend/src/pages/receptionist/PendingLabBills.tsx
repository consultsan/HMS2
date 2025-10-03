import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-filter";
import { useState, useMemo } from "react";
import { useSearch } from "@/contexts/SearchContext";
import ViewBill from "@/components/billing/ViewBill";
import { Button } from "@/components/ui/button";
import { LabOrderStatus, LabOrder } from "@/types/types";
import { labApi } from "@/api/lab";
import CreateLabOrderBill from "@/components/lab/CreateLabOrderBill";
import ViewAppointmentLabtests from "@/components/lab/viewAppointmentLabtests";


export default function PendingLabBills() {
  const [filterDate, setFilterDate] = useState<Date>(new Date());
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all'); // 'all', 'internal', 'external'
  const [selectedLabOrder, setSelectedLabOrder] = useState<LabOrder | null>(null);
  const [viewBillDialogOpen, setViewBillDialogOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const { searchQuery } = useSearch();

  // Check if two dates are the same day
  const isSameDay = (date1: Date | string, date2: Date | string) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.toDateString() === d2.toDateString();
  };

  // Fetch both internal and external lab orders using React Query with improved error handling
  const { data: labOrders, isLoading, error, refetch } = useQuery<LabOrder[]>({
    queryKey: ['allLabOrders'], // Updated to reflect fetching both internal and external
    queryFn: async () => {
      // Fetch both internal and external lab orders in parallel
      const [internalResponse, externalResponse] = await Promise.all([
        labApi.getInternalLabOrders(),
        labApi.getExternalLabOrders()
      ]);
      
      const internalOrders = internalResponse.data?.data || [];
      const externalOrders = externalResponse.data?.data || [];
      
      console.log('Internal orders:', internalOrders);
      console.log('External orders:', externalOrders);
      
      // Combine both arrays
      return [...internalOrders, ...externalOrders];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Memoize filtered results for better performance
  const filteredLabOrders = useMemo(() => {
    if (!labOrders) return [];

    // Filter by pending and processing status (both lab order status and individual lab test statuses)
    // This works for both internal and external lab orders
    const pendingAndProcessingOrders = labOrders.filter((order: LabOrder) => {
      const hasOrderStatus = order.status === LabOrderStatus.PENDING || order.status === LabOrderStatus.PROCESSING;
      const hasPendingOrProcessingTests = order.appointmentLabTests?.some(test => 
        test.status === 'PENDING' || test.status === 'PROCESSING'
      );
      return hasOrderStatus || hasPendingOrProcessingTests;
    });

    // Then apply search, date, and order type filters
    return pendingAndProcessingOrders.filter((order: LabOrder) => {
      // Order type filter
      if (orderTypeFilter !== 'all') {
        const isInternal = order.appointmentId !== null && order.appointmentId !== undefined;
        const isExternal = order.appointmentId === null || order.appointmentId === undefined;
        
        if (orderTypeFilter === 'internal' && !isInternal) return false;
        if (orderTypeFilter === 'external' && !isExternal) return false;
      }

      // Search filter takes precedence
      if (searchQuery) {
        return (
          order.patient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.patient?.phone?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      // Date filter when no search query
      // Handle both internal orders (createdAt) and external orders (orderDate)
      const orderDate = order.createdAt || order.orderDate;
      return orderDate ? isSameDay(orderDate, filterDate) : false;
    });
  }, [labOrders, searchQuery, filterDate, orderTypeFilter]);

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFilterDate(date);
    }
  };

  const handleViewBill = (billId: string | undefined) => {
    if (billId) {
      setSelectedBillId(billId);
      setViewBillDialogOpen(true);
    }
  };

  const handleCreateLabOrderBill = (order: LabOrder) => {
    setSelectedLabOrder(order);
  };

  const handleBillSuccess = () => {
    setViewBillDialogOpen(false);
    setSelectedBillId(null);
    // Optionally refresh the lab orders data
  };


  // Enhanced loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading lab orders...</div>
        </div>
      </div>
    );
  }

  // Enhanced error state
  if (error) {
    return (
      <div className="p-6">
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <div className="text-red-500">Error loading lab orders</div>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="p-6">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Lab Orders Management</h2>
          <div className="flex gap-4 items-center">
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Orders</option>
              <option value="internal">Internal Orders</option>
              <option value="external">External Orders</option>
            </select>
            <DatePicker
              date={filterDate}
              onDateChange={handleDateChange}
            />
          </div>
        </div>
        <div className="rounded-lg border">
          <Table numberOfRows={9}>
            <TableHeader>
              <TableRow>
                <TableHead>Patient Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Tests</TableHead>
                <TableHead>Ordered At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            {filteredLabOrders && filteredLabOrders.length > 0 ? (
              <TableBody>
                {filteredLabOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.patient?.name}</TableCell>
                    <TableCell>{order.patient?.phone}</TableCell>
                    <TableCell>
                      <ViewAppointmentLabtests 
                        appointmentId={order.appointmentId} 
                        labTestsData={order.appointmentLabTests}
                      />
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const dateToUse = order.createdAt || order.orderDate;
                        return dateToUse ? new Date(dateToUse).toLocaleString('en-GB', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'UTC'
                        }) : 'N/A';
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {order.appointmentLabTests?.map((labTest) => (
                          <span 
                            key={labTest.id}
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              labTest.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-800'
                                : labTest.status === 'PROCESSING'
                                  ? 'bg-blue-100 text-blue-800'
                                  : labTest.status === 'SENT_EXTERNAL'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                          {labTest.status}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 items-center">
                        {/* Actions for PENDING orders */}
                        {order.status === LabOrderStatus.PENDING && !order.billId && (
                          <Button
                            variant="outline"
                            className="bg-green-500 text-white hover:bg-green-600"
                            onClick={() => handleCreateLabOrderBill(order)}
                          >
                            Generate Bill
                          </Button>
                        )}

                        {/* Actions for PENDING orders with bill */}
                        {order.status === LabOrderStatus.PENDING && order.billId && (
                          <Button
                            variant="outline"
                            onClick={() => handleViewBill(order.billId)}
                          >
                            View Bill
                          </Button>
                        )}

                        {/* Actions for PROCESSING orders */}
                        {order.status === LabOrderStatus.PROCESSING && (
                          <>
                            {order.billId && (
                              <Button
                                variant="outline"
                                onClick={() => handleViewBill(order.billId)}
                              >
                                View Bill
                              </Button>
                            )}
                          </>
                        )}

                        {/* View Lab Test Results - Available for all orders with appointmentId */}

                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            ) : (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                    {searchQuery
                      ? 'No matching lab orders found'
                      : 'No lab orders found for the selected date'
                    }
                  </TableCell>
                </TableRow>
              </TableBody>
            )}
          </Table>
        </div>
      </div>

      {/* Create Lab Order Bill Dialog */}
      {selectedLabOrder && (
        <CreateLabOrderBill
          labOrder={selectedLabOrder}
          isOpen={!!selectedLabOrder}
          onClose={() => setSelectedLabOrder(null)}
          onSuccess={() => {
            setSelectedLabOrder(null);
          }}
        />
      )}

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