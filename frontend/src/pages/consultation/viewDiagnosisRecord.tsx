import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";


export default function ViewDiagnosisRecordButton({ appointmentId }: { appointmentId: string }) {
    const [loading] = useState(false);
    return (
        <>
            <Link
                to={`/doctor/diagnosis-record/${appointmentId}`}
                className="inline-flex"
            >

                <Button
                    variant="outline"
                    disabled={loading}
                    className="w-full"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                        </>
                    ) : (
                        'View Diagnosis Record'
                    )}
                </Button>
            </Link>
        </>
    );
}
