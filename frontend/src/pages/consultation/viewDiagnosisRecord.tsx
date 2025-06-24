import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";


export default function ViewDiagnosisRecordButton({ appointmentId }: { appointmentId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
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
