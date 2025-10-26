import type { ReactNode } from 'react';
import { Dialog, DialogContent } from '@/client/components/ui/dialog';

export interface BaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
  children: ReactNode;
}

/**
 * Base dialog wrapper with automatic cleanup on close
 * Calls onClose callback when dialog is closed
 */
export function BaseDialog({
  open,
  onOpenChange,
  onClose,
  children,
}: BaseDialogProps) {
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);

    // Call onClose when dialog is being closed
    if (!newOpen && onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
}
