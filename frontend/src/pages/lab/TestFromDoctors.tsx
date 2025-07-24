import { useQuery } from "@tanstack/react-query";
import { labApi } from "@/api/lab";
import { LabOrder } from "@/types/types";
import LabTestManager from "./LabTestManager";

export default function TestFromDoctors() {
    // Fetch lab orders
    const { data: labOrders, isLoading, error } = useQuery<LabOrder[]>({
        queryKey: ['doctorLabOrders'],
        queryFn: async () => {
            const response = await labApi.getInternalLabOrders();
            return response.data?.data || [];
        },
        refetchInterval: 30000,
        refetchOnWindowFocus: true,
    });

    // Filter lab orders for doctor tests (not referred from outside)
    const doctorLabOrders = labOrders?.map(order => ({
        ...order,
        appointmentLabTests: order.appointmentLabTests?.filter(test =>
            !test.referredFromOutside
        ) || []
    })).filter(order => order.appointmentLabTests.length > 0) || [];

    return (
        <LabTestManager filter="FromDoctor" />
    );
}