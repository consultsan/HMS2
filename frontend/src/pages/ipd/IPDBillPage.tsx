import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft,
  IndianRupee
} from 'lucide-react';
import { toast } from 'sonner';
import { ipdApi } from '@/api/ipd';

export default function IPDBillPage() {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const [billData, setBillData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (billId) {
      fetchBillData();
    }
  }, [billId]);

  const fetchBillData = async () => {
    try {
      setIsLoading(true);
      
      // Always use admissionId to fetch bills (billId parameter is actually admissionId)
      try {
        // Get all bills for this admission
        const billsResponse = await ipdApi.getIPDBills(billId!);
        const bills = billsResponse.data.data;

        // Find the discharge bill (exclude advance bills which have billNumber starting with 'IPD-ADV')
        const dischargeBill = bills.find((bill: any) => 
          !bill.billNumber.includes('ADV')
        );
        if (dischargeBill) {
          // Found the discharge bill, now fetch full details using the bill ID
          const fullBillResponse = await ipdApi.getIPDBillDetails(dischargeBill.id);
          const fullBill = fullBillResponse.data.data;

          console.log('fullBill', fullBill);
          // Add stayDuration from calculation
          try {
            const calcResponse = await ipdApi.calculateDischargeBill(billId!);
            fullBill.stayDuration = calcResponse.data.data.admission.stayDuration;
          } catch {
            fullBill.stayDuration = 'N/A';
          }
          
          setBillData(fullBill);
        } else {
          // No discharge bill found, calculate it on the fly
          console.log('No discharge bill found, calculating...');
          const calcResponse = await ipdApi.calculateDischargeBill(billId!);
          const calculated = calcResponse.data.data;
          
          // Transform calculated bill to match Bill entity structure
          const transformedBill = {
            billNumber: 'DRAFT',
            billDate: calculated.admission.dischargeDate,
            totalAmount: calculated.totalAmount,
            paidAmount: calculated.advanceAmount || 0,
            dueAmount: calculated.amountAfterAdvance,
            stayDuration: calculated.admission.stayDuration,
            patient: calculated.patient,
            hospital: calculated.hospital,
            billItems: [
              // Room charges
              {
                description: calculated.billBreakdown.roomCharges.description,
                notes: `${calculated.admission.wardType} - ${calculated.admission.stayDuration} days`,
                quantity: calculated.admission.stayDuration,
                unitPrice: calculated.billBreakdown.roomCharges.ratePerDay,
                totalPrice: calculated.billBreakdown.roomCharges.amount
              },
              // Surgery charges
              ...calculated.billBreakdown.surgeryCharges.items.map((surgery: any) => ({
                description: surgery.name,
                notes: `Status: ${surgery.status}`,
                quantity: 1,
                unitPrice: surgery.cost,
                totalPrice: surgery.cost
              })),
              // Lab test charges
              ...calculated.billBreakdown.labTestCharges.items.map((test: any) => ({
                description: test.name,
                notes: `Status: ${test.status}`,
                quantity: 1,
                unitPrice: test.cost,
                totalPrice: test.cost
              }))
            ]
          };
          
          setBillData(transformedBill);
        }
      } catch (error) {
        console.error('Error fetching bills:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error fetching bill:', error);
      toast.error('Failed to load bill');
    } finally {
      setIsLoading(false);
    }
  };

  if (!billId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No bill ID provided</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!billData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">No bill data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <div className="flex items-center justify-between mb-8 print:hidden">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Bill Document */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Hospital Header - Matching DiagnosisRecord Template */}
          <div className="bg-gradient-to-tr from-blue-900 to-blue-400 text-white rounded-t-lg p-2">
            <div className="flex justify-between items-center">
              {/* Logo */}
              <div>
                <img 
                  src="/Logo11.jpeg" 
                  alt="Hospital Logo" 
                  className="h-16 object-contain" 
                />
              </div>

              {/* Hospital Info */}
              <div className="text-right text-sm leading-tight">
                {billData.hospital?.name && (
                  <div className="text-2xl font-bold mb-1">{billData.hospital.name}</div>
                )}
                <div className="text-gray-200 text-xs">IPD Discharge Bill</div>
                <div className="text-gray-200 text-xs">Bill No: {billData.billNumber}</div>
              </div>
            </div>
          </div>

          {/* Patient Information Section */}
          <div className="break-inside-avoid mb-3 p-3">
            <h2 className="text-lg font-semibold text-gray-800 mb-1 border-b pb-0.5">
              Patient Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-2 rounded-md border">
              <div>
                <p className="mb-0.5">
                  <span className="text-gray-600">Patient Name:</span> {billData.patient?.name}
                </p>
                <p className="mb-0.5">
                  <span className="text-gray-600">Patient ID:</span> {billData.patient?.uhid}
                </p>
                <p className="mb-0.5">
                  <span className="text-gray-600">Phone:</span> {billData.patient?.phone}
                </p>
              </div>
              <div>
                <p className="mb-0.5">
                  <span className="text-gray-600">Bill Number:</span> <span className="font-semibold">{billData.billNumber}</span>
                </p>
                <p className="mb-0.5">
                  <span className="text-gray-600">Bill Date:</span> {new Date(billData.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <p className="mb-0.5">
                  <span className="text-gray-600">Duration:</span> {billData.stayDuration || 'N/A'} days
                </p>
              </div>
            </div>
          </div>

          {/* Charges Breakdown Section */}
          <div className="break-inside-avoid mb-3 px-3">
            <h2 className="text-lg font-semibold text-gray-800 mb-1 border-b pb-0.5">Charges Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200">
                <thead>
                  <tr className="bg-gray-100 text-sm text-gray-700">
                    <th className="py-0.5 px-2 text-left">Description</th>
                    <th className="py-0.5 px-2 text-center">Quantity</th>
                    <th className="py-0.5 px-2 text-right">Rate</th>
                    <th className="py-0.5 px-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {billData.billItems?.map((item: any, index: number) => (
                    <tr key={index} className="even:bg-white odd:bg-gray-50 border-t border-gray-200">
                      <td className="py-0.5 px-2 text-sm">
                        <div className="font-medium">{item.description}</div>
                        {item.notes && (
                          <div className="text-xs text-gray-500">{item.notes}</div>
                        )}
                      </td>
                      <td className="py-0.5 px-2 text-sm text-center">{item.quantity}</td>
                      <td className="py-0.5 px-2 text-sm text-right">
                        ₹{item.unitPrice?.toFixed(2)}
                      </td>
                      <td className="py-0.5 px-2 text-sm text-right font-medium">
                        ₹{item.totalPrice?.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Amount Section */}
          <div className="break-inside-avoid mb-3 px-3">
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-800">Total Amount:</span>
                <span className="text-2xl font-bold text-blue-900 flex items-center gap-1">
                  <IndianRupee className="h-6 w-6" />
                  {billData.totalAmount?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div className="footer pt-2 border-t mt-2 text-xs text-gray-500 px-3 pb-3">
            <div className="flex flex-col md:flex-row justify-between items-start gap-2">
              <div>
                <div>Bill Date: {new Date(billData.billDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div>Hospital: {billData.hospital?.name || 'T.R.U.E. Hospitals'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-700">Authorized Signature</div>
                <div className="border-b border-gray-400 w-36 mt-1 ml-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

