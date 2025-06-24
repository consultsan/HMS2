import LabTestManager from "./LabTestManager";

export default function TestFromDoctors() {
    return (
        <LabTestManager
            title="Test From Doctors"
            testFilter={(test) => !test.referredFromOutside}
        />
    );
}