import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { labApi } from '@/api/lab';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface LabTest {
    id: string;
    name: string;
    code: string;
}

interface LabTestSearchProps {
    onTestSelect: (test: LabTest) => void;
    placeholder?: string;
    className?: string;
}

export function LabTestSearch({ onTestSelect, placeholder = "Search tests...", className = "w-64" }: LabTestSearchProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showTestDropdown, setShowTestDropdown] = useState(false);

    const { data: allTests = [] } = useQuery<LabTest[]>({
        queryKey: ['lab-tests'],
        queryFn: async () => {
            const response = await labApi.getLabTests();
            return response.data?.data;
        }
    });

    const filteredTests = allTests.filter(test =>
        test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleTestSelect = (test: LabTest) => {
        onTestSelect(test);
        setShowTestDropdown(false);
        setSearchQuery('');
    };

    return (
        <div className="relative">
            <div className="flex items-center gap-2">
                <Input
                    placeholder={placeholder}
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowTestDropdown(true);
                    }}
                    onFocus={() => setShowTestDropdown(true)}
                    className={className}
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTestDropdown(!showTestDropdown)}
                >
                    <Search className="h-4 w-4" />
                </Button>
            </div>

            {showTestDropdown && (
                <div className="absolute z-10 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                    {filteredTests.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">No tests found</div>
                    ) : (
                        filteredTests.map((test) => (
                            <div
                                key={test.id}
                                className="p-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => handleTestSelect(test)}
                            >
                                <div className="font-medium">{test.name}</div>
                                <div className="text-sm text-gray-500">{test.code}</div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
} 