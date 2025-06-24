import LabTestManager from "./LabTestManager";

export default function TestsFromReceptionist() {
    return (
        <LabTestManager
            title="Tests From Receptionist"
            testFilter={(test) => test.patient}
        />
    );
}
