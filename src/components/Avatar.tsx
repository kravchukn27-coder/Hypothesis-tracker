import { getAvatarColorClasses, getInitials } from "@/lib/avatar";

export function Avatar({ name }: { name: string }) {
  return (
    <span
      className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${getAvatarColorClasses(name)}`}
    >
      {getInitials(name)}
    </span>
  );
}
