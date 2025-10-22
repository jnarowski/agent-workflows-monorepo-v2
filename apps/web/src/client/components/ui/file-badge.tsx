import { getFileTypeInfo } from '@/client/lib/fileUtils';

interface FileBadgeProps {
  extension: string;
}

export function FileBadge({ extension }: FileBadgeProps) {
  const { label, color } = getFileTypeInfo(extension);

  return (
    <span
      className="inline-flex items-center justify-center w-12 rounded text-xs font-medium"
      style={{
        backgroundColor: `${color}33`, // 20% opacity (33 in hex is ~20%)
        color: color,
      }}
    >
      {label}
    </span>
  );
}
