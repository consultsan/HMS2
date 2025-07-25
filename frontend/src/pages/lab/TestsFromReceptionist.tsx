import { useQuery } from "@tanstack/react-query";
import { labApi } from "@/api/lab";
import { LabOrder } from "@/types/types";
import LabTestManager from "./LabTestManager";

export default function TestsFromReceptionist() {
    // Fetch lab orders
    const { data: labOrders, isLoading, error } = useQuery<LabOrder[]>({
        queryKey: ['receptionistLabOrders'],
        queryFn: async () => {
            const response = await labApi.getExternalLabOrders();
            return response.data?.data || [];
        },
        refetchInterval: 30000,
        refetchOnWindowFocus: true,
    });

    // Filter lab orders for receptionist tests (orders with patient data)
    const receptionistLabOrders = labOrders?.filter(order =>
        order.patient && order.appointmentLabTests && order.appointmentLabTests.length > 0
    ) || [];

    return (
        <LabTestManager filter="FromReceptionist" />
    );
}
