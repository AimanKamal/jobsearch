import { JSX } from "react"

interface MetricItemProps {
  title: string;
  value: number;
}

export function MetricItem(props: MetricItemProps): JSX.Element {
  const { title, value } = props;
  return (
    <div className="col-span-1 p-6 flex flex-col gap-2 justify-center rounded-3xl border border-zinc-300">
      <span className="text-3xl font-bold">{`${value}`}</span>
      <span className="font-semibold text-zinc-500">{title}</span>
    </div>
  )
}