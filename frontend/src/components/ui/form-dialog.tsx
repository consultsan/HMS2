import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';

interface FormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
  showSubmitButton?: boolean;
}

export function FormDialog({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  isLoading = false,
  showSubmitButton = true,
}: FormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-green-500 shadow-lg rounded-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-4 [&_label]:text-base [&_label]:text-gray-700 [&_label]:font-medium [&_input]:text-base [&_input]:text-gray-900 [&_input]:bg-white [&_input]:border-gray-300 overflow-y-auto" style={{ maxHeight: '70vh' }}>
            {children}
          </div>
          {showSubmitButton && (
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
} 