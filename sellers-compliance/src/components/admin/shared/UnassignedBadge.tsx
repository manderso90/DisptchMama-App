export function UnassignedBadge({ count }: { count: number }) {
  if (count <= 0) return null

  return (
    <span className="ml-auto bg-[#FDE047] text-black border border-black text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
      {count > 99 ? '99+' : count}
    </span>
  )
}
