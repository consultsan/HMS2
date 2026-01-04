import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Printer, 
  FileText,
  User,
  Calendar,
  IndianRupee
} from 'lucide-react';
import { toast } from 'sonner';
import { ipdApi } from '@/api/ipd';

interface IPDBillViewerProps {
  admissionId: string;
}

export default function IPDBillViewer({ admissionId }: IPDBillViewerProps) {
  const [billData, setBillData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBillData();
  }, [admissionId]);

  const fetchBillData = async () => {
    try {
      setIsLoading(true);
      const response = await ipdApi.calculateDischargeBill(admissionId);
      setBillData(response.data.data);
    } catch (error) {
      console.error('Error fetching bill:', error);
      toast.error('Failed to load bill');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast.info('Download functionality coming soon!');
  };

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
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No bill data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mb-4 print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {/* Bill Content */}
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-blue-50">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold text-blue-900">
                  {billData.hospital.name}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">IPD Discharge Bill</p>
              </div>
              <div className="text-right">
                <Badge className="bg-green-600 text-white text-lg px-4 py-2">
                  PAID
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            {/* Patient & Admission Info */}
            <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Patient Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2 font-medium">{billData.patient.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">UHID:</span>
                    <span className="ml-2 font-medium">{billData.patient.uhid}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <span className="ml-2 font-medium">{billData.patient.phone}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Admission Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Admission Date:</span>
                    <span className="ml-2 font-medium">
                      {new Date(billData.admission.admissionDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Discharge Date:</span>
                    <span className="ml-2 font-medium">
                      {new Date(billData.admission.dischargeDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <span className="ml-2 font-medium">{billData.admission.stayDuration} days</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Ward:</span>
                    <span className="ml-2 font-medium">
                      {billData.admission.wardType}
                      {billData.admission.wardSubType && ` - ${billData.admission.wardSubType}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Room/Bed:</span>
                    <span className="ml-2 font-medium">
                      {billData.admission.roomNumber || 'N/A'} / {billData.admission.bedNumber || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill Items */}
            <div className="mb-8">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <IndianRupee className="h-4 w-4" />
                Charges Breakdown
              </h3>

              <table className="w-full">
                <thead className="bg-gray-50 border-b-2">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Description</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Quantity</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Rate</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {/* Room Charges */}
                  <tr>
                    <td className="py-3 px-4">
                      <div className="font-medium">Room Charges</div>
                      <div className="text-sm text-gray-500">
                        {billData.billBreakdown.roomCharges.description}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">{billData.billBreakdown.roomCharges.days}</td>
                    <td className="text-right py-3 px-4">
                      ₹{billData.billBreakdown.roomCharges.ratePerDay.toFixed(2)}
                    </td>
                    <td className="text-right py-3 px-4 font-semibold">
                      ₹{billData.billBreakdown.roomCharges.amount.toFixed(2)}
                    </td>
                  </tr>

                  {/* Surgery Charges */}
                  {billData.billBreakdown.surgeryCharges.count > 0 && (
                    <tr>
                      <td className="py-3 px-4">
                        <div className="font-medium">Surgery Charges</div>
                        <div className="text-sm text-gray-500">
                          {billData.billBreakdown.surgeryCharges.description}
                        </div>
                        {billData.billBreakdown.surgeryCharges.items.map((item: any, idx: number) => (
                          <div key={idx} className="text-xs text-gray-500 ml-4 mt-1">
                            • {item.name}
                          </div>
                        ))}
                      </td>
                      <td className="text-right py-3 px-4">{billData.billBreakdown.surgeryCharges.count}</td>
                      <td className="text-right py-3 px-4">-</td>
                      <td className="text-right py-3 px-4 font-semibold">
                        ₹{billData.billBreakdown.surgeryCharges.amount.toFixed(2)}
                      </td>
                    </tr>
                  )}

                  {/* Lab Test Charges */}
                  {billData.billBreakdown.labTestCharges.count > 0 && (
                    <tr>
                      <td className="py-3 px-4">
                        <div className="font-medium">Lab Test Charges</div>
                        <div className="text-sm text-gray-500">
                          {billData.billBreakdown.labTestCharges.description}
                        </div>
                        {billData.billBreakdown.labTestCharges.items.map((item: any, idx: number) => (
                          <div key={idx} className="text-xs text-gray-500 ml-4 mt-1">
                            • {item.name}
                          </div>
                        ))}
                      </td>
                      <td className="text-right py-3 px-4">{billData.billBreakdown.labTestCharges.count}</td>
                      <td className="text-right py-3 px-4">-</td>
                      <td className="text-right py-3 px-4 font-semibold">
                        ₹{billData.billBreakdown.labTestCharges.amount.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="border-t-2 pt-6">
              <div className="space-y-3 max-w-md ml-auto">
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Subtotal:</span>
                  <span className="font-semibold">₹{billData.totalAmount.toFixed(2)}</span>
                </div>

                {billData.advanceAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Advance Paid:</span>
                    <span>-₹{billData.advanceAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-2xl font-bold text-blue-900 pt-3 border-t-2">
                  <span>Total Amount:</span>
                  <span>₹{billData.amountAfterAdvance.toFixed(2)}</span>
                </div>

                <div className="text-center mt-4">
                  <Badge className="bg-green-600 text-white px-6 py-2 text-lg">
                    PAID IN FULL
                  </Badge>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t text-center text-sm text-gray-500">
              <p>Thank you for choosing {billData.hospital.name}</p>
              <p className="mt-2">This is a computer-generated bill and does not require a signature</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

